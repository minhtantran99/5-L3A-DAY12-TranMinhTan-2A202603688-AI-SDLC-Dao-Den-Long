import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { GameSimulation } from '../src/core/sim.js';

test('Phase 2: Dash moves at 14 m/s for 12 ticks and triggers cooldown', () => {
  const sim = new GameSimulation({
    seed: 1,
    night: 1,
    scenario: { random_motes: false, random_shades: false },
  });
  const ev = sim.step({ move: [0, 1], dash: true });
  assert.ok(ev.some((e) => e.name === 'dash'));
  for (let i = 0; i < 11; i++) sim.step({ move: [0, 1], dash: false });
  const snap = sim.getSnapshot();
  assert.ok(snap.player.pos[2] > 2.5);
  assert.ok(snap.player.dash_cd_s > 1.0);
});

test('Phase 2: Pause freezes sim_tick and time_left_s while tick increments', () => {
  const sim = new GameSimulation({ seed: 1, night: 1, scenario: { random_motes: false, random_shades: false } });
  sim.step({});
  const before = sim.getSnapshot();
  const evPause = sim.step({ pause: true });
  assert.ok(evPause.some((e) => e.name === 'paused'));
  sim.step({ pause: false });
  const during = sim.getSnapshot();
  assert.equal(during.state, 'paused');
  assert.equal(during.sim_tick, before.sim_tick);
  assert.equal(during.time_left_s, before.time_left_s);
  assert.equal(during.tick, before.tick + 2);
});

test('Phase 2: Night 2 Drifter steals motes and drops them on Pulse', () => {
  const sim = new GameSimulation({
    seed: 1,
    night: 2,
    scenario: {
      player: { pos: [0, 0, 0], carried: 6, flames: 3 },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      drifters: [{ id: 'D1', pos: [0.5, 0, 0], state: 'chase' }],
    },
  });
  const ev1 = sim.step({});
  assert.ok(ev1.some((e) => e.name === 'drifter_steal' && e.data.amount === 3));
  assert.equal(sim.player.carried, 3);
  const ev2 = sim.step({ pulse: true });
  assert.ok(ev2.some((e) => e.name === 'drifter_drop' && e.data.amount === 3));
});

test('Phase 2: Night 2 Charm removes dash cooldown', () => {
  const sim = new GameSimulation({
    seed: 1,
    night: 2,
    scenario: {
      player: { pos: [35, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      random_drifters: false,
    },
  });
  const ev = sim.step({});
  assert.ok(ev.some((e) => e.name === 'charm_picked' && e.data.charm_id === 'C1'));
  sim.step({ dash: true });
  assert.equal(sim.getSnapshot().player.dash_cd_s, 0);
});

test('Phase 2: Night 3 full 21,600-tick headless run completes under 30s', () => {
  const t0 = Date.now();
  execFileSync('node', [
    'src/cli/headless.js',
    '--seed', '1',
    '--night', '3',
    '--ticks', '21600',
    '--out', '/tmp/p2_n3_full.jsonl',
  ]);
  const elapsedMs = Date.now() - t0;
  assert.ok(elapsedMs < 30000, `Expected <30000ms, got ${elapsedMs}ms`);
});
