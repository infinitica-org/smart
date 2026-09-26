import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  UniversityMessageStudentRequestSchema,
  UniversityRosterQuerySchema,
} from '@smart/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import {
  UniversityStudentsService,
  missingEvidenceFrom,
  programOf,
  verificationStatusOf,
} from './university-students.service.js';
import {
  assertRecordingAccess,
  canAccessRecording,
  stripRecordingFields,
} from './recording-access.js';

const institutionId = randomUUID();
const staffId = randomUUID();
const studentId = randomUUID();
const staff: RequestUser = { sub: staffId, role: 'PLACEMENT_STAFF', inst: institutionId };

function studentRow(over: Record<string, unknown> = {}) {
  return {
    id: studentId,
    fullName: 'Asha Rao',
    email: 'asha@uni.edu',
    graduationYear: 2026,
    onboardingCompleted: true,
    onboardingDetails: { academicProgram: { studyProgram: 'B.Tech CSE' } },
    batch: { name: 'CSE 2026' },
    skillClaims: [{ status: 'VERIFIED' }, { status: 'DECLARED' }],
    ...over,
  };
}

function build(
  over: { groupLabel?: string | null; staffFound?: boolean; students?: unknown[] } = {},
) {
  const prisma = {
    user: {
      findFirst: vi.fn(async (args: { where: { id: string; role: unknown } }) => {
        if (args.where.role === 'STUDENT') {
          return (
            (over.students ?? [studentRow()]).find(
              (s) => (s as { id: string }).id === args.where.id,
            ) ?? null
          );
        }
        return over.staffFound === false ? null : { groupLabel: over.groupLabel ?? null };
      }),
      findMany: vi.fn(async () => over.students ?? [studentRow()]),
    },
    application: { findMany: vi.fn(async () => []) },
    message: { findUnique: vi.fn(async () => null) },
  };
  const readiness = {
    getSummary: vi.fn(async () => ({
      identity: { status: 'VERIFIED', signals: [], supportedStatuses: [], rule: '' },
      evidence: {
        availability: 'AVAILABLE',
        reason: null,
        requirements: [
          {
            skillCode: 'PY',
            skillName: 'Python',
            level: 'INTERMEDIATE',
            requirement: 'REAL_WORLD_APPLICATION',
            met: false,
          },
          {
            skillCode: 'SQL',
            skillName: 'SQL',
            level: 'BEGINNER',
            requirement: 'REAL_WORLD_APPLICATION',
            met: true,
          },
        ],
        counts: {
          total: 0,
          verified: 0,
          provisional: 0,
          pending: 0,
          disputedOrRejected: 0,
          expired: 0,
        },
        completeness: { required: 2, available: 1, percent: 50 },
      },
      skillDemonstration: {
        skills: [],
        counts: { demonstrated: 0, provisional: 0, notDemonstrated: 0 },
      },
      proficiency: { verifiedSkillCount: 1, declaredSkillCount: 1, byLevel: {} },
    })),
  };
  const messaging = {
    start: vi.fn(async () => ({
      conversationId: randomUUID(),
      message: { id: randomUUID() },
    })),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const service = new UniversityStudentsService(
    prisma as never,
    readiness as never,
    messaging as never,
    audit as never,
  );
  return { service, prisma, readiness, messaging, audit };
}

describe('roster (Th6-437/438/439)', () => {
  it('returns scoped rows with a derived verification status', async () => {
    const { service, prisma } = build();
    const result = await service.listRoster(staff, UniversityRosterQuerySchema.parse({}));
    expect(result.items).toEqual([
      expect.objectContaining({
        userId: studentId,
        program: 'B.Tech CSE',
        graduationYear: 2026,
        verificationStatus: 'VERIFIED',
        verifiedSkillCount: 1,
        declaredSkillCount: 1,
        needsAssistance: false,
      }),
    ]);
    expect(result.nextCursor).toBeNull();
    const where = prisma.user.findMany.mock.calls[0]?.[0].where;
    expect(where).toMatchObject({ institutionId, role: 'STUDENT' });
  });

  it('limits an advisor with a campus label to that campus', async () => {
    const { service, prisma } = build({ groupLabel: 'North Campus' });
    await service.listRoster(staff, UniversityRosterQuerySchema.parse({}));
    expect(prisma.user.findMany.mock.calls[0]?.[0].where).toMatchObject({
      groupLabel: 'North Campus',
    });
  });

  it('applies verification, program, graduation year and name filters', async () => {
    const { service, prisma } = build();
    await service.listRoster(
      staff,
      UniversityRosterQuerySchema.parse({
        verificationStatus: 'IN_PROGRESS',
        program: 'CSE',
        gradYear: '2026',
        search: 'asha',
      }),
    );
    const and = prisma.user.findMany.mock.calls[0]?.[0].where.AND as unknown[];
    expect(and).toHaveLength(4);
    expect(and[0]).toEqual({ skillClaims: { some: {}, none: { status: 'VERIFIED' } } });
    expect(and[2]).toEqual({ graduationYear: 2026 });
  });

  it('pages with a cursor', async () => {
    const rows = [studentRow({ id: randomUUID() }), studentRow({ id: randomUUID() })];
    const { service } = build({ students: rows });
    const page = await service.listRoster(staff, UniversityRosterQuerySchema.parse({ limit: '1' }));
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe((rows[0] as { id: string }).id);
  });

  it('shows an explicit empty result when nothing matches', async () => {
    const { service } = build({ students: [] });
    expect(await service.listRoster(staff, UniversityRosterQuerySchema.parse({}))).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('rejects unknown filter values and an over-large limit', () => {
    expect(UniversityRosterQuerySchema.safeParse({ verificationStatus: 'NOPE' }).success).toBe(
      false,
    );
    expect(UniversityRosterQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
    expect(UniversityRosterQuerySchema.safeParse({ gradYear: 'abc' }).success).toBe(false);
  });

  it('refuses a caller with no institution or who is not staff', async () => {
    const { service } = build();
    await expect(
      service.listRoster(
        { sub: staffId, role: 'PLACEMENT_STAFF', inst: null },
        UniversityRosterQuerySchema.parse({}),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const notStaff = build({ staffFound: false });
    await expect(
      notStaff.service.listRoster(staff, UniversityRosterQuerySchema.parse({})),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('derives status and program defensively', () => {
    expect(verificationStatusOf([]).status).toBe('NOT_STARTED');
    expect(verificationStatusOf([{ status: 'DECLARED' }]).status).toBe('IN_PROGRESS');
    expect(programOf(null)).toBeNull();
    expect(programOf([] as never)).toBeNull();
  });
});

describe('student summary (Th6-440/441/443/444)', () => {
  it('returns verification, only REQUIRED missing evidence, and no recording fields', async () => {
    const { service } = build();
    const summary = await service.getStudentSummary(staff, studentId);
    expect(summary.verification.identity.status).toBe('VERIFIED');
    expect(summary.verification.evidence.completeness?.percent).toBe(50);
    expect(summary.missingEvidence).toHaveLength(1);
    expect(summary.missingEvidence[0]).toMatchObject({ skillCode: 'PY' });
    expect(summary.opportunities).toEqual([]);
    expect(JSON.stringify(summary)).not.toMatch(/recording/i);
  });

  it('does not list optional or met evidence as a gap', () => {
    expect(
      missingEvidenceFrom([
        {
          skillCode: 'A',
          skillName: 'A',
          level: 'BEGINNER',
          requirement: 'REAL_WORLD_APPLICATION',
          met: true,
        },
      ]),
    ).toEqual([]);
  });

  it('maps applications and outcomes', async () => {
    const { service, prisma } = build();
    prisma.application.findMany.mockResolvedValueOnce([
      {
        id: randomUUID(),
        stage: 'OFFER',
        createdAt: new Date('2026-09-01T00:00:00Z'),
        opening: { roleTitle: 'SDE', companyName: 'Acme' },
        outcome: {
          offerOutcome: 'ACCEPTED',
          joiningOutcome: null,
          joiningDate: new Date('2026-10-01'),
        },
      },
    ] as never);
    const summary = await service.getStudentSummary(staff, studentId);
    expect(summary.opportunities[0]).toMatchObject({
      roleTitle: 'SDE',
      stage: 'OFFER',
      offerOutcome: 'ACCEPTED',
      joiningDate: '2026-10-01',
    });
  });

  it('reports an out-of-scope student as not found', async () => {
    const { service, readiness } = build();
    await expect(service.getStudentSummary(staff, randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(readiness.getSummary).not.toHaveBeenCalled();
  });
});

describe('message a student (Th6-442)', () => {
  const body = UniversityMessageStudentRequestSchema.parse({
    subject: 'Hi',
    body: 'Please add evidence.',
  });

  it('sends through messaging with the idempotency key and audits once', async () => {
    const { service, messaging, audit } = build();
    await service.messageStudent(staff, studentId, 'key-1', body);
    expect(messaging.start).toHaveBeenCalledWith(staffId, {
      key: 'key-1',
      body: { recipientId: studentId, body: 'Hi\n\nPlease add evidence.' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: staffId, action: 'university.student_messaged' }),
    );
  });

  it('a retry with the same key is not audited again', async () => {
    const { service, prisma, audit } = build();
    prisma.message.findUnique.mockResolvedValueOnce({ id: randomUUID() } as never);
    await service.messageStudent(staff, studentId, 'key-1', body);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('refuses a student outside the staff scope without sending', async () => {
    const { service, messaging } = build();
    await expect(service.messageStudent(staff, randomUUID(), 'k', body)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(messaging.start).not.toHaveBeenCalled();
  });

  it('validates the body', () => {
    expect(UniversityMessageStudentRequestSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(
      UniversityMessageStudentRequestSchema.safeParse({ body: 'x'.repeat(4001) }).success,
    ).toBe(false);
  });
});

describe('interview recordings default-deny (Th6-444)', () => {
  const recording = { id: randomUUID(), studentId };

  function grantDb(grant: unknown) {
    return { recordingAccessGrant: { findFirst: vi.fn(async () => grant) } };
  }

  it('denies university staff with no grant and audits the attempt', async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const prisma = grantDb(null);
    expect(await canAccessRecording(staff, recording, prisma as never)).toBe(false);
    await expect(
      assertRecordingAccess(staff, recording, { prisma: prisma as never, audit }, 'test'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'university.recording_access_denied',
        resourceId: recording.id,
      }),
    );
  });

  it('allows staff only through an unexpired, unrevoked grant for that recording', async () => {
    const prisma = grantDb({ id: randomUUID() });
    expect(await canAccessRecording(staff, recording, prisma as never)).toBe(true);
    expect(prisma.recordingAccessGrant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recordingId: recording.id,
          grantedToUserId: staffId,
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        }),
      }),
    );
  });

  it('still lets the student see their own recording without a grant lookup', async () => {
    const prisma = grantDb(null);
    const self = { sub: studentId, role: 'STUDENT', inst: institutionId };
    expect(await canAccessRecording(self, recording, prisma as never)).toBe(true);
    expect(prisma.recordingAccessGrant.findFirst).not.toHaveBeenCalled();
  });

  it('strips recording keys anywhere in a payload', () => {
    expect(
      stripRecordingFields({
        a: 1,
        recordingUrl: 'x',
        nested: [{ interviewRecordingId: 'y', ok: true }],
      }),
    ).toEqual({ a: 1, nested: [{ ok: true }] });
  });
});
