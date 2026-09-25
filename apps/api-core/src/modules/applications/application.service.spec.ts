import { SKILL_DEFINITIONS, ApplyToJobRequestSchema } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withIdempotencyLedger } from '../company-profile/test-utils.js';
import { ApplicationService } from './application.service.js';
import { buildSnapshotRecord } from './application-snapshot.js';

const STUDENT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_STUDENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const INSTITUTION = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const JOB = '00000000-0000-4000-8000-000000000001';
const COMPANY = '11111111-1111-4111-8111-111111111111';
const APP = '99999999-9999-4999-8999-999999999999';

const [skillA] = SKILL_DEFINITIONS as [(typeof SKILL_DEFINITIONS)[number]];

const profile = { fullName: 'Aarav Sharma', skills: [], projects: [] } as any;

function job(over: Record<string, unknown> = {}) {
  return {
    id: JOB,
    institutionId: INSTITUTION,
    companyId: COMPANY,
    companyName: 'Acme Robotics',
    roleTitle: 'Backend Engineer',
    location: 'Pune',
    status: 'OPEN',
    lastDateToApply: null,
    domainCode: skillA.domain,
    minYearsExperience: null,
    maxYearsExperience: null,
    requiredSkills: [
      { minProficiency: 'INTERMEDIATE', skill: { code: skillA.code, name: skillA.name } },
    ],
    company: {
      verificationStatus: 'APPROVED',
      deactivatedAt: null,
      heldAt: null,
      verifications: [{ reviewedAt: new Date('2026-09-01T10:00:00Z') }],
    },
    ...over,
  };
}

const body = (over: Record<string, unknown> = {}) =>
  ApplyToJobRequestSchema.parse({ reviewedPreview: true, ...over });

