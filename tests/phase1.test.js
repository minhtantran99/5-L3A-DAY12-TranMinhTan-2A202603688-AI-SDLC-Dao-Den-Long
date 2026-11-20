import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { GameSimulation } from '../src/core/sim.js';

test('Phase 1: Scenario setup emits no events and does not award points', () => {
  const sim = new GameSimulation({
    seed: 1,
    night: 1,
    scenario: {
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', lit: true, deposited: 10 }],
      motes: [[0, 0, 2]],
      shades: [],
    },
  });
  const snap = sim.getSnapshot();
  assert.equal(snap.tick, 0);
  assert.equal(snap.score, 0);
  assert.equal(snap.lanterns[0].lit, true);
  assert.equal(snap.motes_active, 1);
});

test('Phase 1 (updated for Ticket-03): Mote pickup, deposit, and lantern_lit (no early win)', () => {
  // Note: Ticket-03 (Phase 3) replaced early all_lit victory with dawn_survived.
  // This test verifies deposit + lantern_lit while keeping game in playing state until dawn.
  const sim = new GameSimulation({
    seed: 1,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 0], carried: 10, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [
        { id: 'L1', pos: [0, 0, 1], lit: false, deposited: 0 },
        { id: 'L2', lit: true, deposited: 10 },
        { id: 'L3', lit: true, deposited: 10 },
        { id: 'L4', lit: true, deposited: 10 },
        { id: 'L5', lit: true, deposited: 10 },
      ],
      time_left_s: 100,
    },
  });
  const ev = sim.step({ interact: true });
  assert.ok(ev.some((e) => e.name === 'deposit'));
  assert.ok(ev.some((e) => e.name === 'lantern_lit' && e.data.relight === false));
  assert.equal(sim.state, 'playing');
});

test('Phase 1: Pulse stuns and pushes shades in range', () => {
  const sim = new GameSimulation({
    seed: 1,
    night: 1,
    scenario: {
      player: { pos: [0, 0, 0], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      shades: [{ id: 'S1', pos: [3, 0, 0] }],
    },
  });
  const ev = sim.step({ pulse: true });
  assert.ok(ev.some((e) => e.name === 'pulse' && e.data.stunned_ids.includes('S1')));
  assert.equal(sim.shades[0].state, 'stunned');
  assert.equal(sim.player.carried, 2);
});

test('Phase 1: Headless CLI determinism and exit code 2 on invalid inputs', () => {
  const out1 = '/tmp/p1_det1.jsonl';
  const out2 = '/tmp/p1_det2.jsonl';
  execFileSync('node', [
    'src/cli/headless.js',
    '--seed', '7',
    '--night', '1',
    '--ticks', '120',
    '--out', out1,
  ]);
  execFileSync('node', [
    'src/cli/headless.js',
    '--seed', '7',
    '--night', '1',
    '--ticks', '120',
    '--out', out2,
  ]);
  assert.equal(fs.readFileSync(out1, 'utf8'), fs.readFileSync(out2, 'utf8'));

  const badInputs = '/tmp/p1_bad_inputs.json';
  fs.writeFileSync(badInputs, JSON.stringify({ frames: [{ tick: 5 }, { tick: 5 }] }));
  assert.throws(
    () =>
      execFileSync('node', [
        'src/cli/headless.js',
        '--seed', '1',
        '--night', '1',
        '--inputs', badInputs,
        '--ticks', '10',
        '--out', '/tmp/p1_bad_out.jsonl',
      ]),
    (err) => err.status === 2
  );
});
