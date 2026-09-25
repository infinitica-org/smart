import { SKILL_DEFINITIONS, ListStudentJobsQuerySchema } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentJobsService, decodeCursor } from './student-jobs.service.js';

const STUDENT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INSTITUTION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const [skillA, skillB] = SKILL_DEFINITIONS as [
  (typeof SKILL_DEFINITIONS)[number],
  (typeof SKILL_DEFINITIONS)[number],
];

const query = (over: Record<string, unknown> = {}) => ListStudentJobsQuerySchema.parse(over);

function opening(n: number, over: Record<string, unknown> = {}) {
  return {
    id: uuid(n),
    institutionId: INSTITUTION,
    companyId: null,
    companyName: `Company ${n}`,
    roleTitle: `Role ${n}`,
    location: 'Pune',
    employmentType: 'FULL_TIME',
    workMode: null,
    status: 'OPEN',
    lastDateToApply: null,
    createdAt: new Date(Date.UTC(2026, 8, n)),
    domainCode: skillA.domain,
    minYearsExperience: null,
    maxYearsExperience: null,
    minSscPercentage: null,
    minHscPercentage: null,
    backlogsAllowed: true,
    roleDetails: 'Build things.',
    aboutCompany: 'About us',
    companyOffers: null,
    salaryDetails: null,
    requiredSkills: [] as any[],
    company: null as any,
    ...over,
  };
}
const req = (skill: typeof skillA, min: string) => ({
  minProficiency: min,
  skill: { code: skill.code, name: skill.name },
});
const verifiedCompany = {
  verificationStatus: 'APPROVED',
  deactivatedAt: null,
  heldAt: null,
  verifications: [{ reviewedAt: new Date('2026-09-01T10:00:00Z') }],
  profile: null,
};

