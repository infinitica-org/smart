import { randomUUID } from 'node:crypto';
import { StudentReadinessSummarySchema } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildEvidence,
  buildIdentity,
  buildOpeningReadiness,
  buildOpeningReadinessList,
  buildProficiency,
  buildReadinessSummary,
  buildRecommendations,
  buildRoleReadiness,
  buildSkillDemonstration,
  ReadinessService,
  requiredEvidenceFor,
  undisclosableSkillCodes,
  type ClaimInput,
  type EvidenceInput,
  type OpeningInput,
  type ReadinessInputs,
} from './readiness.service.js';

const PY = 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT';
const SQL = 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION';
const API = 'RESTFUL_GRAPHQL_API_DESIGN';
const DOCKER = 'CONTAINERIZATION_ORCHESTRATION';
const NOSQL = 'NOSQL_DATABASE_ENGINEERING';

const claim = (code: string, status = 'VERIFIED', proficiency = 'INTERMEDIATE'): ClaimInput => ({
  status,
  proficiency,
  skill: { code, name: code },
});

const evidence = (over: Partial<EvidenceInput> = {}): EvidenceInput => ({
  evidenceType: 'PROJECT',
  relatedSkillCodes: [PY],
  verificationStatus: 'VERIFIED',
  sourceEntityId: null,
  ...over,
});

const opening = (
  skills: { code: string; min: string }[],
  over: Partial<OpeningInput> = {},
): OpeningInput => ({
  id: randomUUID(),
  roleTitle: 'Backend Engineer',
  companyName: 'Acme',
  location: 'Pune',
  requiredSkills: skills.map((s) => ({ minProficiency: s.min, skill: { code: s.code } })),
  ...over,
});

const inputs = (over: Partial<ReadinessInputs> = {}): ReadinessInputs => ({
  emailVerified: false,
  onboardingDetails: null,
  targetRoleId: null,
  claims: [],
  evidence: [],
  ndaProjectIds: [],
  openings: [],
  ...over,
});

const linkedin = {
  socialVerification: { linkedin: { verified: true, verifiedAt: '2026-09-01T00:00:00.000Z' } },
};
const github = { socialVerification: { github: { verified: true } } };

describe('I332 identity status', () => {
  it('is NOT_STARTED with no signals', () => {
    const identity = buildIdentity({ emailVerified: false, onboardingDetails: null });
    expect(identity.status).toBe('NOT_STARTED');
    expect(identity.signals.every((s) => !s.verified)).toBe(true);
  });

  it('is VERIFIED when email and a provider signal are verified, with the provider timestamp', () => {
    const identity = buildIdentity({ emailVerified: true, onboardingDetails: linkedin });
    expect(identity.status).toBe('VERIFIED');
    expect(identity.signals.find((s) => s.code === 'LINKEDIN')).toMatchObject({
      verified: true,
      verifiedAt: '2026-09-01T00:00:00.000Z',
    });
  });

  it('accepts GitHub as the provider signal', () => {
    expect(buildIdentity({ emailVerified: true, onboardingDetails: github }).status).toBe(
      'VERIFIED',
    );
  });

  it('is not verified by email alone or by a provider alone', () => {
    expect(buildIdentity({ emailVerified: true, onboardingDetails: null }).status).toBe(
      'NOT_STARTED',
    );
    expect(buildIdentity({ emailVerified: false, onboardingDetails: linkedin }).status).toBe(
      'NOT_STARTED',
    );
  });

  it('never claims a provider is verified when its record says verified: false', () => {
    const identity = buildIdentity({
      emailVerified: true,
      onboardingDetails: { socialVerification: { linkedin: { verified: false } } },
    });
    expect(identity.status).toBe('NOT_STARTED');
  });

  it('survives malformed stored data', () => {
    for (const bad of [
      'text',
      42,
      [],
      { socialVerification: 'nope' },
      { socialVerification: { linkedin: 7 } },
    ]) {
      expect(buildIdentity({ emailVerified: true, onboardingDetails: bad }).status).toBe(
        'NOT_STARTED',
      );
    }
  });

  it('only ever reports the statuses it can actually derive', () => {
    const identity = buildIdentity({ emailVerified: true, onboardingDetails: linkedin });
    expect(identity.supportedStatuses).toEqual(['NOT_STARTED', 'VERIFIED']);
    expect(identity.rule).toMatch(/pending and failed/i);
  });
});

