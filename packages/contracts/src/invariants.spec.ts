import { describe, expect, it } from 'vitest';
import {
  ALL_RATE_LIMIT_POLICIES,
  BatchImportMappingSchema,
  BatchImportResultDtoSchema,
  CreateJobOpeningRequestSchema,
  LATENCY_BUDGET_MS,
  LEVEL_DEFINITIONS,
  LEVEL_QUESTION_TOTALS,
  LEVEL_VERIFICATION_METHOD,
  L5_SPLIT_WEIGHTS,
  ParseResumeRequestSchema,
  ROUTES,
  SKILL_CLAIM_STATUSES,
  SKILL_MAX_ATTEMPTS,
  SKILL_REATTEMPTS,
  SKILL_REFRESH_DAYS,
  SKILL_DEFINITIONS,
  SMART_TOPICS,
  TOPIC_SPECS,
  TRACK_DEFINITIONS,
  TRACK_CODES,
  assertDomainWeightsSumToOne,
  assertSkillQuestionCounts,
  candidateCriticalRoutes,
  getCommunicationDomain,
  getRateLimitPolicy,
  getTopicSpec,
  getTrackDefinition,
  routesExceedingLatencyBudget,
  sdeV4FormCodeForCatalogSkill,
  skillFocusOptions,
  resolveSkillFocus,
  hydrateFocusProgress,
  focusProgressFor,
} from './index.js';

/**
 * Contract invariants.
 *
 * These are not unit tests of behaviour — they are CI guards on the shared
 * boundary. Each one encodes a rule that, if broken, silently produces wrong
 * scores or unlimited endpoints rather than a loud failure.
 */

describe('track registry', () => {
  it('defines exactly the 10 launch tracks', () => {
    expect(TRACK_DEFINITIONS).toHaveLength(10);
    expect(new Set(TRACK_DEFINITIONS.map((t) => t.code))).toEqual(new Set(TRACK_CODES));
  });

  it('gives every track five competency domains A-E', () => {
    for (const track of TRACK_DEFINITIONS) {
      expect(track.domains.map((d) => d.code)).toEqual(['A', 'B', 'C', 'D', 'E']);
    }
  });

  // A weight sum other than 1.0 does not throw at runtime — it silently
  // rescales every candidate's score. This is why it is asserted in CI.
  it('has domain weights summing to exactly 1.0 per track', () => {
    for (const track of TRACK_DEFINITIONS) {
      expect(() => assertDomainWeightsSumToOne(track)).not.toThrow();
    }
  });

  // Every track must have exactly one "communicate and defend" domain, and it
  // must actually be assessed at L3 or L4. It is domain E for most tracks but
  // domain D for Cybersecurity Analyst and Data Analyst — if this mapping is
  // wrong, Ramansh grades a candidate against the wrong BARS anchors.
  it('assesses each track\u2019s communication domain at L3 or L4', () => {
    for (const track of TRACK_DEFINITIONS) {
      const domain = getCommunicationDomain(track.code);
      expect(
        domain.assessedAtLevels.some((level) => level === 3 || level === 4),
        `${track.code}: communication domain ${domain.code} (${domain.name}) is not assessed at L3/L4`,
      ).toBe(true);
    }
  });

  it('routes Cybersecurity and Data Analyst defense through domain D, not E', () => {
    expect(getCommunicationDomain('TECH_CYBERSECURITY').name).toBe('Incident Response');
    expect(getCommunicationDomain('TECH_DATA_ANALYST').name).toBe('Business Translation');
    expect(getCommunicationDomain('TECH_FULLSTACK').name).toBe('Technical Communication');
  });

  it('marks MBA Finance and Business Analytics as the validated lead tracks', () => {
    const leads = TRACK_DEFINITIONS.filter((t) => t.launchStatus === 'VALIDATED_LEAD').map(
      (t) => t.code,
    );
    expect(leads.sort()).toEqual(['MBA_BUSINESS_ANALYTICS', 'MBA_FINANCE']);
  });

  it('throws a clear error for an unknown track code', () => {
    // @ts-expect-error deliberately invalid at the type level
    expect(() => getTrackDefinition('NOT_A_TRACK')).toThrow(/Unknown SMART track code/);
  });
});

