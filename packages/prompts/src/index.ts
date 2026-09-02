/**
 * @smart/prompts — immutable, versioned LLM prompt registry.
 *
 * Two rules make this package worth existing:
 *
 *   1. A prompt is an artefact with a version. Every AI-produced score stores the
 *      `promptRef` that produced it, so a grade stays reproducible and a
 *      challenged certificate stays defensible.
 *   2. Model output is untrusted until it satisfies a schema. `guardrails.ts`
 *      fails closed — unparseable output escalates to a human rater instead of
 *      decaying into a guessed number.
 *
 * Only `ai-gateway` should import this package. Owner: Ramansh.
 */

export * from './types.js';
export * from './shared.js';
export * from './guardrails.js';
export * from './registry.js';

export * from './templates/bars-grading.js';
export * from './templates/l4-defense.js';
export * from './templates/capstone-review.js';
export * from './templates/jd-parsing.js';
export * from './templates/resume-parsing.js';
export * from './templates/item-authoring.js';
export * from './templates/gap-report.js';
export * from './templates/skill-interview.js';
export * from './templates/project-verify.js';

export const PROMPTS_VERSION = '0.1.0';
