import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';
import { PlacementController } from './placement.controller.js';
import { PlacementService } from './placement.service.js';

const institutionId = randomUUID();
const studentId = randomUUID();
const actorId = randomUUID();
const tpoAdmin = { sub: actorId, role: 'PLACEMENT_STAFF', inst: institutionId };

const validBody = {
  studentId,
  trackCode: 'TECH_FULLSTACK',
  placementCycle: '2026-AUTUMN',
  companyName: 'Infinitica Labs',
  outcome: 'OFFERED',
  interviewOffered: true,
  jobOffered: true,
  offeredPackageLpa: 12.5,
};

function setup() {
  const prisma = {
    user: { findFirst: vi.fn() },
    track: { findUnique: vi.fn() },
    certificate: { findFirst: vi.fn() },
    placementRecord: { create: vi.fn() },
  };
  const outbox = { enqueueEnvelope: vi.fn() };
  const jdParseQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const service = new PlacementService(prisma as never, outbox as never, jdParseQueue as never);
  const controller = new PlacementController(service);
  return { prisma, service, controller };
}

describe('POST /placement/outcomes', () => {
  it('allows placement staff only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlacementController.prototype.recordOutcome)).toEqual([
      'INSTITUTION_ADMIN',
      'PLACEMENT_STAFF',
    ]);
  });

  it('records an outcome for a certified student in the institution', async () => {
    const { controller, prisma } = setup();
    const recordId = randomUUID();
    const createdAt = new Date('2026-09-17T00:00:00.000Z');

    prisma.user.findFirst.mockResolvedValue({ id: studentId });
    prisma.track.findUnique.mockResolvedValue({ id: randomUUID(), code: 'TECH_FULLSTACK' });
    prisma.certificate.findFirst.mockResolvedValue({ headlineTier: 'GOLD' });
    prisma.placementRecord.create.mockResolvedValue({
      id: recordId,
      userId: studentId,
      cycle: validBody.placementCycle,
      outcome: validBody.outcome,
      companyName: validBody.companyName,
      packageLpa: validBody.offeredPackageLpa,
      createdAt,
    });

    const dto = await controller.recordOutcome(tpoAdmin as never, validBody);

    expect(dto.recordId).toBe(recordId);
    expect(dto.tierAtPlacement).toBe('GOLD');
    expect(dto.outcome).toBe('OFFERED');
  });

  it('rejects students outside the institution', async () => {
    const { controller, prisma } = setup();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(controller.recordOutcome(tpoAdmin as never, validBody)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects students without an issued certificate', async () => {
    const { controller, prisma } = setup();
    prisma.user.findFirst.mockResolvedValue({ id: studentId });
    prisma.track.findUnique.mockResolvedValue({ id: randomUUID(), code: 'TECH_FULLSTACK' });
    prisma.certificate.findFirst.mockResolvedValue(null);

    await expect(controller.recordOutcome(tpoAdmin as never, validBody)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects invalid payloads before touching the database', async () => {
    const { controller, prisma } = setup();

    await expect(
      controller.recordOutcome(tpoAdmin as never, { ...validBody, placementCycle: 'bad-cycle' }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('rejects users without institution context', async () => {
    const { controller } = setup();

    await expect(
      controller.recordOutcome({ sub: actorId, role: 'PLACEMENT_STAFF' } as never, validBody),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
