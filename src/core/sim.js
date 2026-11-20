import { createRng, round1, round3 } from './rng.js';
import { DT, TICK_RATE, TUNING } from './config.js';
import { MAPS, getSupportY, resolveObstacles } from './maps.js';

function distXZ(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function dist3D(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function cloneVec(v) {
  return [v[0], v[1], v[2]];
}

export class GameSimulation {
  constructor({ seed = 1, night = 1, scenario = null } = {}) {
    const map = MAPS[night];
    if (!map) {
      throw new Error(`Unsupported night: ${night}`);
    }
    this.map = map;
    this.seed = seed;
    this.night = night;
    this.rng = createRng(seed);
    this.tick = 0;
    this.simTick = 0;
    this.state = 'playing';
    this.endReason = null;
    this.score = 0;
    this.events = [];

    this.randomMotes = scenario?.random_motes !== false;
    this.randomShades = scenario?.random_shades !== false;
    this.randomDrifters = scenario?.random_drifters !== undefined
      ? Boolean(scenario.random_drifters)
      : map.driftersEnabled;
    this.windEnabled = scenario?.wind_enabled !== undefined
      ? Boolean(scenario.wind_enabled)
      : map.windEnabled;

    this.timeLeftTicks = Math.round((scenario?.time_left_s ?? map.durationS) * TICK_RATE);

    const p = scenario?.player || {};
    this.player = {
      pos: p.pos ? cloneVec(p.pos) : cloneVec(map.startPos),
      vel: [0, 0, 0],
      grounded: true,
      yawRad: 0,
      flames: p.flames ?? TUNING.flames,
      carried: p.carried ?? 0,
      successfulLights: p.successful_lights ?? 0,
      invulnTicks: p.invuln_ticks ?? 0,
      dashTicks: 0,
      dashDir: [0, 1],
      dashCdTicks: p.dash_cd_ticks ?? 0,
      pulseCdTicks: p.pulse_cd_ticks ?? 0,
      charmTicks: p.charm_ticks ?? 0,
      jumpPadAir: false,
      respawnWaitTicks: 0,
      fellThisDrop: false,
    };

    this.lanterns = map.lanterns.map((l) => ({
      id: l.id,
      pos: cloneVec(l.pos),
      lit: false,
      deposited: 0,
      fuel60: 0,
      everLit: false,
      relitCount: 0,
    }));
    if (Array.isArray(scenario?.lanterns)) {
      for (const patch of scenario.lanterns) {
        const target = this.lanterns.find((l) => l.id === patch.id);
        if (!target) continue;
        if (patch.pos) target.pos = cloneVec(patch.pos);
        if (typeof patch.deposited === 'number') target.deposited = patch.deposited;
        if (typeof patch.lit === 'boolean') target.lit = patch.lit;
        if (typeof patch.fuel === 'number') {
          target.fuel60 = Math.round(patch.fuel * TICK_RATE);
        } else if (target.lit) {
          target.fuel60 = TUNING.fuelMax60;
        }
        if (typeof patch.ever_lit === 'boolean') {
          target.everLit = patch.ever_lit;
        } else if (target.lit) {
          target.everLit = true;
        }
      }
    }

    this.nextMoteId = 1;
    this.motes = [];
    if (Array.isArray(scenario?.motes)) {
      for (const m of scenario.motes) {
        const pos = Array.isArray(m) ? cloneVec(m) : cloneVec(m.pos);
        this.motes.push({
          id: `M${this.nextMoteId++}`,
          pos,
          kind: m.kind || 'random',
          ttlTicks: m.ttl_s ? Math.round(m.ttl_s * TICK_RATE) : -1,
          spawnedAtTick: -1,
        });
      }
    } else if (this.randomMotes) {
      const spots = [...map.moteSpots];
      this._shuffle(spots);
      const count = Math.min(TUNING.moteInitialCount, spots.length);
      for (let i = 0; i < count; i++) {
        this.motes.push({
          id: `M${this.nextMoteId++}`,
          pos: cloneVec(spots[i]),
          kind: 'random',
          ttlTicks: -1,
          spawnedAtTick: -1,
        });
      }
    }

    this.nextShadeId = 1;
    this.shades = [];
    if (Array.isArray(scenario?.shades)) {
      for (const s of scenario.shades) {
        const id = s.id || `S${this.nextShadeId++}`;
        const mNum = /^S(\d+)$/.exec(id);
        if (mNum) this.nextShadeId = Math.max(this.nextShadeId, Number(mNum[1]) + 1);
        const st = s.state || 'chase';
        const left = s.state_ticks_left ?? 0;
        this.shades.push({
          id,
          pos: cloneVec(s.pos),
          state: st,
          targetLanternId: s.target_lantern_id || null,
          drainTicks: 0,
          stunTicks: st === 'stunned' ? left : 0,
          recoilTicks: st === 'recoil' ? left : 0,
          recoilDir: [1, 0],
          pushTicks: 0,
          pushDir: [1, 0],
          safePushTicks: 0,
          safePushTarget: null,
          spawnTicks: st === 'spawning' ? left : 0,
          spawnedAtTick: -1,
        });
      }
    }

    this.nextDrifterId = 1;
    this.drifters = [];
    if (Array.isArray(scenario?.drifters)) {
      for (const d of scenario.drifters) {
        const id = d.id || `D${this.nextDrifterId++}`;
        const mNum = /^D(\d+)$/.exec(id);
        if (mNum) this.nextDrifterId = Math.max(this.nextDrifterId, Number(mNum[1]) + 1);
        this.drifters.push({
          id,
          pos: cloneVec(d.pos),
          state: d.state || 'idle',
          stolen: d.stolen ?? 0,
          hasStolen: (d.stolen ?? 0) > 0,
          fleeTicks: d.state === 'flee' ? TUNING.drifterFleeTicks : 0,
          idleAngle: this.rng() * Math.PI * 2,
          spawnedAtTick: -1,
        });
      }
    }

    this.charms = (Array.isArray(scenario?.charms) ? scenario.charms : map.charms).map((c) => ({
      id: c.id,
      pos: cloneVec(c.pos),
      available: c.available !== false,
      respawnTicks: c.respawn_s ? Math.round(c.respawn_s * TICK_RATE) : 0,
    }));

    this.wind = { active: false, warning: false, dirDeg: 0, timerTicks: 0 };

    this.prevInput = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      dash: false,
      interact: false,
      pulse: false,
      pause: false,
    };
  }

  getPlayerCapacity() {
    return Math.min(TUNING.capacityMax, TUNING.carryCapacity + 2 * this.player.successfulLights);
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  _emit(name, data) {
    this.events.push({ type: 'event', tick: this.tick, name, data });
  }

  _pushShadesOut(lantern) {
    for (const s of this.shades) {
      const d = distXZ(s.pos, lantern.pos);
      if (d < TUNING.safeRadius) {
        const dx = d < 1e-6 ? 1 : (s.pos[0] - lantern.pos[0]) / d;
        const dz = d < 1e-6 ? 0 : (s.pos[2] - lantern.pos[2]) / d;
        s.safePushTicks = TUNING.safePushMaxTicks;
        s.safePushTarget = [
          lantern.pos[0] + dx * TUNING.safeRadius,
          lantern.pos[2] + dz * TUNING.safeRadius,
        ];
      }
    }
  }

  step(input = {}) {
    if (this.state === 'won' || this.state === 'lost') return [];

    this.tick += 1;
    this.events = [];

    // 1. Read input (process pause first)
    const move = input.move ?? this.prevInput.move;
    const camYawDeg = input.cam_yaw_deg ?? this.prevInput.cam_yaw_deg;
    const jump = Boolean(input.jump ?? this.prevInput.jump);
    const dash = Boolean(input.dash ?? this.prevInput.dash);
    const interact = Boolean(input.interact ?? this.prevInput.interact);
    const pulse = Boolean(input.pulse ?? this.prevInput.pulse);
    const pause = Boolean(input.pause ?? this.prevInput.pause);

    const jumpPressed = jump && !this.prevInput.jump;
    const dashPressed = dash && !this.prevInput.dash;
    const interactPressed = interact && !this.prevInput.interact;
    const pulsePressed = pulse && !this.prevInput.pulse;
    const pausePressed = pause && !this.prevInput.pause;

    this.prevInput = {
      move: [move[0], move[1]],
      cam_yaw_deg: camYawDeg,
      jump,
      dash,
      interact,
      pulse,
      pause,
    };

    if (pausePressed) {
      if (this.state === 'playing') {
        this.state = 'paused';
        this._emit('paused', {});
        return this.events;
      } else if (this.state === 'paused') {
        this.state = 'playing';
        this._emit('resumed', {});
      }
    }

    if (this.state === 'paused') {
      return this.events;
    }

    this.simTick += 1;

    // 2. Decrement timers + lantern fuel decay & shade drain
    this.timeLeftTicks = Math.max(0, this.timeLeftTicks - 1);
    if (this.player.invulnTicks > 0) this.player.invulnTicks -= 1;
    if (this.player.dashCdTicks > 0) this.player.dashCdTicks -= 1;
    if (this.player.pulseCdTicks > 0) this.player.pulseCdTicks -= 1;
    if (this.player.charmTicks > 0) this.player.charmTicks -= 1;

    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      if (m.ttlTicks > 0) {
        m.ttlTicks -= 1;
        if (m.ttlTicks === 0) this.motes.splice(i, 1);
      }
    }

    for (const c of this.charms) {
      if (!c.available && c.respawnTicks > 0) {
        c.respawnTicks -= 1;
        if (c.respawnTicks === 0) c.available = true;
      }
    }

    for (const s of this.shades) {
      if (s.state === 'spawning' && s.spawnTicks > 0) {
        s.spawnTicks -= 1;
        if (s.spawnTicks === 0) s.state = 'wander';
      }
      if (s.stunTicks > 0) {
        s.stunTicks -= 1;
        if (s.stunTicks === 0 && s.state === 'stunned') s.state = 'wander';
      }
      if (s.recoilTicks > 0) {
        s.recoilTicks -= 1;
        if (s.recoilTicks === 0 && s.state === 'recoil') s.state = 'chase';
      }
    }

    // Lantern natural decay + shade drain
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      l.fuel60 -= TUNING.fuelDecayPerTick60;
    }

    for (const s of this.shades) {
      if (s.state !== 'drain') continue;
      const target = this.lanterns.find((l) => l.id === s.targetLanternId);
      if (target && target.lit) {
        target.fuel60 = Math.max(0, target.fuel60 - TUNING.fuelDrainPerTick60);
        s.drainTicks += 1;
        if (s.drainTicks % TICK_RATE === 0) {
          this._emit('fuel_drain', {
            lantern_id: target.id,
            shade_id: s.id,
            fuel: round1(target.fuel60 / TICK_RATE),
          });
        }
      }
    }

    for (const l of this.lanterns) {
      if (l.lit && l.fuel60 <= 0) {
        l.lit = false;
        l.fuel60 = 0;
        l.deposited = 0;
        l.everLit = true;
        this._emit('lantern_out', { lantern_id: l.id });
      }
    }

    // Wind schedule (Night 3)
    if (this.windEnabled) {
      const cycle = this.simTick % TUNING.windIntervalTicks;
      if (cycle === TUNING.windIntervalTicks - TUNING.windWarningTicks) {
        this.wind.warning = true;
        this.wind.dirDeg = Math.floor(this.rng() * 360);
      } else if (this.simTick > 0 && cycle === 0) {
        this.wind.warning = false;
        this.wind.active = true;
        this.wind.timerTicks = TUNING.windDurationTicks;
      }
      if (this.wind.active) {
        this.wind.timerTicks -= 1;
        if (this.wind.timerTicks <= 0) this.wind.active = false;
      }
    }

    // 3. Move Mây
    if (this.player.respawnWaitTicks > 0) {
      this.player.respawnWaitTicks -= 1;
      if (this.player.respawnWaitTicks === 0) {
        this.player.pos = cloneVec(this.map.startPos);
        this.player.vel = [0, 0, 0];
        this.player.grounded = true;
        this.player.invulnTicks = TUNING.invulnTicks;
        this.player.fellThisDrop = false;
        this.player.jumpPadAir = false;
        this.player.dashTicks = 0;
      }
    } else {
      let mx = move[0] || 0;
      let mz = move[1] || 0;
      const mag = Math.hypot(mx, mz);
      if (mag > 1) {
        mx /= mag;
        mz /= mag;
      }
      const theta = (camYawDeg * Math.PI) / 180;
      const wx = mx * Math.cos(theta) + mz * Math.sin(theta);
      const wz = -mx * Math.sin(theta) + mz * Math.cos(theta);
      const hasMove = Math.hypot(wx, wz) > 0.001;

      if (hasMove && this.player.dashTicks === 0 && !this.player.jumpPadAir) {
        this.player.yawRad = Math.atan2(wx, wz);
      }

      const canDash =
        dashPressed &&
        this.player.dashTicks === 0 &&
        (this.player.charmTicks > 0 || this.player.dashCdTicks === 0);
      if (canDash) {
        this.player.dashTicks = TUNING.dashDurationTicks;
        if (this.player.charmTicks === 0) {
          this.player.dashCdTicks = TUNING.dashCooldownTicks;
        }
        if (hasMove) {
          const wmag = Math.hypot(wx, wz);
          this.player.dashDir = [wx / wmag, wz / wmag];
        } else {
          this.player.dashDir = [Math.sin(this.player.yawRad), Math.cos(this.player.yawRad)];
        }
        this._emit('dash', {});
      }

      if (this.player.dashTicks > 0) {
        this.player.vel[0] = this.player.dashDir[0] * TUNING.dashSpeed;
        this.player.vel[2] = this.player.dashDir[1] * TUNING.dashSpeed;
        this.player.vel[1] = 0;
        this.player.dashTicks -= 1;
      } else if (!this.player.jumpPadAir) {
        const speed = this.player.charmTicks > 0 ? TUNING.charmSpeed : TUNING.playerSpeed;
        this.player.vel[0] = wx * speed;
        this.player.vel[2] = wz * speed;
      }

      if (jumpPressed && this.player.grounded && this.player.dashTicks === 0) {
        this.player.vel[1] = TUNING.jumpVelocity;
        this.player.grounded = false;
      }

      if (this.player.dashTicks === 0) {
        this.player.vel[1] += TUNING.gravity * DT;
      }

      let windVx = 0;
      let windVz = 0;
      if (this.wind.active) {
        const wr = (this.wind.dirDeg * Math.PI) / 180;
        windVx = Math.cos(wr) * TUNING.windPushSpeed;
        windVz = Math.sin(wr) * TUNING.windPushSpeed;
      }

      const prevX = this.player.pos[0];
      const prevZ = this.player.pos[2];
      const nextX = prevX + (this.player.vel[0] + windVx) * DT;
      const nextZ = prevZ + (this.player.vel[2] + windVz) * DT;
      const [rx, rz] = resolveObstacles(this.night, prevX, prevZ, nextX, nextZ, this.player.pos[1]);

      this.player.pos[0] = rx;
      this.player.pos[2] = rz;
      this.player.pos[1] += this.player.vel[1] * DT;

      const supportY = getSupportY(this.night, this.player.pos[0], this.player.pos[2], this.player.pos[1]);
      if (supportY !== null && this.player.pos[1] <= supportY && this.player.vel[1] <= 0 && !this.player.fellThisDrop) {
        this.player.pos[1] = supportY;
        this.player.vel[1] = 0;
        this.player.grounded = true;
        this.player.jumpPadAir = false;
      } else {
        this.player.grounded = false;
      }

      for (const pad of this.map.jumpPads) {
        if (
          distXZ(this.player.pos, pad.pos) <= pad.radius &&
          Math.abs(this.player.pos[1] - pad.pos[1]) <= 1.0
        ) {
          let dx, dz;
          if (pad.dir) {
            dx = pad.dir[0];
            dz = pad.dir[1];
          } else {
            dx = pad.target[0] - this.player.pos[0];
            dz = pad.target[2] - this.player.pos[2];
            const d = Math.hypot(dx, dz) || 1;
            dx /= d;
            dz /= d;
          }
          this.player.vel[0] = dx * pad.vh;
          this.player.vel[2] = dz * pad.vh;
          this.player.vel[1] = pad.vy;
          this.player.grounded = false;
          this.player.jumpPadAir = true;
          this.player.dashTicks = 0;
          break;
        }
      }

      if (this.player.pos[1] < TUNING.fallY && !this.player.fellThisDrop) {
        this.player.fellThisDrop = true;
        const lost = this.player.carried;
        this.player.flames = Math.max(0, this.player.flames - 1);
        this.player.carried = 0;
        this.player.respawnWaitTicks = this.player.flames > 0 ? TUNING.respawnWaitTicks : 0;
        this._emit('player_hit', {
          by: 'fall',
          flames: this.player.flames,
          dropped: 0,
          lost,
        });
      }
    }

    // 4. Pickup motes & charms
    const capacity = this.getPlayerCapacity();
    if (this.player.respawnWaitTicks === 0) {
      for (let i = 0; i < this.motes.length; i++) {
        if (this.player.carried >= capacity) break;
        const m = this.motes[i];
        if (m.spawnedAtTick === this.simTick) continue;
        if (
          distXZ(this.player.pos, m.pos) <= TUNING.pickupRadius &&
          Math.abs(this.player.pos[1] - m.pos[1]) <= 1.5
        ) {
          this.motes.splice(i, 1);
          i -= 1;
          this.player.carried += 1;
          this._emit('mote_picked', { carried: this.player.carried });
        }
      }

      for (const c of this.charms) {
        if (!c.available) continue;
        if (
          distXZ(this.player.pos, c.pos) <= TUNING.pickupRadius &&
          Math.abs(this.player.pos[1] - c.pos[1]) <= 1.5
        ) {
          c.available = false;
          c.respawnTicks = TUNING.charmRespawnTicks;
          this.player.charmTicks = TUNING.charmDurationTicks;
          this._emit('charm_picked', { charm_id: c.id, charm_ticks: TUNING.charmDurationTicks });
        }
      }
    }

    // 5. Interact with lanterns (unlit OR lit with fuel < 100)
    if (interactPressed && this.player.carried > 0 && this.player.respawnWaitTicks === 0) {
      let best = null;
      let bestDist = Infinity;
      for (const l of this.lanterns) {
        if (l.lit && l.fuel60 >= TUNING.fuelMax60) continue;
        const d = distXZ(this.player.pos, l.pos);
        if (d <= TUNING.interactRadius) {
          if (d < bestDist - 1e-9 || (Math.abs(d - bestDist) <= 1e-9 && l.id < best.id)) {
            best = l;
            bestDist = d;
          }
        }
      }
      if (best) {
        if (!best.lit) {
          const cost = best.everLit ? TUNING.relightCost : TUNING.lanternCost;
          const needed = cost - best.deposited;
          const amount = Math.min(this.player.carried, needed);
          if (amount > 0) {
            this.player.carried -= amount;
            best.deposited += amount;
            this.score += amount * TUNING.score.perMote;
            this._emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
            if (best.deposited >= cost) {
              best.lit = true;
              best.fuel60 = TUNING.fuelMax60;
              this.player.successfulLights += 1;
              const isRelight = best.everLit;
              if (isRelight) {
                best.relitCount += 1;
                this.score += TUNING.score.perRelight;
              } else {
                best.everLit = true;
                this.score += TUNING.score.perLantern;
              }
              this._emit('lantern_lit', { lantern_id: best.id, relight: isRelight });
              this._pushShadesOut(best);
            }
          }
        } else {
          const fuel = best.fuel60 / TICK_RATE;
          const used = Math.min(
            this.player.carried,
            Math.ceil((TUNING.fuelMax - fuel) / TUNING.fuelPerMote)
          );
          if (used > 0) {
            const wasLow = best.fuel60 < TUNING.lowFuelThreshold60;
            this.player.carried -= used;
            best.fuel60 = Math.min(TUNING.fuelMax60, best.fuel60 + TUNING.fuelPerMote60 * used);
            this.score += used * TUNING.score.perMote;
            this._emit('refuel', {
              lantern_id: best.id,
              amount: used,
              fuel: round1(best.fuel60 / TICK_RATE),
            });
            if (wasLow && best.fuel60 >= TUNING.lowFuelThreshold60) {
              this._pushShadesOut(best);
            }
          }
        }
      }
    }

    // 6. Update safe zones
    for (const s of this.shades) {
      if (s.safePushTicks > 0 && s.safePushTarget) {
        s.pos[0] += (s.safePushTarget[0] - s.pos[0]) / s.safePushTicks;
        s.pos[2] += (s.safePushTarget[1] - s.pos[2]) / s.safePushTicks;
        s.safePushTicks -= 1;
        if (s.safePushTicks === 0) s.safePushTarget = null;
      }
    }

    // 7. Pulse (Tỏa Sáng)
    if (
      pulsePressed &&
      this.player.pulseCdTicks === 0 &&
      this.player.carried >= TUNING.pulseCost &&
      this.player.respawnWaitTicks === 0
    ) {
      this.player.carried -= TUNING.pulseCost;
      this.player.pulseCdTicks = TUNING.pulseCooldownTicks;
      const pulseCenter = [this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]];
      const stunnedIds = [];
      for (const s of this.shades) {
        if (s.spawnedAtTick === this.simTick) continue;
        if (dist3D(pulseCenter, s.pos) <= TUNING.pulseRadius) {
          const wasDrain = s.state === 'drain';
          let dx = s.pos[0] - this.player.pos[0];
          let dz = s.pos[2] - this.player.pos[2];
          const d = Math.hypot(dx, dz);
          if (d < 1e-6) {
            dx = 1;
            dz = 0;
          } else {
            dx /= d;
            dz /= d;
          }
          s.state = 'stunned';
          s.stunTicks = TUNING.pulseStunTicks;
          s.pushTicks = TUNING.pulsePushTicks;
          s.pushDir = [dx, dz];
          s.drainTicks = 0;
          stunnedIds.push(s.id);
          this.score += wasDrain ? TUNING.score.perDrainStun : TUNING.score.perStun;
        }
      }

      for (const dr of this.drifters) {
        if (dr.state === 'removed' || dr.spawnedAtTick === this.simTick) continue;
        if (dist3D(pulseCenter, dr.pos) <= TUNING.pulseRadius) {
          if (dr.state === 'chase') {
            dr.state = 'flee';
            dr.fleeTicks = TUNING.drifterFleeTicks;
          } else if (dr.state === 'flee' && dr.stolen > 0) {
            const amt = dr.stolen;
            for (let i = 0; i < amt; i++) {
              this.motes.push({
                id: `M${this.nextMoteId++}`,
                pos: [round3(dr.pos[0]), round3(dr.pos[1]), round3(dr.pos[2])],
                kind: 'dropped',
                ttlTicks: TUNING.droppedMoteTtlTicks,
                spawnedAtTick: this.simTick,
              });
            }
            dr.stolen = 0;
            dr.fleeTicks = TUNING.drifterDropFleeTicks;
            this._emit('drifter_drop', { drifter_id: dr.id, amount: amt });
          }
        }
      }

      this._emit('pulse', { stunned_ids: stunnedIds });
    }

    // 8. Move Shades and Drifters
    for (const s of this.shades) {
      if (s.spawnedAtTick === this.simTick || s.state === 'spawning') continue;
      if (s.pushTicks > 0) {
        const stepM = TUNING.pulsePushM / TUNING.pulsePushTicks;
        const [nx, nz] = resolveObstacles(
          this.night,
          s.pos[0],
          s.pos[2],
          s.pos[0] + s.pushDir[0] * stepM,
          s.pos[2] + s.pushDir[1] * stepM,
          s.pos[1]
        );
        s.pos[0] = nx;
        s.pos[2] = nz;
        s.pushTicks -= 1;
      } else if (s.recoilTicks > 0) {
        const stepM = TUNING.shadeRecoilM / TUNING.shadeRecoilTicks;
        s.pos[0] += s.recoilDir[0] * stepM;
        s.pos[2] += s.recoilDir[1] * stepM;
      } else if (s.state === 'drain') {
        const dPlayer = distXZ(s.pos, this.player.pos);
        const target = this.lanterns.find((l) => l.id === s.targetLanternId);
        if (dPlayer <= TUNING.shadeDrainDetectRadius) {
          s.state = 'chase';
          s.drainTicks = 0;
        } else if (
          !target ||
          !target.lit ||
          target.fuel60 >= TUNING.lowFuelThreshold60 ||
          distXZ(s.pos, target.pos) > TUNING.shadeDrainRadius
        ) {
          s.state = 'wander';
          s.drainTicks = 0;
        }
      } else if (s.state !== 'stunned' && s.safePushTicks === 0) {
        const dPlayer = distXZ(s.pos, this.player.pos);
        if (s.state === 'wander' && dPlayer <= TUNING.shadeDetectRadius) {
          s.state = 'chase';
        } else if (s.state === 'chase' && dPlayer > TUNING.shadeLoseRadius) {
          s.state = 'wander';
        }

        let tx = s.pos[0];
        let tz = s.pos[2];
        if (s.state === 'chase') {
          tx = this.player.pos[0];
          tz = this.player.pos[2];
        } else {
          // Wander: look for nearest weak lit lantern (fuel < 30)
          let weakTarget = null;
          let weakDist = Infinity;
          for (const l of this.lanterns) {
            if (!l.lit || l.fuel60 >= TUNING.lowFuelThreshold60) continue;
            const d = distXZ(s.pos, l.pos);
            if (d < weakDist - 1e-9 || (Math.abs(d - weakDist) <= 1e-9 && l.id < weakTarget.id)) {
              weakTarget = l;
              weakDist = d;
            }
          }
          if (weakTarget) {
            s.targetLanternId = weakTarget.id;
            if (weakDist <= TUNING.shadeDrainRadius) {
              s.state = 'drain';
              s.drainTicks = 0;
              continue;
            }
            tx = weakTarget.pos[0];
            tz = weakTarget.pos[2];
          } else {
            let unlitTarget = null;
            let unlitDist = Infinity;
            for (const l of this.lanterns) {
              if (l.lit) continue;
              const d = distXZ(s.pos, l.pos);
              if (d < unlitDist - 1e-9 || (Math.abs(d - unlitDist) <= 1e-9 && l.id < unlitTarget.id)) {
                unlitTarget = l;
                unlitDist = d;
              }
            }
            if (unlitTarget) {
              tx = unlitTarget.pos[0];
              tz = unlitTarget.pos[2];
            }
          }
        }
        const dx = tx - s.pos[0];
        const dz = tz - s.pos[2];
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          const step = Math.min(d, this.map.shadeSpeed * DT);
          s.pos[0] += (dx / d) * step;
          s.pos[2] += (dz / d) * step;
        }
      }

      // Safe zone clamp only for lit lanterns with fuel >= 30
      if (s.safePushTicks === 0) {
        for (const l of this.lanterns) {
          if (!l.lit || l.fuel60 < TUNING.lowFuelThreshold60) continue;
          const dx = s.pos[0] - l.pos[0];
          const dz = s.pos[2] - l.pos[2];
          const d = Math.hypot(dx, dz);
          if (d < TUNING.safeRadius) {
            if (d < 1e-6) {
              s.pos[0] = l.pos[0] + TUNING.safeRadius;
            } else {
              s.pos[0] = l.pos[0] + (dx / d) * TUNING.safeRadius;
              s.pos[2] = l.pos[2] + (dz / d) * TUNING.safeRadius;
            }
          }
        }
      }
    }

    for (const dr of this.drifters) {
      if (dr.state === 'removed' || dr.spawnedAtTick === this.simTick) continue;
      if (dr.state === 'flee') {
        dr.fleeTicks -= 1;
        if (dr.fleeTicks <= 0) {
          dr.state = 'removed';
          continue;
        }
        let dx = dr.pos[0] - this.player.pos[0];
        let dz = dr.pos[2] - this.player.pos[2];
        const d = Math.hypot(dx, dz) || 1;
        dr.pos[0] += (dx / d) * TUNING.drifterSpeed * DT;
        dr.pos[2] += (dz / d) * TUNING.drifterSpeed * DT;
      } else {
        const dPlayer = distXZ(dr.pos, this.player.pos);
        if (!dr.hasStolen && this.player.carried >= 5 && dPlayer <= TUNING.drifterDetectRadius) {
          dr.state = 'chase';
        } else if (dr.state === 'chase') {
          dr.state = 'idle';
        }
        if (dr.state === 'chase') {
          const dx = this.player.pos[0] - dr.pos[0];
          const dz = this.player.pos[2] - dr.pos[2];
          const d = Math.hypot(dx, dz) || 1;
          dr.pos[0] += (dx / d) * TUNING.drifterSpeed * DT;
          dr.pos[2] += (dz / d) * TUNING.drifterSpeed * DT;
        } else {
          dr.idleAngle += 0.02;
          dr.pos[0] += Math.cos(dr.idleAngle) * TUNING.drifterIdleSpeed * DT;
          dr.pos[2] += Math.sin(dr.idleAngle) * TUNING.drifterIdleSpeed * DT;
        }
      }
    }

    // 9. Collisions
    if (this.player.respawnWaitTicks === 0) {
      const sortedDrifters = [...this.drifters].sort((a, b) => a.id.localeCompare(b.id));
      for (const dr of sortedDrifters) {
        if (dr.state === 'removed' || dr.state === 'flee' || dr.hasStolen || dr.spawnedAtTick === this.simTick) continue;
        if (distXZ(this.player.pos, dr.pos) <= TUNING.drifterStealRadius) {
          const amt = Math.min(3, this.player.carried);
          this.player.carried -= amt;
          dr.stolen = amt;
          dr.hasStolen = true;
          dr.state = 'flee';
          dr.fleeTicks = TUNING.drifterFleeTicks;
          this._emit('drifter_steal', {
            drifter_id: dr.id,
            amount: amt,
            carried: this.player.carried,
          });
        }
      }

      if (this.player.invulnTicks === 0) {
        const sortedShades = [...this.shades].sort((a, b) => a.id.localeCompare(b.id));
        for (const s of sortedShades) {
          if (
            s.spawnedAtTick === this.simTick ||
            s.state === 'spawning' ||
            s.state === 'stunned' ||
            s.state === 'recoil' ||
            s.safePushTicks > 0
          ) {
            continue;
          }
          if (
            distXZ(this.player.pos, s.pos) <= TUNING.shadeHitRadius &&
            Math.abs(this.player.pos[1] - s.pos[1]) <= 1.5
          ) {
            this.player.flames = Math.max(0, this.player.flames - 1);
            this.player.invulnTicks = TUNING.invulnTicks;
            const dropped = Math.floor(this.player.carried * TUNING.hitDropRatio);
            this.player.carried -= dropped;

            for (let i = 0; i < dropped; i++) {
              const angle = this.rng() * Math.PI * 2;
              const r = 1.5 + this.rng() * 1.0;
              this.motes.push({
                id: `M${this.nextMoteId++}`,
                pos: [
                  round3(this.player.pos[0] + Math.cos(angle) * r),
                  round3(this.player.pos[1]),
                  round3(this.player.pos[2] + Math.sin(angle) * r),
                ],
                kind: 'dropped',
                ttlTicks: TUNING.droppedMoteTtlTicks,
                spawnedAtTick: this.simTick,
              });
            }

            let rx = s.pos[0] - this.player.pos[0];
            let rz = s.pos[2] - this.player.pos[2];
            const rd = Math.hypot(rx, rz);
            rx = rd < 1e-6 ? 1 : rx / rd;
            rz = rd < 1e-6 ? 0 : rz / rd;
            s.state = 'recoil';
            s.recoilTicks = TUNING.shadeRecoilTicks;
            s.recoilDir = [rx, rz];

            this._emit('player_hit', {
              by: 'shade',
              flames: this.player.flames,
              dropped,
            });
            break;
          }
        }
      }
    }

    // 10. Scheduled spawns
    if (
      this.randomMotes &&
      this.simTick > 0 &&
      this.simTick % TUNING.moteSpawnIntervalTicks === 0 &&
      this.motes.length < TUNING.moteMaxCount
    ) {
      const freeSpots = this.map.moteSpots.filter(
        (spot) => !this.motes.some((m) => distXZ(m.pos, spot) < 0.5)
      );
      if (freeSpots.length > 0) {
        const chosen = freeSpots[Math.floor(this.rng() * freeSpots.length)];
        this.motes.push({
          id: `M${this.nextMoteId++}`,
          pos: cloneVec(chosen),
          kind: 'random',
          ttlTicks: -1,
          spawnedAtTick: this.simTick,
        });
      }
    }

    if (
      this.randomShades &&
      this.shades.length < this.map.shadeMax &&
      this.simTick >= TUNING.shadeFirstSpawnTick
    ) {
      const offset = this.simTick - TUNING.shadeFirstSpawnTick;
      if (offset === 0) {
        this._spawnShades(2);
      } else if (offset % this.map.shadeIntervalTicks === 0) {
        this._spawnShades(1);
      }
    }

    if (
      this.randomDrifters &&
      this.simTick > 0 &&
      this.simTick % TUNING.drifterSpawnIntervalTicks === 0 &&
      this.drifters.filter((d) => d.state !== 'removed').length < TUNING.drifterMaxCount
    ) {
      const spots = this.map.moteSpots;
      const pt = spots[Math.floor(this.rng() * spots.length)];
      this.drifters.push({
        id: `D${this.nextDrifterId++}`,
        pos: cloneVec(pt),
        state: 'idle',
        stolen: 0,
        hasStolen: false,
        fleeTicks: 0,
        idleAngle: this.rng() * Math.PI * 2,
        spawnedAtTick: this.simTick,
      });
    }

    // 11. Win / Loss check (new dawn_survived rule)
    if (this.player.flames <= 0) {
      this.state = 'lost';
      this.endReason = 'no_flames';
      this._emit('game_over', { result: 'lost', reason: 'no_flames' });
    } else if (this.timeLeftTicks <= 0) {
      const litLanterns = this.lanterns.filter((l) => l.lit);
      const needed = Math.ceil(TUNING.winRatio * this.lanterns.length);
      if (litLanterns.length >= needed) {
        this.state = 'won';
        this.endReason = 'dawn_survived';
        for (const l of litLanterns) {
          this.score += 50 + Math.floor(l.fuel60 / TICK_RATE);
        }
        this.score += this.player.flames * TUNING.score.perFlameLeft;
        this._emit('game_over', { result: 'won', reason: 'dawn_survived' });
      } else {
        this.state = 'lost';
        this.endReason = 'dawn';
        this._emit('game_over', { result: 'lost', reason: 'dawn' });
      }
    }

    return this.events;
  }

  _spawnShades(count) {
    for (let i = 0; i < count; i++) {
      if (this.shades.length >= this.map.shadeMax) break;
      const valid = this.map.shadeSpots.filter((pt) => distXZ(pt, this.player.pos) >= 15.0);
      if (valid.length === 0) return;
      const pt = valid[Math.floor(this.rng() * valid.length)];
      const id = `S${this.nextShadeId++}`;
      this.shades.push({
        id,
        pos: cloneVec(pt),
        state: 'wander',
        targetLanternId: null,
        drainTicks: 0,
        stunTicks: 0,
        recoilTicks: 0,
        recoilDir: [1, 0],
        pushTicks: 0,
        pushDir: [1, 0],
        safePushTicks: 0,
        safePushTarget: null,
        spawnTicks: 0,
        spawnedAtTick: this.simTick,
      });
      this._emit('shade_spawned', { id });
    }
  }

  getSnapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.simTick,
      night: this.night,
      state: this.state,
      time_left_s: round3(this.timeLeftTicks / TICK_RATE),
      score: this.score,
      wind: {
        active: this.wind.active,
        dir_deg: this.wind.dirDeg,
      },
      player: {
        pos: [round3(this.player.pos[0]), round3(this.player.pos[1]), round3(this.player.pos[2])],
        vel: [round3(this.player.vel[0]), round3(this.player.vel[1]), round3(this.player.vel[2])],
        grounded: this.player.grounded,
        flames: this.player.flames,
        carried: this.player.carried,
        capacity: this.getPlayerCapacity(),
        invuln: this.player.invulnTicks > 0,
        dash_cd_s: round3(this.player.dashCdTicks / TICK_RATE),
        pulse_cd_s: round3(this.player.pulseCdTicks / TICK_RATE),
        charm_s: round3(this.player.charmTicks / TICK_RATE),
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: [round3(l.pos[0]), round3(l.pos[1]), round3(l.pos[2])],
        lit: l.lit,
        deposited: l.deposited,
        fuel: l.lit ? round1(l.fuel60 / TICK_RATE) : 0,
        ever_lit: l.everLit,
        relit_count: l.relitCount,
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: [round3(s.pos[0]), round3(s.pos[1]), round3(s.pos[2])],
        state: s.state,
      })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({
        id: m.id,
        pos: [round3(m.pos[0]), round3(m.pos[1]), round3(m.pos[2])],
        kind: m.kind,
        ttl_s: m.ttlTicks < 0 ? null : round3(m.ttlTicks / TICK_RATE),
      })),
      drifters: this.drifters.map((d) => ({
        id: d.id,
        pos: [round3(d.pos[0]), round3(d.pos[1]), round3(d.pos[2])],
        state: d.state,
        stolen: d.stolen,
      })),
      charms: this.charms.map((c) => ({
        id: c.id,
        available: c.available,
        respawn_s: round3(c.respawnTicks / TICK_RATE),
      })),
    };
  }
}
