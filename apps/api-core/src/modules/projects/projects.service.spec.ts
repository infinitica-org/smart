import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SMART_TOPICS } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

const studentId = randomUUID();
const otherStudentId = randomUUID();
const projectId = randomUUID();
const replacementProjectId = randomUUID();

const template = {
  title: 'Campus bus tracker',
  problem: 'Students cannot see live bus location on campus routes.',
  approach: 'I used websockets and a small GPS ingest service.',
  stack: 'TypeScript, Nest, Redis',
  outcome: 'Average wait time dropped in a 30-student pilot.',
  loomUrl: 'https://www.loom.com/share/abc123',
  githubUrl: 'https://github.com/alice/demo-api',
};

function projectRow(overrides: Record<string, unknown> = {}) {
  return {
    id: projectId,
    studentId,
    title: template.title,
    problem: template.problem,
    approach: template.approach,
    stack: template.stack,
    outcome: template.outcome,
    loomUrl: template.loomUrl,
    githubUrl: template.githubUrl,
    liveUrl: null,
    status: 'SUBMITTED',
    isActive: true,
    createdAt: new Date('2026-09-02T10:00:00.000Z'),
    report: null,
    ...overrides,
  };
}

function setup() {
  const prisma = {
    project: {
      create: vi.fn().mockResolvedValue(projectRow()),
      findUnique: vi.fn().mockResolvedValue(projectRow()),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi
        .fn()
        .mockImplementation(({ where, data }) =>
          Promise.resolve(projectRow({ id: where.id, ...data })),
        ),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const verifyRunner = { runForProject: vi.fn().mockResolvedValue(undefined) };
  const interviewGate = {
    getState: vi.fn().mockResolvedValue({
      interviewRequired: false,
      interviewStatus: 'NOT_REQUIRED',
      interviewCompletedAt: null,
    }),
  };
  const auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
  const service = new ProjectsService(
    prisma as never,
    outbox as never,
    verifyRunner as never,
    interviewGate as never,
    auditPublisher as never,
  );
  const controller = new ProjectsController(service);
  return { prisma, outbox, verifyRunner, interviewGate, auditPublisher, service, controller };
}

describe('CN-T08 project submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restricts create, poll, and replace to STUDENT', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ProjectsController.prototype.create)).toEqual([
      'STUDENT',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, ProjectsController.prototype.get)).toEqual(['STUDENT']);
    expect(Reflect.getMetadata(ROLES_KEY, ProjectsController.prototype.replace)).toEqual([
      'STUDENT',
    ]);
  });

  it('rejects a one-line problem so the template is not a title dump', async () => {
    const { service, prisma, outbox } = setup();
    await expect(
      service.create(studentId, {
        title: 'App',
        problem: 'too short',
        approach: 'I built it quickly with whatever was nearby.',
        stack: 'JS',
        outcome: 'It kind of worked for a weekend demo once.',
      }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(prisma.project.create).not.toHaveBeenCalled();
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('persists the template, queues smart.project.submitted, and returns SUBMITTED', async () => {
    const { service, prisma, outbox, verifyRunner } = setup();
    const dto = await service.create(studentId, template);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId,
        title: template.title,
        loomUrl: template.loomUrl,
        githubUrl: template.githubUrl,
        status: 'SUBMITTED',
      }),
    });
    expect(outbox.enqueueEnvelope).toHaveBeenCalledTimes(1);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith({
      topic: SMART_TOPICS.projectSubmitted,
      partitionKey: projectId,
      eventType: SMART_TOPICS.projectSubmitted,
      source: 'platform',
      data: { projectId, studentId },
    });
    expect(verifyRunner.runForProject).toHaveBeenCalledWith(projectId, studentId);
    expect(dto.status).toBe('SUBMITTED');
    expect(dto.interviewStatus).toBe('NOT_REQUIRED');
  });

  it('returns the owned project for processing polls', async () => {
    const { service, prisma } = setup();
    prisma.project.findUnique.mockResolvedValue(projectRow());
    const dto = await service.getForStudent(studentId, projectId);
    expect(dto.projectId).toBe(projectId);
    expect(dto.status).toBe('SUBMITTED');
  });

  it('forbids polling another student project', async () => {
    const { service, prisma } = setup();
    prisma.project.findUnique.mockResolvedValue(projectRow({ studentId: otherStudentId }));
    await expect(service.getForStudent(studentId, projectId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('404s unknown project ids', async () => {
    const { service, prisma } = setup();
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.getForStudent(studentId, projectId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('project replacement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks the old project inactive and keeps the replacement active', async () => {
    const { service, prisma, auditPublisher } = setup();
    prisma.project.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === projectId) return Promise.resolve(projectRow({ id: projectId }));
      if (where.id === replacementProjectId) {
        return Promise.resolve(
          projectRow({ id: replacementProjectId, title: 'Replacement app', isActive: true }),
        );
      }
      return Promise.resolve(null);
    });
    prisma.project.update.mockImplementation(({ where, data }) =>
      Promise.resolve(projectRow({ id: where.id, ...data })),
    );

    const result = await service.replace(studentId, projectId, {
      replacementProjectId,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: projectId },
        data: { isActive: false },
      }),
    );
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: replacementProjectId },
        data: { isActive: true },
      }),
    );
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: studentId,
        action: 'project.replaced',
        resourceType: 'Project',
        resourceId: projectId,
        metadata: expect.objectContaining({ replacementProjectId }),
      }),
    );
    expect(result.replacedProject.isActive).toBe(false);
    expect(result.replacementProject.isActive).toBe(true);
  });

  it('rejects self-replacement', async () => {
    const { service, prisma } = setup();
    await expect(
      service.replace(studentId, projectId, { replacementProjectId: projectId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('forbids replacing another student project', async () => {
    const { service, prisma } = setup();
    prisma.project.findUnique.mockResolvedValue(projectRow({ studentId: otherStudentId }));
    await expect(
      service.replace(studentId, projectId, { replacementProjectId }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids using another student replacement project', async () => {
    const { service, prisma } = setup();
    prisma.project.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === projectId) return Promise.resolve(projectRow());
      if (where.id === replacementProjectId) {
        return Promise.resolve(projectRow({ id: replacementProjectId, studentId: otherStudentId }));
      }
      return Promise.resolve(null);
    });
    await expect(
      service.replace(studentId, projectId, { replacementProjectId }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('is idempotent when the old project is already inactive', async () => {
    const { service, prisma, auditPublisher } = setup();
    prisma.project.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === projectId) {
        return Promise.resolve(projectRow({ id: projectId, isActive: false }));
      }
      if (where.id === replacementProjectId) {
        return Promise.resolve(projectRow({ id: replacementProjectId, isActive: true }));
      }
      return Promise.resolve(null);
    });

    const result = await service.replace(studentId, projectId, { replacementProjectId });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(auditPublisher.record).not.toHaveBeenCalled();
    expect(result.replacedProject.isActive).toBe(false);
    expect(result.replacementProject.isActive).toBe(true);
  });

  it('rejects replacing an already inactive project when replacement is also inactive', async () => {
    const { service, prisma } = setup();
    prisma.project.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === projectId) {
        return Promise.resolve(projectRow({ id: projectId, isActive: false }));
      }
      if (where.id === replacementProjectId) {
        return Promise.resolve(projectRow({ id: replacementProjectId, isActive: false }));
      }
      return Promise.resolve(null);
    });

    await expect(
      service.replace(studentId, projectId, { replacementProjectId }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
