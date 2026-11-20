import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSimulation } from '../src/core/sim.js';

test('Phase 3: Lantern decays, goes out with lantern_out, and relights for 5 motes (+40 score)', () => {
  const sim = new GameSimulation({
    seed: 1,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 1], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 0.05 }],
      time_left_s: 100,
    },
  });
  let outEv = null;
  for (let i = 0; i < 5; i++) {
    const ev = sim.step({});
    const found = ev.find((e) => e.name === 'lantern_out');
    if (found) outEv = found;
  }
  assert.ok(outEv && outEv.data.lantern_id === 'L1');
  assert.equal(sim.lanterns[0].lit, false);
  assert.equal(sim.lanterns[0].everLit, true);

  const relitEv = sim.step({ interact: true });
  assert.ok(relitEv.some((e) => e.name === 'lantern_lit' && e.data.relight === true));
  assert.equal(sim.score, 5 * 5 + 40);
  assert.equal(sim.getPlayerCapacity(), 12);
});

test('Phase 3: Refuel lit lantern emits refuel event and ignores full lantern', () => {
  const sim = new GameSimulation({
    seed: 1,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 1], carried: 4, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 85 }],
      time_left_s: 100,
    },
  });
  const ev = sim.step({ interact: true });
  const refuel = ev.find((e) => e.name === 'refuel');
  assert.ok(refuel && refuel.data.amount === 2 && refuel.data.fuel === 100);
  assert.equal(sim.player.carried, 2);

  // Full lantern should not consume motes or emit refuel
  const ev2 = sim.step({ interact: true });
  assert.ok(!ev2.some((e) => e.name === 'refuel'));
  assert.equal(sim.player.carried, 2);
});

test('Phase 3: Shade drains weak lantern (fuel < 30) and gives +15 on Pulse', () => {
  const simFar = new GameSimulation({
    seed: 1,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 20], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 25 }],
      shades: [{ id: 'S1', pos: [0, 0, 1], state: 'wander' }],
      time_left_s: 100,
    },
  });
  simFar.step({});
  assert.equal(simFar.shades[0].state, 'drain');

  const sim = new GameSimulation({
    seed: 1,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 4], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 25 }],
      shades: [{ id: 'S1', pos: [0, 0, 1], state: 'drain', target_lantern_id: 'L1' }],
      time_left_s: 100,
    },
  });
  const ev = sim.step({ pulse: true });
  assert.ok(ev.some((e) => e.name === 'pulse' && e.data.stunned_ids.includes('S1')));
  assert.equal(sim.score, 15);
});

test('Phase 3: Dawn win requires >= 60% lanterns lit at time_left_s == 0', () => {
  const sim = new GameSimulation({
    seed: 1,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [
        { id: 'L1', lit: true, fuel: 50 },
        { id: 'L2', lit: true, fuel: 50 },
        { id: 'L3', lit: true, fuel: 50 },
      ],
      time_left_s: 0.05,
    },
  });
  let endEv = null;
  for (let i = 0; i < 5; i++) {
    const ev = sim.step({});
    const g = ev.find((e) => e.name === 'game_over');
    if (g) endEv = g;
  }
  assert.ok(endEv && endEv.data.result === 'won' && endEv.data.reason === 'dawn_survived');
});
