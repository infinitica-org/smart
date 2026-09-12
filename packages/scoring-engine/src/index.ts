/**
 * @smart/scoring-engine — SMART's psychometric core.
 *
 * Everything here is a pure function. No I/O, no clock, no randomness, no
 * database. That constraint is deliberate and load-bearing: a tier awarded
 * today must be reproducible from the same inputs in two years when a candidate
 * or an employer challenges it. Purity is what makes the certificate defensible.
 *
 * Effect is used for the failure channel, not for effects: it puts
 * "cut scores are not published" and "the panel is too small" into the type
 * signature so a caller cannot silently skip them.
 *
 * Owner: Ramansh (AI Engineer).
 */

export * from './errors.js';
export * from './statistics.js';

/* --------------------------- Angoff & tier logic -------------------------- */
export * from './angoff/cut-scores.js';
export * from './angoff/tier-assignment.js';

/* --------------------------- BARS & weighted math ------------------------- */
export * from './bars/weighted-scoring.js';
export * from './bars/mode-consensus.js';

/* ------------------------ INF-05 proficiency gate -------------------------- */
export * from './proficiency/mark-weighted-scoring.js';
export * from './proficiency/sde-v4-scoring.js';

/* -------------------- Competency assessment intelligence ------------------ */
export * from './competency/assessment-intelligence.js';
export * from './competency/item-mapping.js';

/* ---------------------------- Reliability gates --------------------------- */
export * from './reliability/agreement.js';

/* ------------------------------ IRT (Phase 2) ----------------------------- */
export * from './irt/two-parameter.js';

/* ------------------------ Passive signal corroboration -------------------- */
export * from './corroboration/policy.js';
export * from './corroboration/default-weights.js';
export * from './corroboration/fusion.js';
export * from './corroboration/statistics.js';
export * from './corroboration/model-integrity.js';
