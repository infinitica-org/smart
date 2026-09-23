import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const noopRedis = { get: vi.fn(), setex: vi.fn(), del: vi.fn() };
const institutionId = randomUUID();

function setup(users: Array<Record<string, unknown>>) {
  const prisma = {
    institution: {
      findUnique: vi.fn().mockResolvedValue({ id: institutionId }),
    },
    user: {
      findMany: vi.fn().mockResolvedValue(users),
    },
    invitation: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const service = new InstitutionsService(
    prisma as never,
    {} as never,
    { record: vi.fn() } as never,
    noopRedis as never,
    {} as never,
  );
  return { service };
}

describe('InstitutionsService listInstitutionStudents social URLs', () => {
  it('includes linkedin and github URLs from onboardingDetails', async () => {
    const userId = randomUUID();
    const { service } = setup([
      {
        id: userId,
        email: 'ada@example.test',
        fullName: 'Ada Lovelace',
        batchId: null,
        batch: null,
        heldAt: null,
        onboardingDetails: {
          linkedinUrl: 'https://linkedin.com/in/ada',
          githubUrl: 'https://github.com/ada',
        },
      },
    ]);

    const rows = await service.listInstitutionStudents(institutionId, {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId,
      linkedinUrl: 'https://linkedin.com/in/ada',
      githubUrl: 'https://github.com/ada',
    });
  });

  it('returns null social URLs when onboardingDetails is missing', async () => {
    const { service } = setup([
      {
        id: randomUUID(),
        email: 'plain@example.test',
        fullName: 'Plain Student',
        batchId: null,
        batch: null,
        heldAt: null,
        onboardingDetails: null,
      },
    ]);

    const rows = await service.listInstitutionStudents(institutionId, {});
    expect(rows[0]?.linkedinUrl).toBeNull();
    expect(rows[0]?.githubUrl).toBeNull();
  });
});