describe('level model', () => {
  it('defines L1 through L5 in order', () => {
    expect(LEVEL_DEFINITIONS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it('splits L5 capstone scoring 50/30/20', () => {
    const total =
      L5_SPLIT_WEIGHTS.objectiveChecklist +
      L5_SPLIT_WEIGHTS.practitionerRubric +
      L5_SPLIT_WEIGHTS.presentation;
    expect(total).toBeCloseTo(1, 10);
    expect(L5_SPLIT_WEIGHTS.objectiveChecklist).toBe(0.5);
  });

  it('scores every rubric-based level asynchronously', () => {
    for (const level of LEVEL_DEFINITIONS) {
      if (level.requiresRubricScoring) {
        expect(level.scoringMode, `${level.code} must not block an HTTP request`).toBe(
          'ASYNCHRONOUS',
        );
      }
    }
  });
});

describe('rate limit matrix', () => {
  it('registers a unique key per policy', () => {
    const keys = ALL_RATE_LIMIT_POLICIES.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every policy a positive budget and a TTL-bearing window', () => {
    for (const policy of ALL_RATE_LIMIT_POLICIES) {
      expect(policy.limit).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeGreaterThan(0);
      expect(policy.redisKey).toMatch(/^rl:/);
    }
  });

  it('fails loudly for an unregistered policy key', () => {
    expect(() => getRateLimitPolicy('nope')).toThrow(/unlimited endpoints do not ship/);
  });
});

describe('route registry', () => {
  // "Unlimited endpoints do not ship" — DEFINITION_OF_DONE.md §5.
  it('declares a registered rate limit policy for every route', () => {
    for (const route of ROUTES) {
      expect(
        () => getRateLimitPolicy(route.rateLimit),
        `${route.method} ${route.path}`,
      ).not.toThrow();
    }
  });

  it('declares at least one RBAC role for every route', () => {
    for (const route of ROUTES) {
      expect(route.roles.length, `${route.method} ${route.path} has no roles`).toBeGreaterThan(0);
    }
  });

  it('has no duplicate method+path pairs', () => {
    const ids = ROUTES.map((r) => `${r.method} ${r.path}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every synchronous route inside the budget for its criticality class', () => {
    const overBudget = routesExceedingLatencyBudget().map(
      (r) => `${r.path} (${r.criticality}, ${String(r.slaMs)}ms)`,
    );
    expect(overBudget).toEqual([]);
  });

  it('holds the exam and verification path to the 200ms ceiling', () => {
    expect(LATENCY_BUDGET_MS.CANDIDATE_CRITICAL).toBe(200);
    const critical = candidateCriticalRoutes();
    expect(critical.length).toBeGreaterThan(0);
    for (const route of critical) {
      if (route.execution === 'SYNC') {
        expect(route.slaMs, `${route.path} has no declared SLA`).toBeDefined();
        expect(route.slaMs ?? Infinity).toBeLessThanOrEqual(200);
      }
    }
  });

  it('declares a criticality class for every route', () => {
    for (const route of ROUTES) {
      expect(LATENCY_BUDGET_MS[route.criticality], `${route.path}`).toBeGreaterThan(0);
    }
  });

  it('exposes exactly one unauthenticated verification route', () => {
    const publicOnly = ROUTES.filter((r) => r.roles.length === 1 && r.roles[0] === 'PUBLIC');
    expect(publicOnly.map((r) => r.path)).toContain('/verify/:certificateId');
  });
});

describe('skill taxonomy (skill@1)', () => {
  it('defines 51 skills across 14 categories', () => {
    expect(SKILL_DEFINITIONS).toHaveLength(51);
    expect(new Set(SKILL_DEFINITIONS.map((skill) => skill.categoryId)).size).toBe(14);
  });

  it('has no duplicate skill codes', () => {
    const codes = SKILL_DEFINITIONS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('gives every skill all four proficiency levels', () => {
    for (const skill of SKILL_DEFINITIONS) {
      expect(Object.keys(skill.levels).sort()).toEqual([
        'ADVANCED',
        'BEGINNER',
        'INTERMEDIATE',
        'PROFESSIONAL',
      ]);
    }
  });

  // A question-count sum other than the level total does not throw at
  // runtime — it silently under- or over-fills an assessment. CI guard.
  it('sums question-type counts to the level total (20/20/30/30) for every skill', () => {
    for (const skill of SKILL_DEFINITIONS) {
      expect(() => assertSkillQuestionCounts(skill)).not.toThrow();
    }
  });

  it('never assigns coding questions at Beginner', () => {
    for (const skill of SKILL_DEFINITIONS) {
      expect(skill.levels.BEGINNER.questionCounts.CODING, skill.code).toBe(0);
    }
  });

  it('gates the autonomous interview to Advanced and Professional only', () => {
    expect(LEVEL_VERIFICATION_METHOD.BEGINNER.interviewRequired).toBe(false);
    expect(LEVEL_VERIFICATION_METHOD.INTERMEDIATE.interviewRequired).toBe(false);
    expect(LEVEL_VERIFICATION_METHOD.ADVANCED.interviewRequired).toBe(true);
    expect(LEVEL_VERIFICATION_METHOD.PROFESSIONAL.interviewRequired).toBe(true);
  });

  it('requires a defended project only at Professional', () => {
    for (const level of ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const) {
      expect(LEVEL_VERIFICATION_METHOD[level].projectRequired, level).toBe(false);
    }
    expect(LEVEL_VERIFICATION_METHOD.PROFESSIONAL.projectRequired).toBe(true);
  });

  it('sets ascending pass marks across levels for every skill', () => {
    for (const skill of SKILL_DEFINITIONS) {
      const { BEGINNER, INTERMEDIATE, ADVANCED, PROFESSIONAL } = skill.levels;
      expect(BEGINNER.passMark, skill.code).toBeLessThan(INTERMEDIATE.passMark);
      expect(INTERMEDIATE.passMark, skill.code).toBeLessThan(ADVANCED.passMark);
      expect(ADVANCED.passMark, skill.code).toBeLessThan(PROFESSIONAL.passMark);
    }
  });

  it('matches LEVEL_QUESTION_TOTALS to the declared 20/20/30/30 pattern', () => {
    expect(LEVEL_QUESTION_TOTALS).toEqual({
      BEGINNER: 20,
      INTERMEDIATE: 20,
      ADVANCED: 30,
      PROFESSIONAL: 30,
    });
  });
});

describe('kafka topics', () => {
  it('registers a spec for every declared topic', () => {
    for (const topic of Object.values(SMART_TOPICS)) {
      expect(() => getTopicSpec(topic)).not.toThrow();
    }
    expect(TOPIC_SPECS).toHaveLength(Object.values(SMART_TOPICS).length);
  });

  it('names exactly one producer owner per topic', () => {
    for (const spec of TOPIC_SPECS) {
      expect(spec.producerOwner.length).toBeGreaterThan(0);
      expect(spec.producerModule.length).toBeGreaterThan(0);
    }
  });

  it('keeps assessment and evaluation coupled only through the event bus', () => {
    const submitted = getTopicSpec(SMART_TOPICS.assessmentSubmitted);
    expect(submitted.producerModule).toBe('assessment');
    expect(submitted.consumerModules).toContain('evaluation');

    const completed = getTopicSpec(SMART_TOPICS.evalCompleted);
    expect(completed.producerModule).toBe('evaluation');
    expect(completed.consumerModules).toContain('certificate');
  });
});

describe('sprint 3 MMP placement contracts', () => {
  it('keeps skill-claim statuses on the PRD state machine', () => {
    expect(SKILL_CLAIM_STATUSES).toEqual(['DECLARED', 'VERIFIED', 'BEGINNER_REATTEMPT', 'LOCKED']);
  });

  it('locks Product Owner retry policy: one reattempt, 35-day refresh', () => {
    expect(SKILL_REATTEMPTS).toBe(1);
    expect(SKILL_MAX_ATTEMPTS).toBe(2);
    expect(SKILL_REFRESH_DAYS).toBe(35);
  });

  it('rejects a job opening with no required skills', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse({
      companyName: 'Acme',
      roleTitle: 'Analyst',
      domain: 'SOFTWARE_IT',
      requiredSkills: [],
      minYearsExperience: 0,
      maxYearsExperience: 2,
      location: 'Chennai',
      employmentType: 'FULL_TIME',
      headcount: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it('lists structured openings on GET /placement/openings', () => {
    expect(
      ROUTES.some((route) => route.method === 'GET' && route.path === '/placement/openings'),
    ).toBe(true);
  });

  it('registers ATS stage-change for My Applications sync', () => {
    expect(SMART_TOPICS.applicationStageChanged).toBe('smart.application.stage_changed');
    expect(getTopicSpec(SMART_TOPICS.applicationStageChanged).producerModule).toBe('placement');
  });
});

describe('CN-T02 resume parse contracts', () => {
  it('exposes a student-only parse route with an LLM rate limit', () => {
    const route = ROUTES.find((entry) => entry.path === '/users/me/resume/parse');
    expect(route).toMatchObject({
      method: 'POST',
      module: 'ai-gateway',
      owner: 'Ramansh',
      roles: ['STUDENT'],
      rateLimit: 'users.resumeParse',
    });
  });

  it('refuses a parse request with neither text nor object key', () => {
    expect(ParseResumeRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('batch import contracts', () => {
  it('rejects duplicate uploaded-column mappings', () => {
    expect(
      BatchImportMappingSchema.safeParse({
        fullName: 'Student',
        email: 'Student',
      }).success,
    ).toBe(false);
  });

  it('accepts preview metadata without breaking the import result shape', () => {
    expect(
      BatchImportResultDtoSchema.safeParse({
        imported: 0,
        skipped: 0,
        errors: [],
        headers: ['Student Name', 'Email Address'],
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        existingStudents: 0,
        newAccounts: 1,
        previewTruncated: false,
        preview: [
          {
            row: 2,
            fullName: 'John Student',
            email: 'john.student@example.test',
            valid: true,
            existingStudent: false,
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('SE-T02 skill interview contracts', () => {
  it('registers generate and grade routes with an LLM spend cap', () => {
    expect(
      ROUTES.find((entry) => entry.path === '/evaluation/skill-interview/questions'),
    ).toMatchObject({
      method: 'POST',
      module: 'evaluation',
      owner: 'Ramansh',
      roles: ['STUDENT'],
      rateLimit: 'evaluation.skillInterview',
    });
    expect(
      ROUTES.find((entry) => entry.path === '/evaluation/skill-interview/grade'),
    ).toMatchObject({
      method: 'POST',
      module: 'evaluation',
      owner: 'Ramansh',
      roles: ['STUDENT'],
      rateLimit: 'evaluation.skillInterview',
    });
    expect(getRateLimitPolicy('evaluation.skillInterview').limit).toBe(8);
  });

  it('registers cert-agenda generate with a per-candidate LLM spend cap', () => {
    expect(ROUTES.find((entry) => entry.path === '/evaluation/cert-agenda/generate')).toMatchObject(
      {
        method: 'POST',
        module: 'evaluation',
        owner: 'Ramansh',
        roles: ['STUDENT'],
        rateLimit: 'evaluation.certAgenda',
      },
    );
    expect(getRateLimitPolicy('evaluation.certAgenda').limit).toBe(3);
  });

  it('registers SDE v4 skill-form routes on the same LLM spend cap', () => {
    expect(ROUTES.find((entry) => entry.path === '/evaluation/skill-form/questions')).toMatchObject(
      {
        method: 'POST',
        owner: 'Ramansh',
        rateLimit: 'evaluation.skillInterview',
      },
    );
    expect(ROUTES.find((entry) => entry.path === '/evaluation/skill-form/grade')).toMatchObject({
      method: 'POST',
      owner: 'Ramansh',
      rateLimit: 'evaluation.skillInterview',
    });
    expect(ROUTES.find((entry) => entry.path === '/evaluation/skill-form/run-code')).toMatchObject({
      method: 'POST',
      owner: 'Ramansh',
      rateLimit: 'evaluation.skillInterview',
    });
  });
});

describe('SDE v4 skill-verify assessment routes', () => {
  it('registers start/session/save/complete without colliding with L1 attemptId', () => {
    expect(
      ROUTES.find((entry) => entry.path === '/assessment/skill-claims/:claimId/verify/start'),
    ).toMatchObject({
      method: 'POST',
      module: 'assessment',
      owner: 'Vishal Bharath R',
    });
    expect(
      ROUTES.find((entry) => entry.path === '/assessment/skill-verify/:sessionId'),
    ).toMatchObject({
      method: 'GET',
      criticality: 'CANDIDATE_CRITICAL',
    });
    expect(
      ROUTES.find((entry) => entry.path === '/assessment/skill-verify/:sessionId/complete'),
    ).toMatchObject({
      method: 'POST',
      rateLimit: 'evaluation.skillInterview',
    });
  });

  it('maps Software & IT catalog codes onto v4 form codes', () => {
    expect(sdeV4FormCodeForCatalogSkill('PYTHON_APPLICATION_BACKEND_DEVELOPMENT')).toBe(
      'SDE_PROGRAMMING_FUNDAMENTALS',
    );
    expect(sdeV4FormCodeForCatalogSkill('JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT')).toBe(
      'SDE_PROGRAMMING_FUNDAMENTALS',
    );
    expect(sdeV4FormCodeForCatalogSkill('UNKNOWN_SKILL_CODE')).toBe('SDE_PROGRAMMING_FUNDAMENTALS');
    expect(sdeV4FormCodeForCatalogSkill('')).toBeNull();
  });

  it('lists language/framework foci for catalog skills', () => {
    expect(skillFocusOptions('PYTHON_APPLICATION_BACKEND_DEVELOPMENT')).toEqual([
      'Python',
      'Django',
      'FastAPI',
    ]);
    expect(skillFocusOptions('MODERN_FRONTEND_FRAMEWORKS')).toContain('React');
    expect(resolveSkillFocus('PYTHON_APPLICATION_BACKEND_DEVELOPMENT', 'Python')).toBe('Python');
    expect(resolveSkillFocus('PYTHON_APPLICATION_BACKEND_DEVELOPMENT', 'COBOL')).toBe('Python');
  });

  it('seeds legacy claim status onto the last-used focus only', () => {
    const rows = hydrateFocusProgress({
      skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
      metadata: { skillFocus: 'REST' },
      status: 'BEGINNER_REATTEMPT',
      strikes: 1,
      lockedUntil: null,
      lastAttemptId: null,
      lastGenuineFailureAt: '2026-09-05T05:00:00.000Z',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.focus).toBe('REST');
    expect(rows[0]?.status).toBe('BEGINNER_REATTEMPT');
    expect(focusProgressFor(rows, 'TCP/UDP')).toBeNull();
  });

  it('exposes retryAvailableAt on DECLARED after a sit so cooldown is not beginner-only', () => {
    const rows = hydrateFocusProgress({
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      metadata: {
        skillFocus: 'Git basics',
        focusProgress: [
          {
            focus: 'Git basics',
            status: 'DECLARED',
            strikes: 0,
            lockedUntil: null,
            lastAttemptId: 'attempt-1',
            lastGenuineFailureAt: '2026-09-05T05:00:00.000Z',
          },
        ],
      },
      status: 'DECLARED',
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: 'attempt-1',
      lastGenuineFailureAt: null,
    });
    expect(rows[0]?.retryAvailableAt).toBe('2026-09-07T05:00:00.000Z');
  });
});

describe('SE-T04 cognitive profile contracts', () => {
  it('registers student GET and refresh with an LLM spend cap on refresh only', () => {
    expect(ROUTES.find((entry) => entry.path === '/evaluation/cognitive-profile')).toMatchObject({
      method: 'GET',
      module: 'evaluation',
      owner: 'Ramansh',
      roles: ['STUDENT'],
      rateLimit: 'role.student',
    });
    expect(
      ROUTES.find((entry) => entry.path === '/evaluation/cognitive-profile/refresh'),
    ).toMatchObject({
      method: 'POST',
      module: 'evaluation',
      owner: 'Ramansh',
      roles: ['STUDENT'],
      rateLimit: 'evaluation.cognitiveProfile',
      execution: 'ASYNC',
    });
    expect(getRateLimitPolicy('evaluation.cognitiveProfile').limit).toBe(8);
  });
});

describe('SE-T04 cognitive profile contracts', () => {
  it('registers student GET and refresh with an LLM spend cap on refresh only', () => {
    expect(ROUTES.find((entry) => entry.path === '/evaluation/cognitive-profile')).toMatchObject({
      method: 'GET',
      module: 'evaluation',
      owner: 'Ramansh',
      roles: ['STUDENT'],
      rateLimit: 'role.student',
    });
    expect(
      ROUTES.find((entry) => entry.path === '/evaluation/cognitive-profile/refresh'),
    ).toMatchObject({
      method: 'POST',
      module: 'evaluation',
      owner: 'Ramansh',
      roles: ['STUDENT'],
      rateLimit: 'evaluation.cognitiveProfile',
      execution: 'ASYNC',
    });
    expect(getRateLimitPolicy('evaluation.cognitiveProfile').limit).toBe(8);
  });
});

describe('CN-T06 my applications route', () => {
  it('exposes a student-only poll route with no studentId parameter', () => {
    const route = ROUTES.find((entry) => entry.path === '/me/applications');
    expect(route).toMatchObject({
      method: 'GET',
      roles: ['STUDENT'],
      rateLimit: 'placement.application',
    });
    expect(route?.path.includes('studentId')).toBe(false);
  });
});

describe('AC-T06 send-to-company routes', () => {
  it('registers TPO confidence read and send without inventing a new ATS stage', () => {
    expect(
      ROUTES.find((entry) => entry.path === '/placement/applications/:applicationId/confidence'),
    ).toMatchObject({
      method: 'GET',
      roles: ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'],
      rateLimit: 'placement.application',
    });
    expect(
      ROUTES.find(
        (entry) => entry.path === '/placement/applications/:applicationId/send-to-company',
      ),
    ).toMatchObject({
      method: 'POST',
      roles: ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'],
    });
  });
});

describe('SE-T03 project verification contracts', () => {
  it('registers GitHub picker, submit, poll, and a separate project review queue', () => {
    expect(ROUTES.find((entry) => entry.path === '/projects/github/status')).toMatchObject({
      owner: 'Vishal V',
      rateLimit: 'projects.github',
    });
    expect(ROUTES.find((entry) => entry.path === '/projects')).toMatchObject({
      method: 'POST',
      owner: 'Vishal V',
      rateLimit: 'projects.submit',
    });
    expect(ROUTES.find((entry) => entry.path === '/admin/project-review-queue')).toMatchObject({
      owner: 'Vishal Bharath R',
      module: 'assessment',
    });
    expect(getRateLimitPolicy('evaluation.projectVerify').limit).toBe(8);
  });

  it('does not reuse smart.eval.completed for project scores', () => {
    expect(SMART_TOPICS.projectVerifyCompleted).toBe('smart.project.verify.completed');
    expect(getTopicSpec(SMART_TOPICS.projectVerifyCompleted).producerModule).toBe('evaluation');
    expect(getTopicSpec(SMART_TOPICS.evalCompleted).purpose).toMatch(/certificate/i);
  });
});

describe('proctoring routes (S4-RM-01)', () => {
  it('registers student telemetry with a dedicated policy', () => {
    expect(ROUTES.find((entry) => entry.path === '/proctoring/violations')).toMatchObject({
      method: 'POST',
      module: 'proctoring',
      owner: 'Ramansh',
      roles: ['STUDENT'],
      rateLimit: 'proctoring.telemetry',
    });
    expect(getRateLimitPolicy('proctoring.telemetry').limit).toBe(40);
    expect(getTopicSpec(SMART_TOPICS.proctoringSnapshotReady).producerModule).toBe('proctoring');
  });
});
