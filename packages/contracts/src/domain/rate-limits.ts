/**
 * The rate-limit matrix, expressed once as data.
 *
 * ARCHITECTURE.md §4 mandates that every interface, role and endpoint is rate
 * limited. Keeping the matrix here (rather than as decorator literals scattered
 * across 15 modules) means:
 *   - Vishal V implements one guard that reads this table
 *   - Satheswaran V's api-client knows the same limits and can back off correctly
 *   - the architect can audit the whole surface in one file
 *
 * A new endpoint MUST add a policy here. An endpoint without a policy fails
 * review — "unlimited endpoints do not ship" (DEFINITION_OF_DONE.md §5).
 *
 * Owner: Tino (contract) / Vishal V (implementation).
 */

/** What the limit counts against. Determines the Redis key shape. */
export type RateLimitScope =
  'IP' | 'USER' | 'ATTEMPT' | 'INSTITUTION' | 'API_KEY' | 'SERVICE_WORKER';

export interface RateLimitPolicy {
  /** Stable identifier used by the guard decorator, e.g. `@RateLimit('assessment.submitL1')`. */
  readonly key: string;
  readonly scope: RateLimitScope;
  /** Sustained request budget per window. */
  readonly limit: number;
  readonly windowSeconds: number;
  /** Token-bucket burst allowance on top of the sustained rate. */
  readonly burst: number;
  /** Redis key template. `{id}` is substituted with the resolved scope value. */
  readonly redisKey: string;
  /** Why this number — reviewers should not have to guess. */
  readonly rationale: string;
  /** Extra action beyond returning 429. */
  readonly onViolation?: 'ALERT' | 'THROTTLE_2M' | 'INTEGRITY_LOG' | 'IP_CHALLENGE';
}

/* ------------------------- role-level default budgets ---------------------- */

export const ROLE_RATE_LIMITS: readonly RateLimitPolicy[] = [
  {
    key: 'role.superAdmin',
    scope: 'USER',
    limit: 500,
    windowSeconds: 60,
    burst: 100,
    redisKey: 'rl:admin:{id}',
    rationale: 'Administrative bulk operations need headroom; violations are alert-worthy.',
    onViolation: 'ALERT',
  },
  {
    key: 'role.institutionAdmin',
    scope: 'INSTITUTION',
    limit: 200,
    windowSeconds: 60,
    burst: 50,
    redisKey: 'rl:tpo:{id}',
    rationale: 'Cohort and placement APIs are read-heavy but not interactive-latency critical.',
    onViolation: 'THROTTLE_2M',
  },
  {
    key: 'role.placementStaff',
    scope: 'USER',
    limit: 150,
    windowSeconds: 60,
    burst: 40,
    redisKey: 'rl:staff:{id}',
    rationale: 'Shortlist filtering generates many small queries during a recruiting drive.',
  },
  {
    key: 'role.student',
    scope: 'USER',
    limit: 60,
    windowSeconds: 60,
    burst: 15,
    redisKey: 'rl:student:{id}',
    rationale: 'Normal navigation of profile, dashboard and results.',
  },
  {
    key: 'role.public',
    scope: 'IP',
    limit: 20,
    windowSeconds: 60,
    burst: 5,
    redisKey: 'rl:public:ip:{id}',
    rationale: 'Unauthenticated verification traffic; protects against mass scraping.',
    onViolation: 'IP_CHALLENGE',
  },
  {
    key: 'role.b2bPartner',
    scope: 'API_KEY',
    limit: 500,
    windowSeconds: 3600,
    burst: 50,
    redisKey: 'rl:apikey:{id}',
    rationale:
      'Institutional ERP and recruiter integrations poll on a schedule, not interactively.',
  },
] as const;

/* --------------------- endpoint-specific hard throttles -------------------- */

