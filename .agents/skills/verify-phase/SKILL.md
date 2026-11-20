---
name: verify-phase
description: Run unit tests, headless contract scenarios, determinism checks, and build verification for Đảo Đèn Lồng.
---

# Verify Phase Skill

1. Run unit and contract tests:
   ```bash
   npm test
   ```
2. Run a headless determinism check (two runs with identical `--seed`, `--scenario`, `--inputs`, `--ticks` must produce byte-for-byte identical JSONL output):
   ```bash
   node src/cli/headless.js --seed 42 --night 1 --ticks 600 --out /tmp/det1.jsonl
   node src/cli/headless.js --seed 42 --night 1 --ticks 600 --out /tmp/det2.jsonl
   diff -u /tmp/det1.jsonl /tmp/det2.jsonl
   ```
3. Run production build:
   ```bash
   npm run build
   ```
4. Record the exact observed outputs in `docs/proof/phase-<N>.md`.