describe('I333 evidence completeness (blueprint requirements)', () => {
  it('counts evidence by verification status', () => {
    const result = buildEvidence(
      [],
      [
        evidence({ verificationStatus: 'VERIFIED' }),
        evidence({ verificationStatus: 'VERIFIED' }),
        evidence({ verificationStatus: 'PROVISIONAL' }),
        evidence({ verificationStatus: 'PENDING' }),
        evidence({ verificationStatus: 'DISPUTED' }),
        evidence({ verificationStatus: 'REJECTED' }),
        evidence({ verificationStatus: 'EXPIRED' }),
      ],
    );
    expect(result.counts).toEqual({
      total: 7,
      verified: 2,
      provisional: 1,
      pending: 1,
      disputedOrRejected: 2,
      expired: 1,
    });
  });

  it('has nothing to measure until a skill is verified (NO_DATA, no score)', () => {
    for (const claims of [[], [claim(PY, 'DECLARED', 'BEGINNER')]]) {
      const result = buildEvidence(claims, [evidence()]);
      expect(result).toMatchObject({
        availability: 'NO_DATA',
        completeness: null,
        requirements: [],
      });
      expect(result.reason).toMatch(/verify a skill/i);
    }
  });

  it('takes the required evidence from the skill blueprint: none up to PROFICIENT', () => {
    for (const level of ['BEGINNER', 'INTERMEDIATE', 'PROFICIENT']) {
      expect(requiredEvidenceFor(PY, level as never)).toEqual([]);
      const result = buildEvidence([claim(PY, 'VERIFIED', level)], []);
      expect(result).toMatchObject({
        availability: 'AVAILABLE',
        completeness: { required: 0, available: 0, percent: 100 },
        requirements: [],
      });
      expect(result.reason).toMatch(/no evidence is required/i);
    }
  });

  it('requires real-world application evidence at ADVANCED for skills whose blueprint says so', () => {
    expect(requiredEvidenceFor(SQL, 'ADVANCED')).toEqual(['REAL_WORLD_APPLICATION']);

    const missing = buildEvidence([claim(SQL, 'VERIFIED', 'ADVANCED')], []);
    expect(missing.completeness).toEqual({ required: 1, available: 0, percent: 0 });
    expect(missing.requirements[0]).toMatchObject({
      skillCode: SQL,
      level: 'ADVANCED',
      requirement: 'REAL_WORLD_APPLICATION',
      met: false,
    });

    const met = buildEvidence(
      [claim(SQL, 'VERIFIED', 'ADVANCED')],
      [evidence({ relatedSkillCodes: [SQL] })],
    );
    expect(met.completeness).toEqual({ required: 1, available: 1, percent: 100 });
  });

  it('follows each skill’s own blueprint: Python needs only the interview gate at ADVANCED', () => {
    expect(requiredEvidenceFor(PY, 'ADVANCED')).toEqual([]);
    expect(buildEvidence([claim(PY, 'VERIFIED', 'ADVANCED')], []).completeness).toEqual({
      required: 0,
      available: 0,
      percent: 100,
    });
  });

  it('requires a substantial project as well at PROFESSIONAL', () => {
    expect(requiredEvidenceFor(PY, 'PROFESSIONAL')).toEqual([
      'REAL_WORLD_APPLICATION',
      'SUBSTANTIAL_APPLICATION',
    ]);

    // Work experience satisfies "real-world", but only a project satisfies "substantial".
    const workOnly = buildEvidence(
      [claim(PY, 'VERIFIED', 'PROFESSIONAL')],
      [evidence({ evidenceType: 'WORK_EXPERIENCE' })],
    );
    expect(workOnly.completeness).toEqual({ required: 2, available: 1, percent: 50 });

    const withProject = buildEvidence([claim(PY, 'VERIFIED', 'PROFESSIONAL')], [evidence()]);
    expect(withProject.completeness).toEqual({ required: 2, available: 2, percent: 100 });
  });

  it('does not count provisional, pending, rejected, self-reported or unrelated evidence', () => {
    const claims = [claim(SQL, 'VERIFIED', 'ADVANCED')];
    const forSql = (over: Partial<EvidenceInput>) =>
      evidence({ relatedSkillCodes: [SQL], ...over });
    for (const row of [
      forSql({ verificationStatus: 'PROVISIONAL' }),
      forSql({ verificationStatus: 'PENDING' }),
      forSql({ verificationStatus: 'REJECTED' }),
      forSql({ verificationStatus: 'EXPIRED' }),
      forSql({ evidenceType: 'SELF_REPORT' }),
      evidence({ relatedSkillCodes: [PY] }),
    ]) {
      expect(buildEvidence(claims, [row]).completeness?.available).toBe(0);
    }
  });

  it('measures across every verified skill and ignores declared ones', () => {
    const result = buildEvidence(
      [
        claim(SQL, 'VERIFIED', 'ADVANCED'),
        claim(DOCKER, 'VERIFIED', 'ADVANCED'),
        claim(API, 'DECLARED', 'BEGINNER'),
      ],
      [evidence({ relatedSkillCodes: [SQL] })],
    );
    expect(result.completeness).toEqual({ required: 2, available: 1, percent: 50 });
    expect(result.requirements.map((r) => [r.skillCode, r.met])).toEqual([
      [SQL, true],
      [DOCKER, false],
    ]);
  });

  it('stays independent of proficiency', () => {
    const low = buildEvidence([claim(SQL, 'VERIFIED', 'ADVANCED')], []);
    expect(low.completeness?.percent).toBe(0);
    expect(buildProficiency([claim(SQL, 'VERIFIED', 'ADVANCED')]).byLevel).toEqual({ ADVANCED: 1 });
  });
});

