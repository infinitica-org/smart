const SKILL_VERIFICATION_PENDING_KEY = 'skillVerificationPending';

export type SkillVerificationPendingMetadata = {
  sessionId: string;
  since: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readSkillVerificationPending(
  metadata: unknown,
): SkillVerificationPendingMetadata | null {
  const root = asRecord(metadata);
  if (!root) return null;
  const raw = root[SKILL_VERIFICATION_PENDING_KEY];
  const pending = asRecord(raw);
  if (!pending) return null;
  const sessionId = pending.sessionId;
  const since = pending.since;
  if (typeof sessionId !== 'string' || typeof since !== 'string') return null;
  return { sessionId, since };
}

export function withSkillVerificationPending(
  metadata: unknown,
  sessionId: string,
  since = new Date().toISOString(),
): Record<string, unknown> {
  return {
    ...(asRecord(metadata) ?? {}),
    [SKILL_VERIFICATION_PENDING_KEY]: { sessionId, since },
  };
}

export function withoutSkillVerificationPending(metadata: unknown): Record<string, unknown> {
  const root = { ...(asRecord(metadata) ?? {}) };
  delete root[SKILL_VERIFICATION_PENDING_KEY];
  return root;
}

/** True while diagnostic grading or follow-on verification steps are in flight. */
export function skillClaimVerificationInProgress(params: {
  lastAttemptId: string | null;
  sourceMetadata?: unknown;
}): boolean {
  const pending = readSkillVerificationPending(params.sourceMetadata);
  if (!pending || !params.lastAttemptId) return false;
  return pending.sessionId === params.lastAttemptId;
}