describe('ApplicationService (APP-01)', () => {
  let apps: any[];
  let prisma: any;
  let jobRow: ReturnType<typeof job> | null;
  let publicProfile: any;
  let notifications: any;
  let outbox: any;
  let service: ApplicationService;

  beforeEach(() => {
    apps = [];
    jobRow = job();
    const ledger = withIdempotencyLedger({
      user: {
        findUnique: vi.fn(async () => ({
          id: STUDENT,
          email: 's@x.test',
          fullName: 'Aarav Sharma',
          institutionId: INSTITUTION,
        })),
        findMany: vi.fn(async () => [
          { id: 'owner-1', email: 'o@acme.test', fullName: 'Olivia Owner' },
          { id: 'rec-1', email: 'r@acme.test', fullName: 'Ravi Recruiter' },
        ]),
      },
      jobOpening: {
        findFirst: vi.fn(async () => jobRow),
        findUniqueOrThrow: vi.fn(async () => ({ companyId: COMPANY, institutionId: INSTITUTION })),
      },
      skillClaim: {
        findMany: vi.fn(async () => [
          {
            proficiency: 'ADVANCED',
            skill: { code: skillA.code, name: skillA.name, domain: skillA.domain },
          },
        ]),
      },
      workExperience: {
        findMany: vi.fn(async () => [{ id: 'we-1', documents: [{ id: 'doc-1' }] }]),
      },
      application: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.openingId_studentId) {
            return (
              apps.find(
                (a) =>
                  a.openingId === where.openingId_studentId.openingId &&
                  a.studentId === where.openingId_studentId.studentId,
              ) ?? null
            );
          }
          return apps.find((a) => a.id === where.id) ?? null;
        }),
        findUniqueOrThrow: vi.fn(async ({ where }: any) => apps.find((a) => a.id === where.id)),
        findFirst: vi.fn(
          async ({ where }: any) =>
            apps.find((a) => a.id === where.id && a.studentId === where.studentId) ?? null,
        ),
        findMany: vi.fn(async ({ where }: any) =>
          apps.filter((a) => a.studentId === where.studentId),
        ),
        create: vi.fn(async ({ data }: any) => {
          const row = {
            id: APP,
            createdAt: new Date('2026-09-25T10:00:00Z'),
            updatedAt: new Date('2026-09-25T10:00:00Z'),
            matchScore: null,
            ...data,
          };
          apps.push(row);
          return row;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          const row = apps.find(
            (a) => a.id === where.id && (!where.stage || a.stage === where.stage),
          );
          if (!row) return { count: 0 };
          Object.assign(row, data, { updatedAt: new Date('2026-09-26T10:00:00Z') });
          return { count: 1 };
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const row = apps.find((a) => a.id === where.id);
          Object.assign(row, data, { updatedAt: new Date('2026-09-26T10:00:00Z') });
          return row;
        }),
      },
      applicationSnapshot: { create: vi.fn(async () => ({})) },
      applicationStageEvent: {
        create: vi.fn(async ({ data }: any) => ({
          ...data,
          createdAt: new Date('2026-09-26T10:00:00Z'),
        })),
      },
    });
    prisma = ledger.prisma;
    publicProfile = { getForOwner: vi.fn(async () => profile) };
    notifications = {
      notifyApplicationSubmitted: vi.fn(async () => ({})),
      notifyEmployerApplicant: vi.fn(async () => ({})),
    };
    outbox = { enqueueEnvelope: vi.fn(async () => undefined) };
    service = new ApplicationService(
      prisma,
      ledger.idempotency,
      publicProfile,
      notifications,
      outbox,
    );
  });

  const stored = (over: Record<string, unknown> = {}) => ({
    id: APP,
    openingId: JOB,
    studentId: STUDENT,
    stage: 'APPLIED',
    coverNote: null,
    createdAt: new Date('2026-09-25T10:00:00Z'),
    updatedAt: new Date('2026-09-25T10:00:00Z'),
    opening: job(),
    stageEvents: [{ toStage: 'APPLIED', createdAt: new Date('2026-09-25T10:00:00Z') }],
    ...over,
  });

  describe('apply (Th6-387/388/389/394)', () => {
    it('creates the application, snapshot, history and audit in ONE transaction, then notifies', async () => {
      const result = await service.submit(STUDENT, JOB, {
        key: 'k1',
        body: body({ coverNote: '  Hello  ' }),
      });
      expect(result).toMatchObject({
        applicationId: APP,
        jobId: JOB,
        status: 'APPLIED',
        statusLabel: 'Submitted',
        alreadyApplied: false,
      });
      expect(result.referenceNumber).toMatch(/^APP-[0-9A-F]{8}$/);
      expect(prisma.application.create.mock.calls[0]?.[0].data).toMatchObject({
        stage: 'APPLIED',
        coverNote: 'Hello',
      });
      expect(prisma.applicationSnapshot.create).toHaveBeenCalledTimes(1);
      expect(prisma.applicationStageEvent.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create.mock.calls[0]?.[0].data).toMatchObject({
        action: 'application.submitted',
        actorId: STUDENT,
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(notifications.notifyApplicationSubmitted).toHaveBeenCalledTimes(1);
      // every active company member hears about it once
      expect(notifications.notifyEmployerApplicant).toHaveBeenCalledTimes(2);
      expect(notifications.notifyEmployerApplicant.mock.calls[0]?.[0]).toMatchObject({
        kind: 'received',
      });
    });

    it('stores the employer-visible profile, verified skills, evidence refs and fit in the snapshot', async () => {
      await service.submit(STUDENT, JOB, { key: 'k1', body: body() });
      const snapshot = prisma.applicationSnapshot.create.mock.calls[0]?.[0].data;
      expect(snapshot.profileJson.fullName).toBe('Aarav Sharma');
      expect(snapshot.skillsJson).toEqual([
        { code: skillA.code, name: skillA.name, proficiency: 'ADVANCED' },
      ]);
      expect(snapshot.evidenceRefs).toEqual([
        { type: 'work_experience', id: 'we-1' },
        { type: 'work_experience_document', id: 'doc-1' },
      ]);
      expect(snapshot.fitJson).toMatchObject({ band: 'STRONG' });
      expect(snapshot.serializerVersion).toBe(1);
    });

    it('a snapshot is unchanged by later edits to the profile it was built from', () => {
      const source = { ...profile, skills: [{ name: 'React' }] };
      const record = buildSnapshotRecord({
        profile: source,
        verifiedSkills: [],
        evidenceRefs: [],
        fit: null,
      });
      source.fullName = 'Changed Later';
      source.skills.push({ name: 'Go' });
      expect((record.profileJson as any).fullName).toBe('Aarav Sharma');
      expect((record.profileJson as any).skills).toHaveLength(1);
    });

    it('rejects an apply that did not review the preview (422 schema)', () => {
      const parse = (over: Record<string, unknown>) => ApplyToJobRequestSchema.safeParse(over);
      expect(parse({}).success).toBe(false);
      expect(parse({ reviewedPreview: false }).success).toBe(false);
      const missing = parse({ reviewedPreview: false });
      expect(missing.error?.issues[0]?.path).toEqual(['reviewedPreview']);
      expect(parse({ reviewedPreview: true }).success).toBe(true);
      expect(parse({ reviewedPreview: true, coverNote: 'a'.repeat(1001) }).success).toBe(false);
      expect(parse({ reviewedPreview: true, coverNote: 'a'.repeat(1000) }).success).toBe(true);
    });

    it('a second apply (even with a new key) returns the one application and notifies nobody again', async () => {
      const first = await service.submit(STUDENT, JOB, { key: 'k1', body: body() });
      notifications.notifyApplicationSubmitted.mockClear();
      const second = await service.submit(STUDENT, JOB, { key: 'k2', body: body() });
      expect(second).toMatchObject({ applicationId: first.applicationId, alreadyApplied: true });
      expect(apps).toHaveLength(1);
      expect(prisma.application.create).toHaveBeenCalledTimes(1);
      expect(notifications.notifyApplicationSubmitted).not.toHaveBeenCalled();
    });

    it('a retry with the same Idempotency-Key creates one application and one notification', async () => {
      const first = await service.submit(STUDENT, JOB, { key: 'same', body: body() });
      const retry = await service.submit(STUDENT, JOB, { key: 'same', body: body() });
      expect(retry.applicationId).toBe(first.applicationId);
      expect(apps).toHaveLength(1);
      expect(notifications.notifyApplicationSubmitted).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('rejects a closed or expired job with 409 and a job the student cannot see with 404', async () => {
      jobRow = job({ status: 'CLOSED' });
      await expect(service.submit(STUDENT, JOB, { key: 'a', body: body() })).rejects.toMatchObject({
        status: 409,
      });
      jobRow = job({ lastDateToApply: new Date('2020-01-01') });
      await expect(service.submit(STUDENT, JOB, { key: 'b', body: body() })).rejects.toMatchObject({
        status: 409,
      });
      jobRow = null; // other institution, unverified company, draft, unknown
      await expect(service.submit(STUDENT, JOB, { key: 'c', body: body() })).rejects.toMatchObject({
        status: 404,
      });
      expect(apps).toHaveLength(0);
      expect(JSON.stringify(prisma.jobOpening.findFirst.mock.calls[0]?.[0].where)).toContain(
        INSTITUTION,
      );
      expect(JSON.stringify(prisma.jobOpening.findFirst.mock.calls[0]?.[0].where)).toContain(
        'APPROVED',
      );
    });

    it('does not fail a saved application when a notification fails', async () => {
      notifications.notifyApplicationSubmitted.mockRejectedValue(new Error('smtp down'));
      await expect(
        service.submit(STUDENT, JOB, { key: 'k1', body: body() }),
      ).resolves.toMatchObject({
        alreadyApplied: false,
      });
      expect(apps).toHaveLength(1);
    });

    it('shows the employer-visible preview with fit and whether I already applied', async () => {
      const preview = await service.preview(STUDENT, JOB);
      expect(preview).toMatchObject({ jobId: JOB, alreadyApplied: false });
      expect(preview.profile.fullName).toBe('Aarav Sharma');
      expect(preview.fit?.band).toBe('STRONG');
      apps.push(stored());
      expect((await service.preview(STUDENT, JOB)).alreadyApplied).toBe(true);
    });
  });

  describe('status changes: the one writer (Th6-395)', () => {
    it('moves a stage with history, audit and ONE status event', async () => {
      apps.push({
        ...stored(),
        opening: { institutionId: INSTITUTION },
        student: { fullName: 'A', email: 'a@x', primaryTrack: null },
      });
      const { changed } = await service.moveStage({
        applicationId: APP,
        toStage: 'INTERVIEW',
        actorId: 'tpo-1',
        institutionId: INSTITUTION,
      });
      expect(changed).toBe(true);
      expect(prisma.applicationStageEvent.create.mock.calls[0]?.[0].data).toMatchObject({
        fromStage: 'APPLIED',
        toStage: 'INTERVIEW',
        actorId: 'tpo-1',
      });
      expect(prisma.auditLog.create.mock.calls[0]?.[0].data).toMatchObject({
        action: 'application.status_changed',
        metadata: { before: { stage: 'APPLIED' }, after: { stage: 'INTERVIEW' } },
      });
      expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
    });

    it('a repeat of the same status is a no-op: no history, audit or event', async () => {
      apps.push({ ...stored(), opening: { institutionId: INSTITUTION }, student: {} });
      const { changed } = await service.moveStage({
        applicationId: APP,
        toStage: 'APPLIED',
        actorId: null,
      });
      expect(changed).toBe(false);
      expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
      expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
    });

    it("404s another institution's application, and never moves a withdrawn one (409)", async () => {
      apps.push({
        ...stored({ stage: 'WITHDRAWN' }),
        opening: { institutionId: INSTITUTION },
        student: {},
      });
      await expect(
        service.moveStage({
          applicationId: APP,
          toStage: 'OFFER',
          actorId: null,
          institutionId: 'other',
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.moveStage({
          applicationId: APP,
          toStage: 'OFFER',
          actorId: null,
          institutionId: INSTITUTION,
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('emits the event for the university shortlist too', async () => {
      await service.createShortlisted({
        openingId: JOB,
        studentId: STUDENT,
        matchScore: 0.8,
        actorId: 'tpo-1',
      });
      expect(prisma.applicationStageEvent.create.mock.calls[0]?.[0].data).toMatchObject({
        toStage: 'SHORTLISTED',
      });
      expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
    });
  });

  describe('withdraw (Th6-393)', () => {
    it('withdraws an open application: history with reason, audit, event, employer notified', async () => {
      apps.push({
        ...stored({ stage: 'SHORTLISTED' }),
        student: { fullName: 'A' },
        snapshot: { profileJson: { fullName: 'Aarav Sharma' } },
      });
      prisma.application.findUnique = vi.fn(async () => apps[0]);
      const detail = await service.withdraw(STUDENT, APP, {
        key: 'w1',
        body: { reason: 'Took another offer' },
      });
      expect(prisma.applicationStageEvent.create.mock.calls[0]?.[0].data).toMatchObject({
        fromStage: 'SHORTLISTED',
        toStage: 'WITHDRAWN',
        note: 'Took another offer',
        actorId: STUDENT,
        actorType: 'STUDENT',
        source: 'student_withdraw',
      });
      expect(prisma.auditLog.create.mock.calls[0]?.[0].data.action).toBe(
        'application.status_changed',
      );
      expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
      expect(notifications.notifyEmployerApplicant).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'withdrawn', candidateName: 'Aarav Sharma' }),
      );
      expect(detail.status).toBe('WITHDRAWN');
      expect(detail.canWithdraw).toBe(false);
    });

    it.each(['HIRED', 'REJECTED'])('is refused after %s with 422', async (stage) => {
      apps.push(stored({ stage }));
      await expect(service.withdraw(STUDENT, APP, { key: 'w', body: {} })).rejects.toMatchObject({
        status: 422,
      });
      expect(prisma.applicationStageEvent.create).not.toHaveBeenCalled();
    });

    it("404s someone else's application", async () => {
      apps.push(stored({ studentId: OTHER_STUDENT }));
      await expect(service.withdraw(STUDENT, APP, { key: 'w', body: {} })).rejects.toMatchObject({
        status: 404,
      });
    });

    it('is idempotent: withdrawing twice, or retrying the key, changes and notifies once', async () => {
      apps.push({ ...stored(), student: { fullName: 'A' }, snapshot: null });
      prisma.application.findUnique = vi.fn(async () => apps[0]);
      await service.withdraw(STUDENT, APP, { key: 'same', body: {} });
      await service.withdraw(STUDENT, APP, { key: 'same', body: {} });
      await service.withdraw(STUDENT, APP, { key: 'other', body: {} });
      expect(prisma.applicationStageEvent.create).toHaveBeenCalledTimes(1);
      expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
    });
  });

  describe('student reads (Th6-392)', () => {
    it('lists my applications with student-facing labels and nothing internal', async () => {
      apps.push(stored({ stage: 'AI_VERIFIED', matchScore: 0.9, reason: 'secret note' }));
      const { applications } = await service.listForStudent(STUDENT);
      expect(applications[0]).toMatchObject({
        status: 'REVIEWING',
        statusLabel: 'Under review',
        companyVerified: true,
      });
      const text = JSON.stringify(applications);
      for (const internal of [
        'matchScore',
        'secret note',
        'actorId',
        'reason',
        'AI_VERIFIED',
        'snapshot',
      ]) {
        expect(text).not.toContain(internal);
      }
    });

    it('shows a timeline in student wording, showing "Under review" once, without reasons or actors', async () => {
      apps.push(
        stored({
          stage: 'INTERVIEW',
          stageEvents: [
            { toStage: 'APPLIED', createdAt: new Date('2026-09-25T10:00:00Z') },
            { toStage: 'SHORTLISTED', createdAt: new Date('2026-09-26T10:00:00Z') },
            { toStage: 'AI_VERIFIED', createdAt: new Date('2026-09-27T10:00:00Z') },
            { toStage: 'INTERVIEW', createdAt: new Date('2026-09-28T10:00:00Z') },
          ],
        }),
      );
      const detail = await service.getForStudent(STUDENT, APP);
      expect(detail.timeline.map((t) => t.statusLabel)).toEqual([
        'Submitted',
        'Under review',
        'Interviewing',
      ]);
      expect(detail.canWithdraw).toBe(true);
      expect(JSON.stringify(detail)).not.toContain('actorId');
    });

    it("404s another student's application and shows an empty list for a new student", async () => {
      apps.push(stored({ studentId: OTHER_STUDENT }));
      await expect(service.getForStudent(STUDENT, APP)).rejects.toMatchObject({ status: 404 });
      expect(await service.listForStudent(STUDENT)).toEqual({ applications: [] });
    });
  });
});