export const ENDPOINT_RATE_LIMITS: readonly RateLimitPolicy[] = [
  {
    key: 'auth.login',
    scope: 'IP',
    limit: 10,
    windowSeconds: 60,
    burst: 3,
    redisKey: 'rl:auth:ip:{id}',
    rationale: 'Credential stuffing and brute-force defence.',
    onViolation: 'ALERT',
  },
  {
    key: 'auth.refresh',
    scope: 'USER',
    limit: 20,
    windowSeconds: 60,
    burst: 5,
    redisKey: 'rl:refresh:{id}',
    rationale: 'Prevents token-generation spamming while allowing normal silent refresh.',
  },
  {
    key: 'auth.invite',
    scope: 'IP',
    limit: 30,
    windowSeconds: 60,
    burst: 10,
    redisKey: 'rl:invite:ip:{id}',
    rationale: 'Invitation preview and accept endpoints; caps token enumeration.',
  },
  {
    key: 'tpo.import',
    scope: 'INSTITUTION',
    limit: 10,
    windowSeconds: 60,
    burst: 3,
    redisKey: 'rl:tpo:import:{id}',
    rationale: 'Excel roster imports are CPU-heavy; capped per institution.',
  },
  {
    key: 'assessment.submitL1',
    scope: 'ATTEMPT',
    limit: 10,
    windowSeconds: 60,
    burst: 3,
    redisKey: 'rl:l1_sub:{id}',
    rationale:
      'Blocks automated submission scripts. NOTE for the frontend: debounce and coalesce answer ' +
      'drafts — an autosave loop that ignores 429 will lock a candidate out of their own exam.',
    onViolation: 'INTEGRITY_LOG',
  },
  {
    key: 'assessment.compileL2',
    scope: 'USER',
    limit: 10,
    windowSeconds: 60,
    burst: 2,
    redisKey: 'rl:l2_compile:{id}',
    rationale: 'Protects the Docker sandbox pool from CPU and memory exhaustion.',
  },
  {
    key: 'assessment.evaluateL3L4',
    scope: 'USER',
    limit: 5,
    windowSeconds: 60,
    burst: 2,
    redisKey: 'rl:l3_eval:{id}',
    rationale: 'High-cost LLM audio/defense evaluation; caps spend per candidate.',
  },
  {
    key: 'ai.gateway',
    scope: 'SERVICE_WORKER',
    limit: 200,
    windowSeconds: 60,
    burst: 20,
    redisKey: 'rl:llm:gateway',
    rationale:
      'Anthropic account quota is 200 RPM / 10k TPM. Exceeding it triggers the Gemini failover ' +
      'path rather than a candidate-visible error.',
    onViolation: 'ALERT',
  },
  {
    key: 'verify.certificate',
    scope: 'IP',
    limit: 20,
    windowSeconds: 60,
    burst: 5,
    redisKey: 'rl:verify:ip:{id}',
    rationale: 'Public certificate verification; scraping protection.',
    onViolation: 'IP_CHALLENGE',
  },
  {
    key: 'verify.workExperience',
    scope: 'IP',
    limit: 20,
    windowSeconds: 60,
    burst: 5,
    redisKey: 'rl:verify_we:ip:{id}',
    rationale: 'Public work experience verification token endpoints; cap brute force.',
    onViolation: 'IP_CHALLENGE',
  },
  {
    key: 'verify.certificateEndorsement',
    scope: 'IP',
    limit: 20,
    windowSeconds: 60,
    burst: 5,
    redisKey: 'rl:verify_cert_endorse:ip:{id}',
    rationale: 'Public certificate endorsement token endpoints; cap brute force.',
    onViolation: 'IP_CHALLENGE',
  },
  {
    key: 'verify.publicProfile',
    scope: 'IP',
    limit: 30,
    windowSeconds: 60,
    burst: 10,
    redisKey: 'rl:verify_profile:ip:{id}',
    rationale: 'Public candidate profile lookup by share slug; scraping/enumeration protection.',
    onViolation: 'IP_CHALLENGE',
  },
  {
    key: 'placement.match',
    scope: 'INSTITUTION',
    limit: 30,
    windowSeconds: 60,
    burst: 10,
    redisKey: 'rl:match:inst:{id}',
    rationale: 'pgvector cosine matrix computation is expensive; batched per institution.',
  },
  {
    key: 'users.resumeParse',
    scope: 'USER',
    limit: 10,
    windowSeconds: 60,
    burst: 3,
    redisKey: 'rl:resume_parse:user:{id}',
    rationale: 'Each parse spends LLM tokens; onboarding retries must not flood the P3 bucket.',
  },
  {
    key: 'evaluation.skillInterview',
    scope: 'USER',
    limit: 8,
    windowSeconds: 60,
    burst: 2,
    redisKey: 'rl:skill_interview:user:{id}',
    rationale:
      'SE-T02 generate + grade each spend LLM tokens; cap retries so one student cannot drain the FAST/PRIMARY lanes.',
  },
  {
    key: 'placement.ingestJd',
    scope: 'INSTITUTION',
    limit: 20,
    windowSeconds: 60,
    burst: 5,
    redisKey: 'rl:jd:inst:{id}',
    rationale: 'Each JD upload triggers an LLM parse plus an embedding write.',
  },
  {
    key: 'placement.opening',
    scope: 'INSTITUTION',
    limit: 40,
    windowSeconds: 60,
    burst: 10,
    redisKey: 'rl:opening:inst:{id}',
    rationale: 'Structured JD form writes; cheaper than PDF parse.',
  },
  {
    key: 'placement.application',
    scope: 'USER',
    limit: 30,
    windowSeconds: 60,
    burst: 8,
    redisKey: 'rl:application:user:{id}',
    rationale: 'ATS stage sync and My Applications must stay bounded.',
  },
  {
    key: 'assessment.skillClaim',
    scope: 'USER',
    limit: 40,
    windowSeconds: 60,
    burst: 10,
    redisKey: 'rl:skill_claim:user:{id}',
    rationale: 'Claim status writes are frequent during verification.',
  },
  {
    key: 'certificate.issue',
    scope: 'USER',
    limit: 10,
    windowSeconds: 60,
    burst: 3,
    redisKey: 'rl:cert_issue:{id}',
    rationale: 'Issuance enqueues a Puppeteer PDF render; caps queue flooding.',
  },
  {
    key: 'projects.submit',
    scope: 'USER',
    limit: 8,
    windowSeconds: 60,
    burst: 2,
    redisKey: 'rl:projects:submit:{id}',
    rationale: 'Each submit enqueues GitHub snapshot work plus an LLM verify.',
  },
  {
    key: 'projects.github',
    scope: 'USER',
    limit: 20,
    windowSeconds: 60,
    burst: 5,
    redisKey: 'rl:projects:github:{id}',
    rationale:
      'Repo picker hits GitHub; cache in Redis with TTL to stay under GitHub secondary limits.',
  },
  {
    key: 'evaluation.projectVerify',
    scope: 'USER',
    limit: 8,
    windowSeconds: 60,
    burst: 2,
    redisKey: 'rl:project_verify:user:{id}',
    rationale: 'SE-T03 LLM quality/relevance scoring; fail closed to review, not reject.',
  },
  {
    key: 'proctoring.telemetry',
    scope: 'ATTEMPT',
    limit: 40,
    windowSeconds: 60,
    burst: 10,
    redisKey: 'rl:proctor:tel:{id}',
    rationale: 'Signed sensors and heartbeats; bursty but must not starve the item player.',
    onViolation: 'INTEGRITY_LOG',
  },
  {
    key: 'proctoring.media',
    scope: 'ATTEMPT',
    limit: 12,
    windowSeconds: 60,
    burst: 3,
    redisKey: 'rl:proctor:media:{id}',
    rationale: 'Onboarding frames, voice clips, and checkpoint object keys.',
  },
  {
    key: 'evaluation.cognitiveProfile',
    scope: 'USER',
    limit: 8,
    windowSeconds: 60,
    burst: 2,
    redisKey: 'rl:cognitive_profile:user:{id}',
    rationale:
      'SE-T04 narrative spend is P3_BATCH; cap refreshes so one student cannot drain the batch lane.',
  },
  {
    key: 'read.adminQueue',
    scope: 'USER',
    limit: 60,
    windowSeconds: 60,
    burst: 10,
    redisKey: 'rl:admin_queue:user:{id}',
    rationale: 'CV-T01 admin queue lookup limit.',
  },
  {
    key: 'write.adminAction',
    scope: 'USER',
    limit: 30,
    windowSeconds: 60,
    burst: 5,
    redisKey: 'rl:admin_action:user:{id}',
    rationale: 'CV-T01 admin approve/void action limit.',
  },
] as const;

