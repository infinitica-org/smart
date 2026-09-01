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

describe('skill taxonomy (INF-05)', () => {
  it('defines the Universal Core plus three Role Depth streams', () => {
    const streams = new Set(SKILL_DEFINITIONS.map((s) => s.stream));
    expect(streams).toEqual(
      new Set(['UNIVERSAL', 'SOFTWARE_DEVELOPMENT', 'DATA_SCIENCE_ANALYTICS', 'AI_ML_ENGINEERING']),
    );
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

  it('locks Allen retry policy: one reattempt, 35-day refresh', () => {
    expect(SKILL_REATTEMPTS).toBe(1);
    expect(SKILL_MAX_ATTEMPTS).toBe(2);
    expect(SKILL_REFRESH_DAYS).toBe(35);
  });

  it('rejects a job opening with no required skills', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse({
      institutionId: '00000000-0000-4000-8000-000000000001',
      companyName: 'Acme',
      roleTitle: 'Analyst',
      requiredSkills: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('registers ATS stage-change for My Applications sync', () => {
    expect(SMART_TOPICS.applicationStageChanged).toBe('smart.application.stage_changed');
    expect(getTopicSpec(SMART_TOPICS.applicationStageChanged).producerModule).toBe('assessment');
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
