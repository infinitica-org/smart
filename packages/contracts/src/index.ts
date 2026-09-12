/**
 * @smart/contracts — the SMART integration boundary.
 *
 * Every cross-module type, every HTTP DTO and every Kafka payload lives here.
 * Nothing in this package imports from an app or another workspace package: it
 * is a leaf, deliberately, so it can never create a dependency cycle between
 * two engineers' modules.
 *
 * CHANGE PROCESS (TEAM.md §4.1)
 *   1. The consumer opens a PR adding/changing the schema here.
 *   2. Tino reviews and merges it, usually the same day at the 17:00 board.
 *   3. Producer and consumer then implement in parallel against the merged type.
 *
 * Owner: Tino (System Architect).
 */

/* ------------------------------- domain ---------------------------------- */
export * from './domain/enums.js';
export * from './domain/disallowed-email-domains.js';
export * from './domain/levels.js';
export * from './domain/tracks.js';
export * from './domain/rate-limits.js';
export * from './domain/skill-levels.js';
export * from './domain/skill-taxonomy.js';
export * from './domain/skills.js';
export * from './domain/skill-dimensions.js';
export * from './domain/signal-consent-scopes.js';
export * from './domain/sde-v4-bridge.js';
export * from './domain/skill-focus-progress.js';
export * from './domain/evidence/index.js';
export * from './domain/question.js';

/* --------------------------------- dto ------------------------------------ */
export * from './dto/common.js';
export * from './dto/auth.dto.js';
export * from './dto/catalog.dto.js';
export * from './dto/assessment.dto.js';
export * from './dto/proctoring.dto.js';
export * from './dto/evaluation.dto.js';
export * from './dto/cert-agenda.dto.js';
export * from './dto/candidate-certificate.dto.js';
export * from './dto/cert-verify.dto.js';
export * from './dto/cognitive-profile.dto.js';
export * from './dto/calibration.dto.js';
export * from './dto/certificate.dto.js';
export * from './dto/placement.dto.js';
export * from './dto/analytics.dto.js';
export * from './dto/onboarding.dto.js';
export * from './dto/candidate-onboarding.dto.js';
export * from './dto/candidate-social.dto.js';
export * from './dto/public-candidate-profile.dto.js';
export * from './dto/resume-parse.dto.js';
export * from './dto/notification.dto.js';
export * from './dto/project-verify.dto.js';
export * from './dto/work-experience.dto.js';
export * from './dto/work-experience-proof.dto.js';
export * from './dto/work-experience-letter-authenticity.dto.js';
export * from './dto/organization.dto.js';
export * from './dto/username.dto.js';
export * from './dto/void.dto.js';
export * from './dto/candidate-profile.dto.js';
export * from './dto/signals.dto.js';
export * from './dto/raw-signals.dto.js';
export * from './dto/signal-connections.dto.js';
export * from './dto/corroboration.dto.js';
export * from './dto/evidence.dto.js';

/* -------------------------------- events ---------------------------------- */
export * from './events/topics.js';
export * from './events/payloads.js';

/* --------------------------------- http ----------------------------------- */
export * from './http/routes.js';

/** Contract version. Bumped by the architect when a breaking change lands. */
export const CONTRACTS_VERSION = '0.2.6' as const;
