import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillRetakeAdminService } from './skill-retake-admin.service.js';

const actorId = randomUUID();
const skillId = randomUUID();

describe('SkillRetakeAdminService (T19)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists skill retake policies', async () => {
    const prisma = {
      skill: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: skillId,
            code: 'REACT',
            name: 'React',
            cooldownDays: 60,
            validityDays: 180,
            beginnerPassThreshold: 60,
            active: true,
          },
        ]),
      },
    };
    const service = new SkillRetakeAdminService(prisma as never, { record: vi.fn() } as never);
    const result = await service.listPolicies();
    expect(result.skills).toHaveLength(1);
  });

  it('updates valid policy and audits', async () => {
    const prisma = {
      skill: {
        findUnique: vi.fn().mockResolvedValue({
          id: skillId,
          code: 'REACT',
          name: 'React',
          cooldownDays: 60,
          validityDays: 180,
          beginnerPassThreshold: 60,
          active: true,
        }),
        update: vi.fn().mockResolvedValue({
          id: skillId,
          code: 'REACT',
          name: 'React',
          cooldownDays: 45,
          validityDays: 120,
          beginnerPassThreshold: 65,
          active: true,
        }),
      },
    };
    const auditPublisher = { record: vi.fn() };
    const service = new SkillRetakeAdminService(prisma as never, auditPublisher as never);
    const dto = await service.updatePolicy(actorId, skillId, {
      cooldownDays: 45,
      validityDays: 120,
      beginnerPassThreshold: 65,
    });
    expect(dto.cooldownDays).toBe(45);
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin.skill_retake_policy.updated' }),
    );
  });

  it('rejects invalid cooldown', async () => {
    const service = new SkillRetakeAdminService(
      { skill: { findUnique: vi.fn() } } as never,
      { record: vi.fn() } as never,
    );
    await expect(service.updatePolicy(actorId, skillId, { cooldownDays: 0 })).rejects.toThrow();
  });

  it('404s unknown skill', async () => {
    const prisma = { skill: { findUnique: vi.fn().mockResolvedValue(null) } };
    const service = new SkillRetakeAdminService(prisma as never, { record: vi.fn() } as never);
    await expect(
      service.updatePolicy(actorId, skillId, { cooldownDays: 30 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects validity shorter than cooldown', async () => {
    const prisma = {
      skill: {
        findUnique: vi.fn().mockResolvedValue({
          id: skillId,
          code: 'REACT',
          name: 'React',
          cooldownDays: 60,
          validityDays: 180,
          beginnerPassThreshold: 60,
          active: true,
        }),
      },
    };
    const service = new SkillRetakeAdminService(prisma as never, { record: vi.fn() } as never);
    await expect(
      service.updatePolicy(actorId, skillId, { cooldownDays: 90, validityDays: 30 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