describe('I334 skill demonstration', () => {
  it('is DEMONSTRATED by verified project or work-experience evidence for that skill', () => {
    const rows = buildSkillDemonstration([claim(PY)], [evidence()], new Set());
    expect(rows.skills[0]).toMatchObject({
      demonstration: 'DEMONSTRATED',
      verifiedEvidenceCount: 1,
    });

    const work = buildSkillDemonstration(
      [claim(PY)],
      [evidence({ evidenceType: 'WORK_EXPERIENCE' })],
      new Set(),
    );
    expect(work.skills[0]?.demonstration).toBe('DEMONSTRATED');
  });

  it('is PROVISIONAL when the only qualifying evidence is provisional', () => {
    const rows = buildSkillDemonstration(
      [claim(PY)],
      [evidence({ verificationStatus: 'PROVISIONAL' })],
      new Set(),
    );
    expect(rows.skills[0]).toMatchObject({
      demonstration: 'PROVISIONAL',
      provisionalEvidenceCount: 1,
    });
  });

  it('is NOT_DEMONSTRATED without qualifying evidence', () => {
    const cases: EvidenceInput[][] = [
      [],
      [evidence({ verificationStatus: 'PENDING' })],
      [evidence({ verificationStatus: 'REJECTED' })],
      [evidence({ evidenceType: 'SELF_REPORT' })],
      [evidence({ evidenceType: 'CREDENTIAL' })],
      [evidence({ relatedSkillCodes: [SQL] })],
    ];
    for (const rows of cases) {
      expect(buildSkillDemonstration([claim(PY)], rows, new Set()).skills[0]?.demonstration).toBe(
        'NOT_DEMONSTRATED',
      );
    }
  });

  it('summarises counts across skills', () => {
    const result = buildSkillDemonstration(
      [claim(PY), claim(SQL), claim(API)],
      [evidence(), evidence({ relatedSkillCodes: [SQL], verificationStatus: 'PROVISIONAL' })],
      new Set(),
    );
    expect(result.counts).toEqual({ demonstrated: 1, provisional: 1, notDemonstrated: 1 });
  });

  it('returns nothing for a student with no skills', () => {
    expect(buildSkillDemonstration([], [evidence()], new Set())).toEqual({
      skills: [],
      counts: { demonstrated: 0, provisional: 0, notDemonstrated: 0 },
    });
  });

  it('flags evidence that is fully under NDA as undisclosable', () => {
    const nda = evidence({ sourceEntityId: 'proj-nda', relatedSkillCodes: [PY, SQL] });
    const other = evidence({ sourceEntityId: 'proj-public', relatedSkillCodes: [API] });
    const codes = undisclosableSkillCodes([nda, other], ['proj-nda']);
    expect([...codes].sort()).toEqual([PY, SQL].sort());

    const rows = buildSkillDemonstration([claim(PY), claim(API)], [nda, other], codes);
    expect(rows.skills.find((s) => s.skillCode === PY)?.evidenceUndisclosable).toBe(true);
    expect(rows.skills.find((s) => s.skillCode === API)?.evidenceUndisclosable).toBe(false);
  });

  it('only treats PROJECT evidence linked to an NDA project as undisclosable', () => {
    const nonProject = evidence({ evidenceType: 'WORK_EXPERIENCE', sourceEntityId: 'proj-nda' });
    expect(undisclosableSkillCodes([nonProject], ['proj-nda']).size).toBe(0);
  });
});