export const ALL_RATE_LIMIT_POLICIES: readonly RateLimitPolicy[] = [
  ...ROLE_RATE_LIMITS,
  ...ENDPOINT_RATE_LIMITS,
];

export function getRateLimitPolicy(key: string): RateLimitPolicy {
  const found = ALL_RATE_LIMIT_POLICIES.find((policy) => policy.key === key);
  if (!found) {
    throw new Error(
      `No rate limit policy registered for "${key}". Add it to ` +
        `packages/contracts/src/domain/rate-limits.ts — unlimited endpoints do not ship.`,
    );
  }
  return found;
}

/**
 * Standard headers returned on EVERY response, not only on 429 — the client
 * uses them to pace itself before it gets throttled.
 */
export const RATE_LIMIT_HEADERS = {
  limit: 'X-RateLimit-Limit',
  remaining: 'X-RateLimit-Remaining',
  reset: 'X-RateLimit-Reset',
  retryAfter: 'Retry-After',
} as const;

/** Redis TTL/eviction budget from ARCHITECTURE.md §4.5. All keys carry a TTL. */
export const REDIS_TTL_SECONDS = {
  assessmentSession: 2 * 60 * 60,
  rateLimitWindow: 60,
  authToken: 15 * 60,
  itemBankForm: 24 * 60 * 60,
  cutScores: 7 * 24 * 60 * 60,
  certificateVerification: 60 * 60,
  jdVector: 30 * 60,
  githubRepoList: 5 * 60,
  githubProfile: 10 * 60,
  githubRepoLanguages: 10 * 60,
  githubReadme: 10 * 60,
  projectWebSimilarity: 5 * 60,
  projectSnapshotLock: 10 * 60,
  proctoringNonce: 90,
  proctoringHeartbeat: 2 * 60 * 60,
  proctoringWarning: 2 * 60 * 60,
  proctoringHmac: 2 * 60 * 60,
  proctoringBlob: 60,
  entitlementsResolve: 60,
} as const;
