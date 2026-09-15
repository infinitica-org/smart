/**
 * TanStack Query key factory.
 *
 * Cache keys are centralised so that invalidation is a shared decision instead of
 * a guess. The specific failure this prevents: an attempt is submitted, one
 * screen invalidates `['results', attemptId]` while another cached
 * `['attempt-results', attemptId]`, and a candidate stares at a stale page
 * wondering whether their submission registered.
 *
 * Keys are hierarchical, so invalidating a prefix invalidates everything under it.
 *
 * Owner: Satheswaran V.
 */

export const queryKeys = {
  /* ------------------------------- identity ------------------------------- */
  me: () => ['me'] as const,
  myOnboarding: () => ['me', 'onboarding'] as const,
  myEducation: () => ['me', 'education'] as const,
  myLanguages: () => ['me', 'languages'] as const,
  myWorkExperiences: () => ['me', 'work-experiences'] as const,
  mySkillClaims: () => ['me', 'skill-claims'] as const,
  myProjects: () => ['me', 'projects'] as const,
  myCandidateCertificates: () => ['me', 'candidate-certificates'] as const,
  myTracks: () => ['me', 'tracks'] as const,
  myNotifications: () => ['me', 'notifications'] as const,
  entitlements: () => ['me', 'entitlements'] as const,

  /* -------------------------------- catalog ------------------------------- */
  catalog: () => ['catalog'] as const,
  tracks: () => ['catalog', 'tracks'] as const,
  track: (trackCode: string) => ['catalog', 'tracks', trackCode] as const,
  catalogReadiness: () => ['catalog', 'readiness'] as const,

  /* ------------------------------ assessment ------------------------------ */
  attempt: (attemptId: string) => ['attempt', attemptId] as const,
  attemptSession: (attemptId: string) => ['attempt', attemptId, 'session'] as const,
  /**
   * Deliberately NOT cached by React Query in practice — item delivery rotates
   * per attempt and must not be replayable from a client cache. The key exists so
   * that any accidental caching is at least invalidatable.
   */
  nextItem: (attemptId: string) => ['attempt', attemptId, 'next-item'] as const,
  sandboxJob: (jobId: string) => ['sandbox', jobId] as const,
  results: (attemptId: string) => ['results', attemptId] as const,
  skillVerifySession: (sessionId: string) => ['skill-verify', sessionId] as const,

  /* ------------------------------- defense -------------------------------- */
  defenseSession: (sessionId: string) => ['defense', sessionId] as const,

  /* ----------------------------- certificates ----------------------------- */
  myCertificates: () => ['certificates', 'mine'] as const,
  certificate: (certificateId: string) => ['certificates', certificateId] as const,
  /** Public verification. Anonymous, long-lived, no auth in the key. */
  verification: (certificateId: string) => ['verify', certificateId] as const,

  /* ------------------------------ calibration ----------------------------- */
  cutScores: (trackCode: string) => ['calibration', 'cut-scores', trackCode] as const,

  /* ------------------------------- placement ------------------------------ */
  myApplications: () => ['me', 'applications'] as const,
  jobDescriptions: (institutionId: string) => ['placement', 'jds', institutionId] as const,
  jobDescription: (jdId: string) => ['placement', 'jds', jdId] as const,
  shortlist: (filters: Readonly<Record<string, unknown>>) =>
    ['placement', 'shortlist', filters] as const,

  /* ------------------------------- analytics ------------------------------ */
  cohortReadiness: (params: Readonly<Record<string, unknown>>) =>
    ['analytics', 'cohort-readiness', params] as const,
  gapReport: (params: Readonly<Record<string, unknown>>) =>
    ['analytics', 'gap-report', params] as const,
  correlationReport: (params: Readonly<Record<string, unknown>>) =>
    ['analytics', 'correlation', params] as const,
  growthReport: () => ['analytics', 'growth-report'] as const,

  /* -------------------------------- projects ------------------------------ */
  project: (projectId: string) => ['projects', projectId] as const,

  /* ------------------------------ platform ops ---------------------------- */
  platformHealth: () => ['admin', 'platform-health'] as const,
  aiHealth: () => ['admin', 'ai-health'] as const,
  integrityQueue: (params: Readonly<Record<string, unknown>>) =>
    ['admin', 'integrity-queue', params] as const,
} as const;

/**
 * Prefixes to invalidate after a mutation.
 *
 * Written down because "what else goes stale?" is the question everyone gets
 * wrong. Completing an attempt changes results, certificates, the growth report
 * and every cohort analytic — miss one and a dashboard lies to a TPO.
 */
export const invalidationGroups = {
  onAttemptCompleted: (attemptId: string) => [
    queryKeys.attempt(attemptId),
    queryKeys.results(attemptId),
    queryKeys.myCertificates(),
    queryKeys.growthReport(),
    ['analytics'] as const,
  ],
  onCutScoresPublished: (trackCode: string) => [
    queryKeys.cutScores(trackCode),
    queryKeys.catalogReadiness(),
    // Published cut scores re-tier existing results, so every result view is stale.
    ['results'] as const,
    ['analytics'] as const,
  ],
  onCertificateIssued: () => [queryKeys.myCertificates(), ['analytics'] as const],
  onJdParsed: (jdId: string) => [queryKeys.jobDescription(jdId), ['placement'] as const],
  onTrackEnrolled: () => [queryKeys.me(), queryKeys.myTracks(), queryKeys.catalog()],
} as const;