describe('I335 completeness is separate from proficiency', () => {
  it('reports proficiency from verified claims only, never a declared placeholder level', () => {
    const claims = [
      claim(PY, 'VERIFIED', 'ADVANCED'),
      claim(SQL, 'VERIFIED', 'INTERMEDIATE'),
      claim(API, 'DECLARED', 'BEGINNER'),
    ];
    expect(buildProficiency(claims)).toEqual({
      verifiedSkillCount: 2,
      declaredSkillCount: 1,
      byLevel: { ADVANCED: 1, INTERMEDIATE: 1 },
    });
    const rows = buildSkillDemonstration(claims, [], new Set()).skills;
    expect(rows.find((r) => r.skillCode === API)?.proficiency).toBeNull();
    expect(rows.find((r) => r.skillCode === PY)?.proficiency).toBe('ADVANCED');
  });

  it('keeps a high proficiency and a low completeness as two separate values', () => {
    const summary = buildReadinessSummary(inputs({ claims: [claim(SQL, 'VERIFIED', 'ADVANCED')] }));
    expect(summary.proficiency.byLevel).toEqual({ ADVANCED: 1 });
    expect(summary.evidence.completeness).toEqual({ required: 1, available: 0, percent: 0 });
    expect(summary.skillDemonstration.skills[0]).toMatchObject({
      proficiency: 'ADVANCED',
      demonstration: 'NOT_DEMONSTRATED',
    });
  });

  it('handles the empty state', () => {
    expect(buildProficiency([])).toEqual({
      verifiedSkillCount: 0,
      declaredSkillCount: 0,
      byLevel: {},
    });
  });
});

describe('I336 role readiness', () => {
  it('has no target role when none is chosen or the id is unknown', () => {
    for (const id of [null, 'NOT_A_ROLE']) {
      const role = buildRoleReadiness(id, [], [], new Set());
      expect(role).toMatchObject({
        availability: 'NO_TARGET_ROLE',
        targetRole: null,
        readinessPercent: null,
        skills: [],
        coverage: null,
      });
    }
  });

  it('never scores a catalog role, because it has no employer-defined minimum proficiency', () => {
    const role = buildRoleReadiness('BACKEND_DEVELOPER', [claim(PY)], [evidence()], new Set());
    expect(role.availability).toBe('NOT_CONFIGURED');
    expect(role.readinessPercent).toBeNull();
    expect(role.reason).toMatch(/employer-defined minimum proficiency/);
    expect(role.targetRole).toEqual({ roleId: 'BACKEND_DEVELOPER', name: 'Backend Developer' });
    expect(role.skills).toHaveLength(6);
    expect(role.coverage).toEqual({
      recommendedTotal: 4,
      recommendedVerified: 1,
      recommendedDemonstrated: 1,
      optionalTotal: 2,
      optionalVerified: 0,
    });
  });
});

