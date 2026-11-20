import fs from 'node:fs';
import path from 'node:path';
import { GameSimulation } from '../core/sim.js';

function fail(msg, code = 1) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    seed: 1,
    night: 1,
    scenario: null,
    inputs: null,
    ticks: null,
    out: null,
    snapshotEvery: 10,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--seed':
        args.seed = Number(v);
        i++;
        break;
      case '--night':
        args.night = Number(v);
        i++;
        break;
      case '--scenario':
        args.scenario = v;
        i++;
        break;
      case '--inputs':
        args.inputs = v;
        i++;
        break;
      case '--ticks':
        args.ticks = Number(v);
        i++;
        break;
      case '--out':
        args.out = v;
        i++;
        break;
      case '--snapshot-every':
        args.snapshotEvery = Number(v);
        i++;
        break;
      default:
        fail(`Unknown argument: ${k}`, 1);
    }
  }
  if (!Number.isInteger(args.seed)) fail('Invalid --seed', 1);
  if (!Number.isInteger(args.night) || args.night < 1 || args.night > 3) {
    fail('Invalid --night (expected 1, 2, or 3)', 1);
  }
  if (!Number.isInteger(args.ticks) || args.ticks < 0) fail('Invalid or missing --ticks', 1);
  if (!args.out) fail('Missing --out', 1);
  if (!Number.isInteger(args.snapshotEvery) || args.snapshotEvery <= 0) {
    fail('Invalid --snapshot-every', 1);
  }
  return args;
}

function loadJson(filePath, label) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    fail(`Cannot read ${label} file ${filePath}: ${err.message}`, 1);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`Malformed ${label} JSON in ${filePath}: ${err.message}`, 2);
  }
}

function validateInputs(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.frames)) {
    fail('Invalid inputs format: expected { "frames": [...] }', 2);
  }
  let prevTick = -1;
  for (const frame of data.frames) {
    if (!frame || typeof frame !== 'object' || !Number.isInteger(frame.tick) || frame.tick < 0) {
      fail('Invalid frame tick in inputs', 2);
    }
    if (frame.tick <= prevTick) {
      fail(`Frame ticks must be strictly increasing (got ${frame.tick} after ${prevTick})`, 2);
    }
    prevTick = frame.tick;
  }
  return data.frames;
}

const args = parseArgs(process.argv.slice(2));
const scenario = args.scenario ? loadJson(args.scenario, 'scenario') : null;
const frames = args.inputs ? validateInputs(loadJson(args.inputs, 'inputs')) : [];

const sim = new GameSimulation({
  seed: args.seed,
  night: args.night,
  scenario,
});

const lines = [];
lines.push(JSON.stringify(sim.getSnapshot()));

let frameIdx = 0;
for (let k = 0; k < args.ticks; k++) {
  if (sim.state === 'won' || sim.state === 'lost') break;
  let frameInput = {};
  if (frameIdx < frames.length && frames[frameIdx].tick === k) {
    frameInput = frames[frameIdx];
    frameIdx++;
  }
  const events = sim.step(frameInput);
  for (const ev of events) {
    lines.push(JSON.stringify(ev));
  }
  if (sim.tick % args.snapshotEvery === 0 || sim.state === 'won' || sim.state === 'lost') {
    lines.push(JSON.stringify(sim.getSnapshot()));
  }
}

lines.push(
  JSON.stringify({
    type: 'end',
    ticks: sim.tick,
    state: sim.state,
    score: sim.score,
  })
);

fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
fs.writeFileSync(args.out, lines.join('\n') + '\n', 'utf8');
process.exit(0);