describe('StudentJobsService (Th6-379..385)', () => {
  let prisma: any;
  let readiness: any;
  let service: StudentJobsService;
  let rows: ReturnType<typeof opening>[];
  let applied: string[];
  let saved: string[];
  let claims: any[];

  beforeEach(() => {
    rows = [];
    applied = [];
    saved = [];
    claims = [];
    prisma = {
      user: {
        findUnique: vi.fn(async () => ({
          id: STUDENT,
          institutionId: INSTITUTION,
          sscPercentage: null,
          hscPercentage: null,
          hasActiveBacklog: null,
        })),
      },
      jobOpening: {
        findMany: vi.fn(async () => rows),
        findFirst: vi.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
      },
      skillClaim: {
        findMany: vi.fn(async ({ where }: any) =>
          where.status ? claims.filter((c) => c.status === 'VERIFIED') : claims,
        ),
      },
      evidenceRecord: { findMany: vi.fn(async () => []) },
      application: {
        findMany: vi.fn(async () => applied.map((openingId) => ({ openingId }))),
        findFirst: vi.fn(async ({ where }: any) =>
          applied.includes(where.openingId) ? { id: 'app-1' } : null,
        ),
      },
      savedJob: {
        findMany: vi.fn(async () => saved.map((jobId) => ({ jobId }))),
        findUnique: vi.fn(async ({ where }: any) =>
          saved.includes(where.studentId_jobId.jobId)
            ? { jobId: where.studentId_jobId.jobId }
            : null,
        ),
        upsert: vi.fn(async () => ({})),
        deleteMany: vi.fn(async () => ({ count: 1 })),
      },
      hiddenJob: {
        findUnique: vi.fn(async () => null),
        upsert: vi.fn(async () => ({})),
        deleteMany: vi.fn(async () => ({ count: 1 })),
      },
      auditLog: { create: vi.fn(async () => ({})) },
    };
    prisma.$transaction = vi.fn(async (fn: any) => fn(prisma));
    readiness = { getSummary: vi.fn(async () => ({ recommendations: [] })) };
    service = new StudentJobsService(prisma, readiness);
  });

  const whereOf = () => JSON.stringify(prisma.jobOpening.findMany.mock.calls.at(-1)?.[0].where);

  describe('list', () => {
    it('asks only for open, unexpired, visible-company jobs at my institution, minus jobs I hid', async () => {
      await service.list(STUDENT, query());
      const where = whereOf();
      expect(where).toContain(INSTITUTION);
      expect(where).toContain('"status":"OPEN"');
      expect(where).toContain('lastDateToApply');
      expect(where).toContain('APPROVED'); // unverified companies are never listed
      expect(where).toContain('"companyId":null'); // the university's own postings are
      expect(where).toContain(`"hiddenBy":{"none":{"studentId":"${STUDENT}"}}`);
    });

    it('returns an empty result for a student with no institution', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: STUDENT, institutionId: null });
      expect(await service.list(STUDENT, query())).toEqual({
        jobs: [],
        nextCursor: null,
        counts: { strong: 0, good: 0, all: 0 },
      });
    });

    it('shows the empty state when there are no jobs', async () => {
      const result = await service.list(STUDENT, query());
      expect(result.jobs).toEqual([]);
      expect(result.counts.all).toBe(0);
    });

    it('combines type, mode and location filters, and omits work-mode-less jobs only when filtering by mode', async () => {
      await service.list(STUDENT, query());
      expect(whereOf()).not.toContain('workMode');
      await service.list(STUDENT, query({ type: 'INTERNSHIP', mode: 'REMOTE', location: 'pune' }));
      const where = whereOf();
      expect(where).toContain('"employmentType":"INTERNSHIP"');
      expect(where).toContain('"workMode":"REMOTE"');
      expect(where).toContain('"contains":"pune"');
    });

    it('puts a verified-company job first only through its fit, shows the badge only for verified companies', async () => {
      rows = [
        opening(1, { companyId: uuid(90), company: verifiedCompany }),
        opening(2), // the university's own posting
      ];
      const { jobs } = await service.list(STUDENT, query());
      const byId = new Map(jobs.map((j) => [j.id, j]));
      expect(byId.get(uuid(1))).toMatchObject({
        companyVerified: true,
        companyVerifiedAt: '2026-09-01T10:00:00.000Z',
      });
      expect(byId.get(uuid(2))).toMatchObject({ companyVerified: false, companyVerifiedAt: null });
    });

    it('sorts by fit then recency and keeps tab counts equal to the tab lists', async () => {
      claims = [
        {
          status: 'VERIFIED',
          proficiency: 'ADVANCED',
          skill: { code: skillA.code, name: skillA.name, domain: skillA.domain },
        },
        {
          status: 'VERIFIED',
          proficiency: 'BEGINNER',
          skill: { code: skillB.code, name: skillB.name, domain: skillB.domain },
        },
      ];
      rows = [
        opening(1, { requiredSkills: [req(skillA, 'INTERMEDIATE')] }), // STRONG
        opening(2, { requiredSkills: [req(skillA, 'INTERMEDIATE')] }), // STRONG, newer
        opening(3, { requiredSkills: [req(skillA, 'INTERMEDIATE'), req(skillB, 'ADVANCED')] }), // MODERATE
        opening(4, { requiredSkills: [] }), // unscored
      ];
      const all = await service.list(STUDENT, query({ fit: 'ALL' }));
      const strong = await service.list(STUDENT, query({ fit: 'STRONG' }));
      const good = await service.list(STUDENT, query({ fit: 'GOOD' }));

      expect(all.counts).toEqual({ strong: 2, good: 1, all: 4 });
      expect(strong.jobs).toHaveLength(all.counts.strong);
      expect(good.jobs).toHaveLength(all.counts.good);
      expect(all.jobs).toHaveLength(all.counts.all);
      expect(strong.jobs.map((j) => j.fit?.band)).toEqual(['STRONG', 'STRONG']);
      expect(strong.jobs.map((j) => j.id)).toEqual([uuid(2), uuid(1)]); // same fit: newest first
      expect(good.jobs.map((j) => j.id)).toEqual([uuid(3)]);
      // Unscored jobs appear only under All, after every scored one.
      expect(all.jobs.at(-1)?.id).toBe(uuid(4));
      expect(strong.jobs.some((j) => j.id === uuid(4))).toBe(false);
      expect(all.jobs[0]?.fit?.topReason).toContain('meets');
    });

    it('marks jobs I already applied to or saved', async () => {
      rows = [opening(1), opening(2)];
      applied = [uuid(1)];
      saved = [uuid(2)];
      const { jobs } = await service.list(STUDENT, query());
      const byId = new Map(jobs.map((j) => [j.id, j]));
      expect(byId.get(uuid(1))).toMatchObject({ applied: true, saved: false });
      expect(byId.get(uuid(2))).toMatchObject({ applied: false, saved: true });
    });

    it('drops jobs whose academic minimums the student misses', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: STUDENT,
        institutionId: INSTITUTION,
        sscPercentage: 60,
        hscPercentage: null,
        hasActiveBacklog: null,
      });
      rows = [opening(1, { minSscPercentage: 75 }), opening(2)];
      expect((await service.list(STUDENT, query())).jobs.map((j) => j.id)).toEqual([uuid(2)]);
    });

    it('paginates with a stable cursor: no repeats, no gaps, same order as one big page', async () => {
      rows = Array.from({ length: 7 }, (_, i) => opening(i + 1));
      const full = (await service.list(STUDENT, query({ limit: 50 }))).jobs.map((j) => j.id);

      const seen: string[] = [];
      let cursor: string | undefined;
      for (let guard = 0; guard < 10; guard += 1) {
        const page = await service.list(STUDENT, query({ limit: 3, cursor }));
        seen.push(...page.jobs.map((j) => j.id));
        if (!page.nextCursor) break;
        cursor = page.nextCursor;
      }
      expect(seen).toEqual(full);
      expect(new Set(seen).size).toBe(7);
    });

    it('stays stable when a job is added between pages', async () => {
      rows = Array.from({ length: 5 }, (_, i) => opening(i + 1));
      const first = await service.list(STUDENT, query({ limit: 2 }));
      rows = [opening(9), ...rows]; // a newer job arrives
      const second = await service.list(
        STUDENT,
        query({ limit: 2, cursor: first.nextCursor ?? undefined }),
      );
      expect(second.jobs.map((j) => j.id)).not.toContain(first.jobs[0]?.id);
      expect(second.jobs.map((j) => j.id)).not.toContain(first.jobs[1]?.id);
    });

    it('rejects a malformed cursor with 422 and a field error', async () => {
      await expect(service.list(STUDENT, query({ cursor: 'garbage' }))).rejects.toMatchObject({
        status: 422,
      });
      expect(() => decodeCursor('garbage')).toThrow();
    });
  });

  describe('query validation (Th6-380)', () => {
    it('accepts the shared enums and rejects unknown values (422 via the schema)', () => {
      expect(
        ListStudentJobsQuerySchema.safeParse({ type: 'FULL_TIME', mode: 'HYBRID', fit: 'GOOD' })
          .success,
      ).toBe(true);
      expect(ListStudentJobsQuerySchema.safeParse({ type: 'WEEKEND' }).success).toBe(false);
      expect(ListStudentJobsQuerySchema.safeParse({ mode: 'MOON' }).success).toBe(false);
      expect(ListStudentJobsQuerySchema.safeParse({ fit: 'STRETCH' }).success).toBe(false);
      expect(ListStudentJobsQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
      expect(ListStudentJobsQuerySchema.parse({}).fit).toBe('ALL');
    });
  });

  describe('detail (Th6-382/383)', () => {
    it('404s a job that is not visible to the student (other institution, hidden company, unknown, bad id)', async () => {
      await expect(service.detail(STUDENT, uuid(404))).rejects.toMatchObject({ status: 404 });
      await expect(service.detail(STUDENT, 'not-a-uuid')).rejects.toMatchObject({ status: 404 });
      expect(JSON.stringify(prisma.jobOpening.findFirst.mock.calls[0]?.[0].where)).toContain(
        INSTITUTION,
      );
    });

    it('404s a closed job unless the student applied to or saved it, then shows "no longer accepting"', async () => {
      rows = [opening(1, { status: 'CLOSED' })];
      await expect(service.detail(STUDENT, uuid(1))).rejects.toMatchObject({ status: 404 });
      saved = [uuid(1)];
      expect(await service.detail(STUDENT, uuid(1))).toMatchObject({
        acceptingApplications: false,
        saved: true,
      });
      saved = [];
      applied = [uuid(1)];
      expect(await service.detail(STUDENT, uuid(1))).toMatchObject({
        acceptingApplications: false,
        applied: true,
        applicationId: 'app-1',
      });
    });

    it('treats an expired open job like a closed one', async () => {
      rows = [opening(1, { lastDateToApply: new Date('2020-01-01') })];
      await expect(service.detail(STUDENT, uuid(1))).rejects.toMatchObject({ status: 404 });
    });

    it('lists requirements with met / partial / missing and links each gap to its recommendation', async () => {
      claims = [
        {
          status: 'VERIFIED',
          proficiency: 'ADVANCED',
          skill: { code: skillA.code, name: skillA.name, domain: skillA.domain },
        },
      ];
      rows = [
        opening(1, {
          requiredSkills: [req(skillA, 'BEGINNER'), req(skillB, 'INTERMEDIATE')],
        }),
      ];
      readiness.getSummary.mockResolvedValue({
        recommendations: [
          {
            skillCode: skillB.code,
            optional: false,
            title: 'Verify this skill',
            href: `/skills/verify?skill=${skillB.code}`,
          },
        ],
      });
      const detail = await service.detail(STUDENT, uuid(1));
      const a = detail.requirements.find((r) => r.skillCode === skillA.code);
      const b = detail.requirements.find((r) => r.skillCode === skillB.code);
      expect(b).toMatchObject({
        importance: 'MANDATORY',
        status: 'MISSING',
        requiredProficiency: 'INTERMEDIATE',
        studentProficiency: null,
        action: { label: 'Verify this skill', href: `/skills/verify?skill=${skillB.code}` },
      });
      expect(['MET', 'PARTIAL']).toContain(a?.status);
      expect(detail.whyItMatches[0]).toContain('meets');
      expect(detail.description).toBe('Build things.');
    });

    it('falls back to the Skills page when there is no recommendation for a gap', async () => {
      rows = [opening(1, { requiredSkills: [req(skillA, 'INTERMEDIATE')] })];
      const detail = await service.detail(STUDENT, uuid(1));
      expect(detail.requirements[0]?.action).toEqual({
        label: 'Add or verify this skill',
        href: '/skills',
      });
    });
  });

  describe('saved (Th6-384)', () => {
    it('saves idempotently and never for a job I cannot see', async () => {
      rows = [opening(1)];
      await service.save(STUDENT, uuid(1));
      await service.save(STUDENT, uuid(1));
      expect(prisma.savedJob.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.savedJob.upsert.mock.calls[0]?.[0].update).toEqual({});
      await expect(service.save(STUDENT, uuid(404))).rejects.toMatchObject({ status: 404 });
    });

    it('unsaves idempotently', async () => {
      prisma.savedJob.deleteMany.mockResolvedValue({ count: 0 });
      expect(await service.unsave(STUDENT, uuid(1))).toEqual({ jobId: uuid(1), active: false });
    });

    it('lists only my saved jobs, scoped to my institution', async () => {
      prisma.savedJob.findMany.mockResolvedValueOnce([{ job: opening(1) }]);
      const { jobs } = await service.listSaved(STUDENT);
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.saved).toBe(true);
      const where = JSON.stringify(prisma.savedJob.findMany.mock.calls[0]?.[0].where);
      expect(where).toContain(STUDENT);
      expect(where).toContain(INSTITUTION);
    });

    it('shows the empty state for no saved jobs', async () => {
      prisma.savedJob.findMany.mockResolvedValueOnce([]);
      expect(await service.listSaved(STUDENT)).toEqual({ jobs: [] });
    });
  });

  describe('hidden (Th6-385)', () => {
    it('hides with an optional reason and audits before/after', async () => {
      rows = [opening(1)];
      await service.hide(STUDENT, uuid(1), { reason: 'Not relevant' });
      expect(prisma.hiddenJob.upsert.mock.calls[0]?.[0].create).toMatchObject({
        reason: 'Not relevant',
      });
      expect(prisma.auditLog.create.mock.calls[0]?.[0].data).toMatchObject({
        action: 'job.hidden',
        actorId: STUDENT,
      });
    });

    it('an identical repeat changes and audits nothing', async () => {
      rows = [opening(1)];
      prisma.hiddenJob.findUnique.mockResolvedValue({ reason: null });
      await service.hide(STUDENT, uuid(1), {});
      expect(prisma.hiddenJob.upsert).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('404s hiding a job the student cannot see, and undo audits only a real change', async () => {
      await expect(service.hide(STUDENT, uuid(404), {})).rejects.toMatchObject({ status: 404 });
      await service.unhide(STUDENT, uuid(1));
      expect(prisma.auditLog.create.mock.calls[0]?.[0].data.action).toBe('job.unhidden');
      prisma.auditLog.create.mockClear();
      prisma.hiddenJob.deleteMany.mockResolvedValue({ count: 0 });
      await service.unhide(STUDENT, uuid(1));
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
