import { GameSimulation } from './core/sim.js';
import { DT, TUNING } from './core/config.js';
import { MAPS } from './core/maps.js';
import { createRng } from './core/rng.js';
import { validatePlayerName } from './core/validate.js';
import { GameView } from './render/GameView.js';
import { AudioManager } from './render/AudioManager.js';

const app = document.getElementById('app');
const view = new GameView(app);
const audio = new AudioManager();

const params = new URLSearchParams(window.location.search);
const isBench = params.get('bench') === '1';

if (isBench) {
  runBenchmarkMode(Number(params.get('seed') || 42), Number(params.get('duration') || 30));
} else {
  runInteractiveGame();
}

function runBenchmarkMode(seed, durationS) {
  const procStart = performance.now();
  const rng = createRng(seed);
  const shades = [];
  for (let i = 0; i < 200; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 38;
    shades.push({ id: `S${i + 1}`, pos: [Math.cos(a) * r, 0, Math.sin(a) * r], state: 'wander' });
  }
  const motes = [];
  for (let i = 0; i < 100; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 36;
    motes.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
  }
  const sim = new GameSimulation({
    seed,
    night: 1,
    scenario: {
      random_motes: false,
      random_shades: false,
      lanterns: [
        { id: 'L1', lit: true, fuel: 100 },
        { id: 'L2', lit: true, fuel: 100 },
        { id: 'L3', lit: true, fuel: 100 },
      ],
      shades,
      motes,
    },
  });

  document.getElementById('overlay').classList.add('hidden');
  let firstFrameAt = null;
  let benchStart = null;
  let lastFrame = performance.now();
  const dts = [];

  function benchFrame() {
    const now = performance.now();
    if (firstFrameAt === null) {
      firstFrameAt = now;
      benchStart = now;
    }
    const elapsedS = (now - benchStart) / 1000;
    const dt = now - lastFrame;
    lastFrame = now;

    if (elapsedS >= 3) {
      dts.push(dt);
    }

    for (const s of sim.shades) {
      const a = rng() * 0.2 - 0.1;
      s.pos[0] = Math.max(-38, Math.min(38, s.pos[0] + Math.cos(a) * 4.0 * DT));
      s.pos[2] = Math.max(-38, Math.min(38, s.pos[2] + Math.sin(a) * 4.0 * DT));
    }

    const angle = (elapsedS / 15) * Math.PI * 2;
    const camOverride = {
      pos: [Math.cos(angle) * 30, 15, Math.sin(angle) * 30],
      lookAt: [0, 0, 0],
    };
    view.sync(sim, 0, now / 1000, camOverride);

    if (elapsedS >= 3 + durationS) {
      const n = dts.length || 1;
      const sumDt = dts.reduce((a, b) => a + b, 0) || 1;
      const avgFps = (1000 * n) / sumDt;
      const sorted = [...dts].sort((a, b) => b - a);
      const k = Math.max(1, Math.ceil(0.01 * n));
      const topKAvg = sorted.slice(0, k).reduce((a, b) => a + b, 0) / k;
      const p1LowFps = 1000 / (topKAvg || 1);
      const asc = [...dts].sort((a, b) => a - b);
      const p95 = asc[Math.min(asc.length - 1, Math.floor(0.95 * asc.length))] || 0;

      const payload = {
        avg_fps: Math.round(avgFps * 10) / 10,
        p1_low_fps: Math.round(p1LowFps * 10) / 10,
        frame_ms_p95: Math.round(p95 * 10) / 10,
        frames: n,
        load_ms: Math.max(1, Math.round(firstFrameAt)),
      };
      fetch('/api/bench-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
      return;
    }
    requestAnimationFrame(benchFrame);
  }
  requestAnimationFrame(benchFrame);
}

function runInteractiveGame() {
  const hudFlames = document.getElementById('hud-flames');
  const hudTimer = document.getElementById('hud-timer');
  const hudScore = document.getElementById('hud-score');
  const hudCarriedText = document.getElementById('hud-carried-text');
  const hudMotes = document.getElementById('hud-motes');
  const hudSkills = document.getElementById('hud-skills');
  const hudPrompt = document.getElementById('hud-prompt');
  const subtitleBar = document.getElementById('subtitle-bar');
  const lanternArrow = document.getElementById('lantern-arrow');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayDesc = document.getElementById('overlay-desc');
  const overlayActions = document.getElementById('overlay-actions');
  const settingsPanel = document.getElementById('settings-panel');
  const lbBox = document.getElementById('lb-box');
  const optVol = document.getElementById('opt-vol');
  const optSens = document.getElementById('opt-sens');
  const optCb = document.getElementById('opt-cb');
  const optMotion = document.getElementById('opt-motion');
  const optLarge = document.getElementById('opt-large');
  const keybindGrid = document.getElementById('keybind-grid');
  const keybindWarn = document.getElementById('keybind-warn');
  const btnResetKeys = document.getElementById('btn-reset-keys');

  for (let i = 0; i < TUNING.capacityMax; i++) {
    const slot = document.createElement('div');
    slot.className = 'mote-slot';
    hudMotes.appendChild(slot);
  }

  const DEFAULT_KEYS = {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    dash: 'ShiftLeft',
    interact: 'KeyE',
    pulse: 'KeyQ',
    pause: 'Escape',
  };
  const KEY_LABELS = {
    up: 'Tiến',
    down: 'Lùi',
    left: 'Trái',
    right: 'Phải',
    jump: 'Nhảy',
    dash: 'Lướt',
    interact: 'Nạp đèn',
    pulse: 'Tỏa Sáng',
    pause: 'Tạm dừng',
  };

  const savedSettings = JSON.parse(localStorage.getItem('ddl_settings') || '{}');
  let mouseSens = savedSettings.sens ?? 0.25;
  let colorblind = Boolean(savedSettings.cb);
  let reduceMotion = Boolean(savedSettings.motion);
  let largeText = Boolean(savedSettings.large);
  let keybinds = { ...DEFAULT_KEYS, ...(savedSettings.keys || {}) };

  audio.setVolume(savedSettings.vol ?? 0.5);
  view.colorblind = colorblind;
  document.body.classList.toggle('large-text', largeText);
  optVol.value = String(audio.volume);
  optSens.value = String(mouseSens);
  optCb.checked = colorblind;
  optMotion.checked = reduceMotion;
  optLarge.checked = largeText;

  function saveSettings() {
    localStorage.setItem(
      'ddl_settings',
      JSON.stringify({ vol: audio.volume, sens: mouseSens, cb: colorblind, motion: reduceMotion, large: largeText, keys: keybinds })
    );
  }

  function renderKeybinds() {
    keybindGrid.innerHTML = '';
    const counts = {};
    Object.values(keybinds).forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
    const hasDup = Object.values(counts).some((c) => c > 1);
    keybindWarn.textContent = hasDup ? 'Cảnh báo: Có phím bị trùng!' : '';

    for (const [action, label] of Object.entries(KEY_LABELS)) {
      const span = document.createElement('span');
      span.textContent = label;
      const btn = document.createElement('button');
      btn.className = 'kb-btn';
      btn.textContent = keybinds[action];
      btn.addEventListener('click', () => {
        btn.textContent = 'Nhấn phím...';
        const handler = (ev) => {
          ev.preventDefault();
          keybinds[action] = ev.code;
          saveSettings();
          renderKeybinds();
          window.removeEventListener('keydown', handler, true);
        };
        window.addEventListener('keydown', handler, true);
      });
      keybindGrid.appendChild(span);
      keybindGrid.appendChild(btn);
    }
  }
  renderKeybinds();

  btnResetKeys.addEventListener('click', () => {
    keybinds = { ...DEFAULT_KEYS };
    saveSettings();
    renderKeybinds();
  });
  optVol.addEventListener('input', () => { audio.setVolume(Number(optVol.value)); saveSettings(); });
  optSens.addEventListener('input', () => { mouseSens = Number(optSens.value); saveSettings(); });
  optCb.addEventListener('change', () => { colorblind = optCb.checked; view.colorblind = colorblind; saveSettings(); });
  optMotion.addEventListener('change', () => { reduceMotion = optMotion.checked; saveSettings(); });
  optLarge.addEventListener('change', () => { largeText = optLarge.checked; document.body.classList.toggle('large-text', largeText); saveSettings(); });

  let currentNight = 1;
  let campaignScore = 0;
  let nightsWon = 0;
  let lastSeed = 1;
  let sim = new GameSimulation({ seed: 1, night: 1 });
  let mode = 'menu';
  let camYawDeg = 0;
  let subtitleTimer = 0;
  const keys = new Set();

  function showSubtitle(text) {
    subtitleBar.textContent = text;
    subtitleBar.style.display = 'block';
    subtitleTimer = 2.5;
  }

  function showOverlay(title, desc, buttons, showSettings = false, showLb = false) {
    overlay.classList.remove('hidden');
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    settingsPanel.classList.toggle('open', showSettings);
    lbBox.classList.toggle('open', showLb);
    overlayActions.innerHTML = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className = b.secondary ? 'btn secondary' : 'btn';
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      overlayActions.appendChild(btn);
    }
  }

  async function showLeaderboard() {
    let entries = [];
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      entries = data.entries || [];
    } catch {
      entries = JSON.parse(localStorage.getItem('ddl_leaderboard') || '[]');
    }
    lbBox.innerHTML = '<strong>Top 10 Người Giữ Đèn</strong>' +
      (entries.length === 0
        ? '<p>Chưa có kỷ lục nào.</p>'
        : entries.map((e, i) => `<div>#${i + 1} ${e.name} — ${e.score} điểm (${e.nights_won}/3 Đêm)</div>`).join(''));
    showOverlay('Bảng xếp hạng', 'Kỷ lục cục bộ lưu trên máy.', [{ label: 'Quay lại', onClick: showMainMenu }], false, true);
  }

  async function submitScore(name) {
    if (!validatePlayerName(name)) return false;
    const entry = {
      name: name.trim(),
      score: campaignScore,
      nights_won: nightsWon,
      achieved_at: new Date().toISOString(),
      seed: lastSeed,
    };
    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      const prev = JSON.parse(localStorage.getItem('ddl_leaderboard') || '[]');
      prev.push(entry);
      localStorage.setItem('ddl_leaderboard', JSON.stringify(prev));
    }
    return true;
  }

  function promptSaveScore(title, desc, extraButtons) {
    lbBox.innerHTML = `<label>Nhập tên lưu điểm (3–12 ký tự): <input id="lb-name" maxlength="12" style="padding:6px;font-size:16px;" /></label>
      <div id="lb-msg" style="font-size:14px;color:#FFE58A;"></div>`;
    showOverlay(
      title,
      desc,
      [
        {
          label: 'Lưu điểm',
          onClick: async () => {
            const val = document.getElementById('lb-name').value;
            const ok = await submitScore(val);
            document.getElementById('lb-msg').textContent = ok ? 'Đã lưu!' : 'Tên cần 3–12 ký tự.';
          },
        },
        ...extraButtons,
      ],
      false,
      true
    );
  }

  function showMainMenu() {
    mode = 'menu';
    currentNight = 1;
    campaignScore = 0;
    nightsWon = 0;
    showOverlay(
      'Đảo Đèn Lồng',
      'Hành trình 3 Đêm cùng Mây giữ ánh sáng tới bình minh.',
      [
        { label: 'Bắt đầu Đêm 1', onClick: () => showIntro(1) },
        { label: 'Bảng xếp hạng', secondary: true, onClick: showLeaderboard },
        { label: 'Cài đặt & Tiếp cận', secondary: true, onClick: () => showOverlay('Cài đặt', 'Âm thanh, chuột, bảng màu, đổi phím.', [{ label: 'Quay lại', onClick: showMainMenu }], true) },
      ]
    );
  }

  function showIntro(night) {
    mode = 'intro';
    currentNight = night;
    const map = MAPS[night];
    showOverlay(map.name, map.intro, [
      {
        label: 'Vào Đêm',
        onClick: () => {
          lastSeed = (Date.now() & 0xffff) + night;
          sim = new GameSimulation({ seed: lastSeed, night });
          mode = 'playing';
          overlay.classList.add('hidden');
        },
      },
    ]);
  }

  function togglePause() {
    if (mode === 'playing') {
      mode = 'paused';
      showOverlay(
        'Tạm dừng',
        MAPS[currentNight].name,
        [
          { label: 'Tiếp tục', onClick: () => { mode = 'playing'; overlay.classList.add('hidden'); } },
          { label: 'Chơi lại Đêm', secondary: true, onClick: () => showIntro(currentNight) },
          { label: 'Về menu', secondary: true, onClick: showMainMenu },
        ],
        true
      );
    } else if (mode === 'paused') {
      mode = 'playing';
      overlay.classList.add('hidden');
    }
  }

  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === keybinds.pause && !e.repeat && (mode === 'playing' || mode === 'paused')) {
      togglePause();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('mousemove', (e) => {
    if (mode === 'playing' && (document.pointerLockElement || e.buttons === 1)) {
      camYawDeg = (camYawDeg - e.movementX * mouseSens) % 360;
    }
  });

  function updateHud(dt) {
    if (subtitleTimer > 0) {
      subtitleTimer -= dt;
      if (subtitleTimer <= 0) subtitleBar.style.display = 'none';
    }

    hudFlames.textContent = `Ngọn Lửa: ${sim.player.flames}`;
    const sec = Math.ceil(sim.timeLeftTicks / 60);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    hudTimer.textContent = sec <= 30 && colorblind ? `⚠ ${mm}:${ss}` : `${mm}:${ss}`;
    hudTimer.classList.toggle('danger', sec <= 30);
    hudTimer.classList.toggle('cb', colorblind);

    const cap = sim.getPlayerCapacity();
    const lit = sim.lanterns.filter((l) => l.lit).length;
    hudScore.textContent = `Đèn: ${lit}/${sim.lanterns.length} · Điểm: ${campaignScore + sim.score}`;
    hudCarriedText.textContent = `Đom đóm: ${sim.player.carried}/${cap}`;

    const slots = hudMotes.children;
    for (let i = 0; i < slots.length; i++) {
      slots[i].style.display = i < cap ? 'block' : 'none';
      slots[i].classList.toggle('filled', i < sim.player.carried);
    }

    const dashText = sim.player.charmTicks > 0 ? 'Lướt: Bùa!' : sim.player.dashCdTicks > 0 ? `Lướt: ${(sim.player.dashCdTicks / 60).toFixed(1)}s` : 'Lướt: Sẵn sàng';
    const pulseText = sim.player.pulseCdTicks > 0 ? `Tỏa Sáng: ${(sim.player.pulseCdTicks / 60).toFixed(1)}s` : 'Tỏa Sáng: Sẵn sàng';
    hudSkills.textContent = `${dashText} · ${pulseText}`;

    const nearLantern = sim.lanterns.find(
      (l) => (!l.lit || l.fuel60 < TUNING.fuelMax60) && Math.hypot(l.pos[0] - sim.player.pos[0], l.pos[2] - sim.player.pos[2]) <= TUNING.interactRadius
    );
    if (nearLantern) {
      hudPrompt.textContent = nearLantern.lit
        ? `${keybinds.interact} — Châm dầu (${Math.round(nearLantern.fuel60 / 60)}%)`
        : `${keybinds.interact} — Nạp ánh sáng (${nearLantern.deposited}/${nearLantern.everLit ? TUNING.relightCost : TUNING.lanternCost})`;
      hudPrompt.style.display = 'block';
    } else {
      hudPrompt.style.display = 'none';
    }

    if (sim.wind.warning && mode === 'playing') {
      showSubtitle('⚠ Gió lớn sắp thổi!');
    } else if (sec <= 10 && sec > 0 && mode === 'playing') {
      showSubtitle(`⚠ Còn ${sec} giây tới bình minh!`);
    } else if (sim.lanterns.some((l) => l.lit && l.fuel60 < TUNING.lowFuelThreshold60) && mode === 'playing' && subtitleTimer <= 0) {
      showSubtitle('⚠ Có đèn sắp cạn dầu (<30%)!');
    }
  }

  let lastTime = performance.now();
  let acc = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    if (mode === 'playing' && sim.state === 'playing') {
      acc += dt;
      while (acc >= DT && sim.state === 'playing') {
        const mx = (keys.has(keybinds.right) ? 1 : 0) - (keys.has(keybinds.left) ? 1 : 0);
        const mz = (keys.has(keybinds.up) ? 1 : 0) - (keys.has(keybinds.down) ? 1 : 0);
        const events = sim.step({
          move: [mx, mz],
          cam_yaw_deg: camYawDeg,
          jump: keys.has(keybinds.jump),
          dash: keys.has(keybinds.dash),
          interact: keys.has(keybinds.interact),
          pulse: keys.has(keybinds.pulse),
        });
        for (const ev of events) {
          audio.playEvent(ev.name);
          if (ev.name === 'pulse' && !reduceMotion) view.triggerPulseVisual();
          if (ev.name === 'shade_spawned') showSubtitle('⚠ Bóng Mực vừa xuất hiện!');
        }
        acc -= DT;
      }
      if (sim.state !== 'playing') {
        mode = 'result';
        if (sim.state === 'won') {
          campaignScore += sim.score;
          nightsWon += 1;
          if (currentNight < 3) {
            showOverlay(`Thắng Đêm ${currentNight}!`, `Điểm Đêm: ${sim.score} · Tổng điểm: ${campaignScore}`, [
              { label: `Sang Đêm ${currentNight + 1}`, onClick: () => showIntro(currentNight + 1) },
            ]);
          } else {
            promptSaveScore('Bình Minh Đã Lên!', `Tổng điểm: ${campaignScore}`, [
              { label: 'Về menu chính', secondary: true, onClick: showMainMenu },
            ]);
          }
        } else {
          promptSaveScore(`Thua Đêm ${currentNight}`, `Lý do: ${sim.endReason} · Điểm tích lũy: ${campaignScore}`, [
            { label: 'Chơi lại Đêm này', onClick: () => showIntro(currentNight) },
            { label: 'Về menu', secondary: true, onClick: showMainMenu },
          ]);
        }
      }
    }

    updateHud(dt);
    view.sync(sim, camYawDeg, now / 1000);
  }

  showMainMenu();
  requestAnimationFrame(loop);
}
