import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { addLeaderboardEntry, readLeaderboard, validatePlayerName } from '../src/core/leaderboard.js';

test('Phase 4: Leaderboard validates names, sorts top 10, and persists', () => {
  assert.equal(validatePlayerName('ab'), false);
  assert.equal(validatePlayerName('Mây_01'), true);

  const tmpLb = '/tmp/p4_lb.json';
  if (fs.existsSync(tmpLb)) fs.unlinkSync(tmpLb);

  addLeaderboardEntry({ name: 'An1', score: 500, nights_won: 2, achieved_at: '2026-11-20T10:00:00Z', seed: 1 }, tmpLb);
  addLeaderboardEntry({ name: 'Binh', score: 900, nights_won: 3, achieved_at: '2026-11-20T10:05:00Z', seed: 2 }, tmpLb);
  addLeaderboardEntry({ name: 'Chi', score: 900, nights_won: 3, achieved_at: '2026-11-20T10:01:00Z', seed: 3 }, tmpLb);

  const { entries } = readLeaderboard(tmpLb);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].name, 'Chi'); // tie-break earlier achieved_at
  assert.equal(entries[1].name, 'Binh');
  assert.equal(entries[2].name, 'An1');
});

test('Phase 4: Export leaderboard CLI outputs valid JSON', () => {
  const out = '/tmp/p4_export_lb.json';
  execFileSync('node', ['src/cli/run.js', '--export-leaderboard', out]);
  const data = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.ok(Array.isArray(data.entries));
});

test('Phase 4: Soak test 10 nights runs with 0 crashes and bounded memory', () => {
  const soakOut = '/tmp/p4_soak.json';
  execFileSync('node', ['--expose-gc', '--jitless', 'src/cli/soak.js', '--seed', '7', '--nights', '10', '--out', soakOut]);
  const report = JSON.parse(fs.readFileSync(soakOut, 'utf8'));
  assert.equal(report.nights, 10);
  assert.equal(report.crashes, 0);
  assert.equal(report.results.length, 10);
  assert.ok(report.mem_end_mb <= 1.2 * report.mem_start_mb);
});