describe('I336 readiness for a specific open role (employer-defined minimums)', () => {
  it('has no score for a role that lists no required skills', () => {
    const result = buildOpeningReadiness(opening([]), [claim(PY)], []);
    expect(result).toMatchObject({
      availability: 'NOT_CONFIGURED',
      readinessPercent: null,
      requiredCount: 0,
      skills: [],
    });
    expect(result.reason).toMatch(/does not list any required skills/i);
  });

  it('classifies each required skill against the employer minimum', () => {
    const result = buildOpeningReadiness(
      opening([
        { code: PY, min: 'INTERMEDIATE' },
        { code: SQL, min: 'ADVANCED' },
        { code: API, min: 'BEGINNER' },
        { code: DOCKER, min: 'BEGINNER' },
      ]),
      [
        claim(PY, 'VERIFIED', 'ADVANCED'),
        claim(SQL, 'VERIFIED', 'BEGINNER'),
        claim(API, 'DECLARED', 'BEGINNER'),
      ],
      [],
    );
    const status = (code: string) => result.skills.find((s) => s.skillCode === code)?.status;
    expect(status(PY)).toBe('MEETS_MINIMUM');
    expect(status(SQL)).toBe('BELOW_MINIMUM');
    expect(status(API)).toBe('NOT_VERIFIED');
    expect(status(DOCKER)).toBe('NOT_HELD');
  });

  it('shows only a verified proficiency, never a declared placeholder', () => {
    const result = buildOpeningReadiness(
      opening([{ code: API, min: 'BEGINNER' }]),
      [claim(API, 'DECLARED', 'BEGINNER')],
      [],
    );
    expect(result.skills[0]?.studentProficiency).toBeNull();
  });

  it('is ready in a skill only with the minimum proficiency AND its required evidence', () => {
    const job = opening([{ code: SQL, min: 'ADVANCED' }]);
    const claims = [claim(SQL, 'VERIFIED', 'ADVANCED')];

    const noEvidence = buildOpeningReadiness(job, claims, []);
    expect(noEvidence.skills[0]).toMatchObject({
      status: 'MEETS_MINIMUM',
      evidenceRequired: 1,
      evidenceMet: 0,
      ready: false,
    });
    expect(noEvidence.readinessPercent).toBe(0);

    const withEvidence = buildOpeningReadiness(job, claims, [
      evidence({ relatedSkillCodes: [SQL] }),
    ]);
    expect(withEvidence.skills[0]).toMatchObject({ evidenceMet: 1, ready: true });
    expect(withEvidence.readinessPercent).toBe(100);
  });

  it('needs no evidence for skills whose minimum level requires none', () => {
    const result = buildOpeningReadiness(
      opening([{ code: PY, min: 'INTERMEDIATE' }]),
      [claim(PY, 'VERIFIED', 'INTERMEDIATE')],
      [],
    );
    expect(result.skills[0]).toMatchObject({ evidenceRequired: 0, ready: true });
    expect(result.readinessPercent).toBe(100);
  });

  it('is the share of required skills that are ready, with no weights', () => {
    const result = buildOpeningReadiness(
      opening([
        { code: PY, min: 'INTERMEDIATE' },
        { code: SQL, min: 'INTERMEDIATE' },
        { code: API, min: 'INTERMEDIATE' },
      ]),
      [claim(PY), claim(SQL), claim(API, 'DECLARED', 'BEGINNER')],
      [],
    );
    expect(result).toMatchObject({ requiredCount: 3, readyCount: 2, readinessPercent: 67 });
  });

  it('counts a skill held above the minimum as meeting it', () => {
    const result = buildOpeningReadiness(
      opening([{ code: PY, min: 'BEGINNER' }]),
      [claim(PY, 'VERIFIED', 'PROFESSIONAL')],
      [],
    );
    expect(result.skills[0]?.status).toBe('MEETS_MINIMUM');
  });

  it('orders roles best first, keeps the given order on ties, and caps the list', () => {
    const roles = [
      opening([{ code: SQL, min: 'BEGINNER' }], { roleTitle: 'low' }),
      opening([{ code: PY, min: 'BEGINNER' }], { roleTitle: 'high-a' }),
      opening([{ code: PY, min: 'BEGINNER' }], { roleTitle: 'high-b' }),
      opening([], { roleTitle: 'unscored' }),
      ...Array.from({ length: 5 }, (_, i) =>
        opening([{ code: SQL, min: 'BEGINNER' }], { roleTitle: `filler-${i}` }),
      ),
    ];
    const list = buildOpeningReadinessList(roles, [claim(PY)], []);

    expect(list).toHaveLength(5);
    expect(list.slice(0, 2).map((r) => r.roleTitle)).toEqual(['high-a', 'high-b']);
    expect(list[0]?.readinessPercent).toBe(100);
  });

  it('gives no roles when none are open', () => {
    expect(buildOpeningReadinessList([], [claim(PY)], [])).toEqual([]);
  });
});

describe('I338 optional evidence never penalises', () => {
  it('marks optional role skills as not affecting readiness', () => {
    const role = buildRoleReadiness('BACKEND_DEVELOPER', [], [], new Set());
    for (const skill of role.skills) {
      expect(skill.affectsReadiness).toBe(skill.requirement === 'RECOMMENDED');
    }
    expect(role.skills.find((s) => s.skillCode === NOSQL)?.affectsReadiness).toBe(false);
  });

  it('gives the same recommended-skill coverage whether or not optional skills are held', () => {
    const without = buildRoleReadiness('BACKEND_DEVELOPER', [claim(PY)], [], new Set());
    const withOptional = buildRoleReadiness(
      'BACKEND_DEVELOPER',
      [claim(PY), claim(NOSQL)],
      [],
      new Set(),
    );
    expect(without.coverage?.recommendedVerified).toBe(withOptional.coverage?.recommendedVerified);
    expect(without.coverage?.recommendedTotal).toBe(withOptional.coverage?.recommendedTotal);
    expect(without.readinessPercent).toBe(withOptional.readinessPercent);
  });

  it('never marks an optional recommendation HIGH priority', () => {
    const summary = buildReadinessSummary(
      inputs({
        emailVerified: true,
        onboardingDetails: linkedin,
        targetRoleId: 'BACKEND_DEVELOPER',
      }),
    );
    const optional = summary.recommendations.filter((r) => r.optional);
    expect(optional.length).toBeGreaterThan(0);
    expect(optional.every((r) => r.priority === 'LOW')).toBe(true);
  });
});

