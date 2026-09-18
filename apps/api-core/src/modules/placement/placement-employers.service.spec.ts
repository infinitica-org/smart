import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PlacementEmployersService } from './placement-employers.service.js';

const institutionId = randomUUID();

describe('PlacementEmployersService', () => {
  it('does not create when a normalized name already exists for the institution', async () => {
    const create = vi.fn();
    const prisma = {
      placementEmployer: {
        findFirst: vi.fn().mockResolvedValue({ id: randomUUID(), name: 'Infosys' }),
        create,
      },
    };
    const service = new PlacementEmployersService(prisma as never);
    await expect(service.createEmployer(institutionId, { name: 'Infosys Ltd' })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it('scopes getEmployer to the caller institution', async () => {
    const prisma = {
      placementEmployer: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const service = new PlacementEmployersService(prisma as never);
    await expect(service.getEmployer(institutionId, randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
