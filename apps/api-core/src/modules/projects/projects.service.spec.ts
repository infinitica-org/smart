import { randomUUID } from 'node:crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SMART_TOPICS } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

const studentId = randomUUID();
const otherStudentId = randomUUID();
const projectId = randomUUID();

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
    createdAt: new Date('2026-09-02T10:00:00.000Z'),
    ...overrides,
  };
}

function setup() {
  const prisma = {
    project: {
      create: vi.fn().mockResolvedValue(projectRow()),
      findUnique: vi.fn(),
    },
  };
  const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
  const service = new ProjectsService(prisma as never, outbox as never);
  const controller = new ProjectsController(service);
  return { prisma, outbox, service, controller };
}

describe('CN-T08 project submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restricts create and poll to STUDENT', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ProjectsController.prototype.create)).toEqual([
      'STUDENT',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, ProjectsController.prototype.get)).toEqual(['STUDENT']);
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
    const { service, prisma, outbox } = setup();
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
    expect(dto.status).toBe('SUBMITTED');
    expect(dto.report).toBeNull();
  });

  it('persists an optional live link', async () => {
    const { service, prisma } = setup();
    prisma.project.create.mockResolvedValueOnce(
      projectRow({ liveUrl: 'https://bus-tracker.example.com' }),
    );
    const dto = await service.create(studentId, {
      ...template,
      liveUrl: 'https://bus-tracker.example.com',
    });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ liveUrl: 'https://bus-tracker.example.com' }),
    });
    expect(dto.liveUrl).toBe('https://bus-tracker.example.com');
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