describe('I337 recommendations', () => {
  const identityVerified = buildIdentity({ emailVerified: true, onboardingDetails: linkedin });
  const identityMissing = buildIdentity({ emailVerified: false, onboardingDetails: null });

  const recsFor = (over: Partial<ReadinessInputs>, identity = identityVerified) => {
    const i = inputs(over);
    const undisclosable = undisclosableSkillCodes(i.evidence, i.ndaProjectIds);
    return buildRecommendations({
      identity,
      evidence: buildEvidence(i.claims, i.evidence),
      demonstration: buildSkillDemonstration(i.claims, i.evidence, undisclosable),
      role: buildRoleReadiness(i.targetRoleId, i.claims, i.evidence, undisclosable),
      openings: buildOpeningReadinessList(i.openings, i.claims, i.evidence),
    });
  };

  it('recommends verifying identity only when it is not verified', () => {
    expect(recsFor({}, identityMissing).some((r) => r.kind === 'VERIFY_IDENTITY')).toBe(true);
    expect(recsFor({}, identityVerified).some((r) => r.kind === 'VERIFY_IDENTITY')).toBe(false);
  });

  it('recommends adding a missing recommended role skill at HIGH priority', () => {
    const rec = recsFor({ targetRoleId: 'BACKEND_DEVELOPER' }).find((r) => r.skillCode === PY);
    expect(rec).toMatchObject({
      kind: 'ADD_ROLE_SKILL',
      priority: 'HIGH',
      optional: false,
      href: '/skills',
    });
  });

  it('recommends verifying a declared recommended skill', () => {
    const rec = recsFor({
      targetRoleId: 'BACKEND_DEVELOPER',
      claims: [claim(PY, 'DECLARED', 'BEGINNER')],
    }).find((r) => r.skillCode === PY);
    expect(rec).toMatchObject({ kind: 'VERIFY_SKILL', priority: 'HIGH', href: '/assessments' });
  });

  it('recommends evidence for a verified skill that nothing demonstrates', () => {
    const rec = recsFor({ targetRoleId: 'BACKEND_DEVELOPER', claims: [claim(PY)] }).find(
      (r) => r.skillCode === PY,
    );
    expect(rec).toMatchObject({ kind: 'ADD_DEMONSTRATION_EVIDENCE', priority: 'MEDIUM' });
  });

  it('asks for required evidence at HIGH priority when the blueprint needs it and it is missing', () => {
    const rec = recsFor({ claims: [claim(SQL, 'VERIFIED', 'ADVANCED')] }).find(
      (r) => r.skillCode === SQL,
    );
    expect(rec).toMatchObject({
      kind: 'ADD_REQUIRED_EVIDENCE',
      priority: 'HIGH',
      href: '/profile?section=projects',
    });
    expect(rec?.detail).toMatch(/advanced level needs a verified real-world project/i);
  });

  it('does not ask for required evidence that is already present', () => {
    const recs = recsFor({
      claims: [claim(SQL, 'VERIFIED', 'ADVANCED')],
      evidence: [evidence({ relatedSkillCodes: [SQL] })],
    });
    expect(recs.find((r) => r.kind === 'ADD_REQUIRED_EVIDENCE')).toBeUndefined();
  });

  it('asks to finish verification when the evidence is only provisional', () => {
    const rec = recsFor({
      targetRoleId: 'BACKEND_DEVELOPER',
      claims: [claim(PY)],
      evidence: [evidence({ verificationStatus: 'PROVISIONAL' })],
    }).find((r) => r.skillCode === PY);
    expect(rec?.detail).toMatch(/provisional/i);
  });

  it('does not recommend anything for a skill that is already demonstrated', () => {
    const recs = recsFor({
      targetRoleId: 'BACKEND_DEVELOPER',
      claims: [claim(PY)],
      evidence: [evidence()],
    });
    expect(recs.find((r) => r.skillCode === PY)).toBeUndefined();
  });

  it('never asks for more evidence on a skill whose evidence is fully under NDA', () => {
    const nda = evidence({
      sourceEntityId: 'proj-nda',
      verificationStatus: 'PENDING',
      relatedSkillCodes: [SQL],
    });
    const recs = recsFor({
      targetRoleId: 'BACKEND_DEVELOPER',
      claims: [claim(SQL, 'VERIFIED', 'ADVANCED')],
      evidence: [nda],
      ndaProjectIds: ['proj-nda'],
    });
    expect(
      recs.find(
        (r) =>
          r.skillCode === SQL &&
          (r.kind === 'ADD_DEMONSTRATION_EVIDENCE' || r.kind === 'ADD_REQUIRED_EVIDENCE'),
      ),
    ).toBeUndefined();
  });

  it('suggests evidence for a verified non-role skill at LOW priority', () => {
    const rec = recsFor({ claims: [claim(DOCKER)] }).find((r) => r.skillCode === DOCKER);
    expect(rec).toMatchObject({ kind: 'ADD_DEMONSTRATION_EVIDENCE', priority: 'LOW' });
  });

  it('recommends closing the gaps for the closest open role', () => {
    const job = opening(
      [
        { code: PY, min: 'INTERMEDIATE' },
        { code: SQL, min: 'INTERMEDIATE' },
        { code: API, min: 'ADVANCED' },
        { code: DOCKER, min: 'BEGINNER' },
      ],
      { roleTitle: 'Platform Engineer', companyName: 'Initech' },
    );
    const recs = recsFor({
      openings: [job],
      claims: [
        claim(PY),
        claim(API, 'VERIFIED', 'BEGINNER'),
        claim(DOCKER, 'DECLARED', 'BEGINNER'),
      ],
      evidence: [evidence()],
    });
    const by = (code: string) => recs.find((r) => r.skillCode === code);

    expect(by(PY)).toBeUndefined(); // ready, nothing to do
    expect(by(SQL)).toMatchObject({ kind: 'ADD_ROLE_SKILL', priority: 'MEDIUM' });
    expect(by(API)).toMatchObject({ kind: 'VERIFY_SKILL', priority: 'MEDIUM' });
    expect(by(API)?.detail).toMatch(/Platform Engineer at Initech requires .* at advanced level/i);
    expect(by(DOCKER)).toMatchObject({ kind: 'VERIFY_SKILL' });
  });

  it('asks for the missing evidence when a role skill meets the minimum but lacks evidence', () => {
    const recs = recsFor({
      openings: [opening([{ code: SQL, min: 'ADVANCED' }])],
      claims: [claim(SQL, 'VERIFIED', 'ADVANCED')],
    });
    expect(recs.find((r) => r.skillCode === SQL)).toMatchObject({ kind: 'ADD_REQUIRED_EVIDENCE' });
  });

  it('gives no role-based recommendations when no open role can be scored', () => {
    const recs = recsFor({ openings: [opening([])] });
    expect(recs).toEqual([]);
  });

  it('orders by priority and caps the list', () => {
    const recs = recsFor({ targetRoleId: 'BACKEND_DEVELOPER' }, identityMissing);
    const ranks = recs.map((r) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[r.priority]);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(recs.length).toBeLessThanOrEqual(8);
  });

  it('has nothing to recommend when there are no gaps', () => {
    expect(recsFor({}, identityVerified)).toEqual([]);
  });

  it('gives one recommendation per skill', () => {
    const recs = recsFor({
      targetRoleId: 'BACKEND_DEVELOPER',
      claims: [claim(PY), claim(SQL)],
      openings: [
        opening([
          { code: PY, min: 'ADVANCED' },
          { code: DOCKER, min: 'BEGINNER' },
        ]),
      ],
    });
    const ids = recs.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('summary contract', () => {
  it('always satisfies the contract schema', () => {
    const samples = [
      inputs(),
      inputs({
        targetRoleId: 'FULL_STACK_DEVELOPER',
        claims: [claim(PY, 'VERIFIED', 'ADVANCED'), claim(SQL, 'DECLARED', 'BEGINNER')],
        evidence: [evidence()],
        openings: [opening([{ code: PY, min: 'ADVANCED' }]), opening([])],
      }),
      inputs({
        emailVerified: true,
        onboardingDetails: linkedin,
        targetRoleId: 'BACKEND_DEVELOPER',
      }),
    ];
    for (const sample of samples) {
      expect(StudentReadinessSummarySchema.safeParse(buildReadinessSummary(sample)).success).toBe(
        true,
      );
    }
  });

  it('never returns a percentage for a catalog role, whatever the input', () => {
    const samples = [
      inputs({ targetRoleId: 'BACKEND_DEVELOPER' }),
      inputs({
        targetRoleId: 'BACKEND_DEVELOPER',
        claims: [claim(PY), claim(SQL), claim(API), claim(DOCKER)],
        evidence: [evidence()],
      }),
    ];
    for (const sample of samples) {
      expect(buildReadinessSummary(sample).roleReadiness.readinessPercent).toBeNull();
    }
  });
});

describe('ReadinessService.getSummary', () => {
  let prisma: any;
  let service: ReadinessService;
  const studentId = randomUUID();
  const institutionId = randomUUID();

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          emailVerified: true,
          onboardingDetails: linkedin,
          institutionId,
        }),
      },
      candidateEvidenceProfile: {
        findUnique: vi.fn().mockResolvedValue({ targetRoleId: 'BACKEND_DEVELOPER' }),
      },
      skillClaim: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { status: 'VERIFIED', proficiency: 'ADVANCED', skill: { code: SQL, name: 'SQL' } },
          ]),
      },
      evidenceRecord: {
        findMany: vi.fn().mockResolvedValue([
          {
            evidenceType: 'PROJECT',
            relatedSkillCodes: [SQL],
            verificationStatus: 'VERIFIED',
            sourceEntityId: 'p1',
          },
        ]),
      },
      project: { findMany: vi.fn().mockResolvedValue([{ id: 'p1' }]) },
      jobOpening: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'o1',
            roleTitle: 'Backend Engineer',
            companyName: 'Acme',
            location: 'Pune',
            requiredSkills: [{ minProficiency: 'ADVANCED', skill: { code: SQL, name: 'SQL' } }],
          },
        ]),
      },
    };
    service = new ReadinessService(prisma);
  });

  it('assembles the summary from the student’s own data and their institution’s open roles', async () => {
    const summary = await service.getSummary(studentId);

    expect(summary.identity.status).toBe('VERIFIED');
    expect(summary.roleReadiness.targetRole?.roleId).toBe('BACKEND_DEVELOPER');
    expect(summary.skillDemonstration.skills[0]).toMatchObject({
      demonstration: 'DEMONSTRATED',
      evidenceUndisclosable: true,
    });
    expect(summary.evidence.completeness).toEqual({ required: 1, available: 1, percent: 100 });
    expect(summary.openingReadiness[0]).toMatchObject({ openingId: 'o1', readinessPercent: 100 });
    expect(StudentReadinessSummarySchema.safeParse(summary).success).toBe(true);
  });

  it('scopes every read to the requesting student and only asks for fully-NDA projects', async () => {
    await service.getSummary(studentId);

    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ id: studentId });
    expect(prisma.candidateEvidenceProfile.findUnique.mock.calls[0][0].where).toEqual({
      studentId,
    });
    expect(prisma.skillClaim.findMany.mock.calls[0][0].where).toEqual({ studentId });
    expect(prisma.evidenceRecord.findMany.mock.calls[0][0].where).toEqual({ studentId });
    expect(prisma.project.findMany.mock.calls[0][0].where).toEqual({
      studentId,
      ndaStatus: 'FULL',
    });
  });

  it('reads only open roles at the student’s own institution that list required skills', async () => {
    await service.getSummary(studentId);

    expect(prisma.jobOpening.findMany.mock.calls[0][0].where).toEqual({
      institutionId,
      status: 'OPEN',
      requiredSkills: { some: {} },
    });
  });

  it('does not query openings for a student with no institution', async () => {
    prisma.user.findUnique.mockResolvedValue({
      emailVerified: false,
      onboardingDetails: null,
      institutionId: null,
    });

    const summary = await service.getSummary(studentId);

    expect(prisma.jobOpening.findMany).not.toHaveBeenCalled();
    expect(summary.openingReadiness).toEqual([]);
  });

  it('handles a student with no data at all', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.candidateEvidenceProfile.findUnique.mockResolvedValue(null);
    prisma.skillClaim.findMany.mockResolvedValue([]);
    prisma.evidenceRecord.findMany.mockResolvedValue([]);
    prisma.project.findMany.mockResolvedValue([]);

    const summary = await service.getSummary(studentId);

    expect(summary.identity.status).toBe('NOT_STARTED');
    expect(summary.roleReadiness.availability).toBe('NO_TARGET_ROLE');
    expect(summary.evidence.availability).toBe('NO_DATA');
    expect(summary.skillDemonstration.skills).toEqual([]);
    expect(summary.openingReadiness).toEqual([]);
    expect(summary.evidence.counts.total).toBe(0);
  });

  it('propagates a database failure instead of returning partial data', async () => {
    prisma.skillClaim.findMany.mockRejectedValue(new Error('db down'));
    await expect(service.getSummary(studentId)).rejects.toThrow('db down');
  });

  it('returns the same result when called repeatedly (read-only, idempotent)', async () => {
    const a = await service.getSummary(studentId);
    const b = await service.getSummary(studentId);
    expect({ ...a, generatedAt: '' }).toEqual({ ...b, generatedAt: '' });
  });
});
