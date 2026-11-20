import fs from 'node:fs';
import path from 'node:path';
import { GameSimulation } from '../core/sim.js';
import { createRng, round1 } from '../core/rng.js';
import { TICK_RATE } from '../core/config.js';
import { MAPS } from '../core/maps.js';

function parseArgs(argv) {
  const args = { seed: 7, nights: 10, out: 'soak.json' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--seed') args.seed = Number(argv[++i]);
    else if (argv[i] === '--nights') args.nights = Number(argv[++i]);
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const t0 = performance.now();
const results = [];
let crashes = 0;
let memStartMb = null;
let memEndMb = null;

for (let i = 0; i < args.nights; i++) {
  const night = (i % 3) + 1;
  const seed = args.seed + i;
  const rng = createRng(seed);
  try {
    let sim = new GameSimulation({ seed, night });
    if (i === 0) {
      if (typeof global.gc === 'function') global.gc();
      memStartMb = round1(process.memoryUsage().rss / (1024 * 1024));
    }
    const maxTicks = MAPS[night].durationS * TICK_RATE;
    let move = [0, 0];
    let prevJump = false;
    let prevDash = false;
    let prevPulse = false;
    let prevInteract = false;

    for (let t = 0; t < maxTicks && sim.state === 'playing'; t++) {
      if (t % 30 === 0) {
        const ang = rng() * Math.PI * 2;
        move = [Math.cos(ang), Math.sin(ang)];
      }
      const jump = !prevJump && rng() < 0.05;
      const dash = !prevDash && rng() < 0.03;
      const pulse = !prevPulse && rng() < 0.02;
      const interact = !prevInteract && rng() < 0.1;
      prevJump = jump;
      prevDash = dash;
      prevPulse = pulse;
      prevInteract = interact;
      sim.step({ move, jump, dash, pulse, interact });
    }
    results.push(sim.state === 'won' ? 'won' : 'lost');
    sim = null;
  } catch (err) {
    crashes += 1;
    results.push('crash');
    process.stderr.write(`Soak crash on night ${i}: ${err.stack}\n`);
  }
}

if (typeof global.gc === 'function') global.gc();
memEndMb = round1(process.memoryUsage().rss / (1024 * 1024));
const durationS = round1((performance.now() - t0) / 1000);

const report = {
  nights: args.nights,
  crashes,
  results,
  mem_start_mb: memStartMb,
  mem_end_mb: memEndMb,
  duration_s: durationS,
};

fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
fs.writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n', 'utf8');
process.exit(crashes > 0 ? 1 : 0);
