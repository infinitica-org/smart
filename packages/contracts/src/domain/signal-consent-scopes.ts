/**
 * Allowlisted consent scopes for passive signal ingestion (S6-RM-13).
 *
 * Corroboration ingest must reject unknown scopes. The corroboration branch
 * wires this into VectorizedSignal validation at ingest time.
 *
 * Owner: Ramansh.
 */

export const PASSIVE_SIGNAL_SOURCE_IDS = [
  'GITHUB',
  'HACKERRANK',
  'LEETCODE',
  'RESUME',
  'MANUAL',
  'EXTERNALCERT',
  'PROFESSIONALCREDENTIAL',
] as const;
export type PassiveSignalSourceId = (typeof PASSIVE_SIGNAL_SOURCE_IDS)[number];

/** Known consent scopes per passive signal source. */
export const SIGNAL_CONSENT_SCOPES: Readonly<Record<PassiveSignalSourceId, readonly string[]>> = {
  GITHUB: ['github.onboarding.public_repos', 'github.profile.public_refresh'],
  HACKERRANK: ['hackerrank.profile.public', 'hackerrank.oauth.read'],
  LEETCODE: ['leetcode.profile.public'],
  RESUME: ['resume.upload.explicit'],
  MANUAL: ['manual.admin.attested'],
  // Candidate declared and verified the credential themselves — no third-party OAuth grant to scope.
  EXTERNALCERT: ['certificate.candidate.declared'],
  PROFESSIONALCREDENTIAL: ['credential.candidate.declared'],
};

const ALL_SCOPES = new Set(Object.values(SIGNAL_CONSENT_SCOPES).flatMap((scopes) => scopes));

/** Returns true when scope is registered for the given sourceId. */
export function isValidConsentScope(
  sourceId: PassiveSignalSourceId,
  consentScope: string,
): boolean {
  return SIGNAL_CONSENT_SCOPES[sourceId].includes(consentScope);
}

/** Returns true when scope is registered for any passive source. */
export function isKnownConsentScope(consentScope: string): boolean {
  return ALL_SCOPES.has(consentScope);
}
