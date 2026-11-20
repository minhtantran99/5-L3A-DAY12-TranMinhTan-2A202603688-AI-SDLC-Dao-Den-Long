/**
 * Deterministic PRNG (Mulberry32) for reproducible simulation and spawning.
 * @param {number} seed
 * @returns {() => number}
 */
export function createRng(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Round number to 3 decimal places (avoiding -0).
 * @param {number} n
 * @returns {number}
 */
export function round3(n) {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

/**
 * Round number to 1 decimal place (avoiding -0).
 * @param {number} n
 * @returns {number}
 */
export function round1(n) {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? 0 : r;
}
