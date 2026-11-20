# AGENTS.md — Đảo Đèn Lồng

## Commands
- Install & build: `npm install --no-audit --no-fund && npm run build`
- Run 3D game: `npm run start`
- Run unit & contract tests: `npm test`
- Run headless simulation: `node src/cli/headless.js --seed 1 --night <1|2|3> --ticks 600 --out /tmp/out.jsonl`

## Architecture Rules
- `src/core/` MUST remain pure ESM JavaScript with zero DOM, WebGL, or `three` imports.
- Fixed timestep: 60 ticks/sec (`DT = 1/60`). All randomness MUST use `src/core/rng.js` (`mulberry32`).
- Lantern fuel MUST be tracked in integer `1/60` units (`fuel60`, max `6000`) to avoid floating-point drift; round to 1 decimal only on snapshot/event output.
- Win condition (Contract v1.2+): survive until dawn (`timeLeftTicks === 0`) with `litCount >= ceil(0.6 * totalLanterns)`. Never end early on all-lit.
- Shade states: `spawning`, `wander`, `chase`, `drain`, `recoil`, `stunned`.
- Creative additions in `src/render/` MUST NOT alter headless simulation output.

## Verification Gate
- Run `npm test` and `npm run build` before committing or tagging.
- When a Change Request replaces an old rule, update affected tests with explicit reason comments and record an ADR in `docs/adr/`.
