/**
 * @summary Deterministic 100,000-row dataset generator shared across all three coding-agent benchmark arms.
 *
 * Uses a Mulberry32 PRNG seeded with a fixed integer so Arm A (`react-ag-grid-mcp`), Arm B (`neo-kb-only`),
 * and Arm C (`neo-kb-neural-link`) render, sort, filter, and synchronize the exact same records.
 */

export const REGIONS  = Object.freeze(['EMEA', 'AMER', 'APAC', 'LATAM']);
export const STATUSES = Object.freeze(['Healthy', 'Warning', 'Critical']);
export const TIERS    = Object.freeze(['Enterprise', 'Growth', 'Strategic', 'Core']);
export const OWNERS   = Object.freeze(['A. Vance', 'M. Chen', 'S. Patel', 'L. Lindqvist', 'R. Okafor', 'E. Rossi']);

/**
 * @summary Creates a deterministic 32-bit PRNG (Mulberry32) returning floats in [0, 1).
 * @param {Number} [seed=42]
 * @returns {Function}
 */
export function createSeededRandom(seed = 42) {
    let state = seed >>> 0;

    return function nextRandom() {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * @summary Generates `count` deterministic telemetry / account records for the `grid-100k-multi-window` task.
 *
 * Row `0` (`ROW-000001`) and row `1` (`ROW-000002`) carry pinned canonical values alongside seeded records
 * so that `verify.spec.mjs` can assert exact sort, filter, and cross-window detail values without re-running
 * the PRNG in the assertion harness.
 *
 * @param {Number} [count=100000] Number of rows to generate.
 * @param {Number} [seed=42]      Deterministic PRNG seed.
 * @returns {Array<Object>}
 */
export function generateRows(count = 100000, seed = 42) {
    const rand = createSeededRandom(seed),
          rows = new Array(count);

    for (let i = 0; i < count; i++) {
        const index     = i + 1,
              id        = `ROW-${String(index).padStart(6, '0')}`,
              region    = REGIONS[Math.floor(rand() * REGIONS.length)],
              tier      = TIERS[Math.floor(rand() * TIERS.length)],
              status    = STATUSES[Math.floor(rand() * STATUSES.length)],
              owner     = OWNERS[Math.floor(rand() * OWNERS.length)],
              arrUsd    = 10000 + Math.floor(rand() * 890000),
              latencyMs = 5 + Math.floor(rand() * 495);

        rows[i] = {
            id,
            accountName: `${tier} Account ${index}`,
            region,
            arrUsd,
            latencyMs,
            status,
            owner
        };
    }

    if (count >= 1) {
        rows[0] = {
            id         : 'ROW-000001',
            accountName: 'Alpha Baseline 1',
            region     : 'EMEA',
            arrUsd     : 125000,
            latencyMs  : 18,
            status     : 'Healthy',
            owner      : 'A. Vance'
        };
    }

    if (count >= 2) {
        rows[1] = {
            id         : 'ROW-000002',
            accountName: 'Zenith Apex 2',
            region     : 'APAC',
            arrUsd     : 999900,
            latencyMs  : 12,
            status     : 'Healthy',
            owner      : 'M. Chen'
        };
    }

    return rows;
}

export default generateRows;
