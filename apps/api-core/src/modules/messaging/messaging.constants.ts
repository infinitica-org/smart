import type { UserRole } from '@smart/contracts';

/** University staff who act as advisors for the students of their institution. */
export const ADVISOR_ROLES: readonly UserRole[] = ['PLACEMENT_STAFF', 'INSTITUTION_ADMIN'];

/** Everyone who can be in a conversation. */
export const MESSAGING_ROLES: readonly UserRole[] = ['STUDENT', 'COMPANY', ...ADVISOR_ROLES];

/** Th6-422 — new conversations one employer or advisor may open per hour (Th6-411 limiter not present). */
export const START_CONVERSATION_LIMIT_PER_HOUR = 20;

/** Th6-426 — how long a user's unread total may be served from memory. */
export const UNREAD_CACHE_TTL_MS = 10_000;

/**
 * Th6-428 — how long a reported message is preserved for moderators.
 * TODO(Th6-556): read this from the platform retention policy once it exists.
 */
export const MESSAGE_MODERATION_RETENTION_DAYS = 90;

/** Body left behind when the retention job redacts a deleted, reported message. */
export const REDACTED_BODY = '[removed by retention policy]';

export const MODERATION_PURGE_BATCH_SIZE = 200;
export const MESSAGE_MODERATION_PURGE_JOB_ID = 'message-moderation-purge-hourly' as const;
export const MESSAGE_MODERATION_PURGE_INTERVAL_MS = 60 * 60 * 1000;
