import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { MeApplicationsController } from './me-applications.controller.js';
import { PlacementService } from './placement.service.js';

const institutionId = randomUUID();
const otherInstitutionId = randomUUID();
const studentId = randomUUID();
const otherStudentId = randomUUID();
const openingId = randomUUID();
const applicationId = randomUUID();
const otherApplicationId = randomUUID();

const student = { sub: studentId, role: 'STUDENT', inst: institutionId };

function storedApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: applicationId,
    openingId,
    studentId,
    stage: 'SHORTLISTED',
    matchScore: 0.88,
    createdAt: new Date('2026-09-02T06:00:00.000Z'),
    updatedAt: new Date('2026-09-02T07:00:00.000Z'),
    opening: {
      companyName: 'Infinitica Labs',
      roleTitle: 'Backend Engineer',
      location: 'Coimbatore',
      employmentType: 'FULL_TIME',
      domainCode: 'SOFTWARE_IT',
      institutionId,
    },
    student: {
      fullName: 'Aarav Sharma',
      email: 'aarav@example.com',
      primaryTrack: { code: 'FULLSTACK' },
    },
    ...overrides,
  };
}

function setup(rows: unknown[] = [storedApplication()]) {
  const prisma = {
    application: {
      findMany: vi.fn(({ where }: { where: { studentId: string } }) =>
        Promise.resolve(
          rows.filter((row) => (row as { studentId: string }).studentId === where.studentId),
        ),
      ),
    },
  };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const service = new PlacementService(prisma as never, outbox as never);
  const controller = new MeApplicationsController(service);
  return { prisma, service, controller };
}

describe('CN-T06 my applications authorization', () => {
  it('restricts listMyApplications to STUDENT', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, MeApplicationsController.prototype.listMyApplications),
    ).toEqual(['STUDENT']);
  });

  it('does not accept a studentId argument on the controller', () => {
    expect(MeApplicationsController.prototype.listMyApplications.length).toBe(1);
  });
});

describe('CN-T06 list my applications', () => {
  it('returns the authenticated student applications with opening fields', async () => {
    const { controller, prisma } = setup();

    const response = await controller.listMyApplications(student as never);

    expect(prisma.application.findMany).toHaveBeenCalledWith({
      where: { studentId, opening: { institutionId } },
      include: {
        opening: {
          select: {
            companyName: true,
            roleTitle: true,
            location: true,
            employmentType: true,
            domainCode: true,
          },
        },
        student: {
          select: {
            fullName: true,
            email: true,
            primaryTrack: { select: { code: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    expect(response.applications).toHaveLength(1);
    expect(response.applications[0]).toMatchObject({
      applicationId,
      openingId,
      studentId,
      stage: 'SHORTLISTED',
      companyName: 'Infinitica Labs',
      roleTitle: 'Backend Engineer',
      location: 'Coimbatore',
      employmentType: 'FULL_TIME',
      domain: 'SOFTWARE_IT',
      matchScore: 0.88,
    });
  });

  it('scopes the query to the token sub and never a client studentId', async () => {
    const { controller, prisma } = setup();
    const forged = { studentId: otherStudentId };

    await controller.listMyApplications(student as never);

    const query = prisma.application.findMany.mock.calls[0]?.[0] as {
      where: { studentId: string };
    };
    expect(query.where.studentId).toBe(studentId);
    expect(query.where.studentId).not.toBe(forged.studentId);
    expect(JSON.stringify(query)).not.toContain(otherStudentId);
  });

  it('does not return another student application even if the mock mix includes one', async () => {
    const own = storedApplication();
    const foreign = storedApplication({
      id: otherApplicationId,
      studentId: otherStudentId,
      opening: {
        companyName: 'Other Corp',
        roleTitle: 'Analyst',
        location: 'Chennai',
        employmentType: 'FULL_TIME',
        domainCode: 'SOFTWARE_IT',
        institutionId: otherInstitutionId,
      },
    });
    const { controller, prisma } = setup([own, foreign]);

    const response = await controller.listMyApplications(student as never);

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId, opening: { institutionId } },
      }),
    );
    expect(response.applications).toHaveLength(1);
    expect(response.applications[0]?.applicationId).toBe(applicationId);
    expect(response.applications.some((row) => row.studentId === otherStudentId)).toBe(false);
  });

  it('still isolates by studentId when the token has no institution claim', async () => {
    const { controller, prisma } = setup();

    await controller.listMyApplications({ ...student, inst: null } as never);

    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId },
      }),
    );
    const query = prisma.application.findMany.mock.calls[0]?.[0] as {
      where: { opening?: unknown };
    };
    expect(query.where.opening).toBeUndefined();
  });

  it('returns an empty list when the student has no applications', async () => {
    const { controller } = setup([]);

    const response = await controller.listMyApplications(student as never);

    expect(response.applications).toEqual([]);
  });

  it('maps a later CO-T02 stage without inventing ATS values', async () => {
    const { controller } = setup([storedApplication({ stage: 'INTERVIEW' })]);

    const response = await controller.listMyApplications(student as never);

    expect(response.applications[0]?.stage).toBe('INTERVIEW');
  });
});
