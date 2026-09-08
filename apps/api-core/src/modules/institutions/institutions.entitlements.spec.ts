import { randomUUID } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const institutionId = randomUUID();

function fakeInstitution(planCode: 'FREE' | 'BASIC' | 'PRO', candidateCapacity: number | null) {
  return {
    id: institutionId,
    name: 'Test Institution',
    domain: 'test.edu',
    verificationStatus: 'APPROVED',
    planId: 'plan-1',
    plan: { code: planCode, candidateCapacity },
  };
}

const bulkBatchImportFlag = {
  id: 'flag-1',
  key: 'bulk_batch_import',
  name: 'Bulk spreadsheet batch import',
  entitlements: [{ planId: 'plan-1', enabled: true }],
  overrides: [] as Array<{ institutionId: string | null; enabled: boolean }>,
};

function service(opts: {
  planCode?: 'FREE' | 'BASIC' | 'PRO';
  candidateCapacity?: number | null;
  candidateCount?: number;
  flags?: (typeof bulkBatchImportFlag)[];
}) {
  const noopRedis = { get: vi.fn().mockResolvedValue(null), setex: vi.fn(), del: vi.fn() };
  const prisma = {
    institution: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          fakeInstitution(opts.planCode ?? 'BASIC', opts.candidateCapacity ?? null),
        ),
    },
    featureFlag: {
      findMany: vi.fn().mockResolvedValue(opts.flags ?? []),
    },
    user: {
      count: vi.fn().mockResolvedValue(opts.candidateCount ?? 0),
    },
  };
  return new InstitutionsService(prisma as never, {} as never, {} as never, noopRedis as never);
}

describe('InstitutionsService entitlement resolution', () => {
  it('an institution-level override takes precedence over the plan entitlement', async () => {
    const flag = {
      ...bulkBatchImportFlag,
      entitlements: [{ planId: 'plan-1', enabled: false }],
      overrides: [{ institutionId, enabled: true }],
    };
    const svc = service({ flags: [flag] });
    const resolved = await svc.resolveInstitutionEntitlements(institutionId);
    expect(resolved.flags.find((f) => f.key === 'bulk_batch_import')?.enabled).toBe(true);
  });

  it('falls back to the plan entitlement when no override exists', async () => {
    const flag = {
      ...bulkBatchImportFlag,
      entitlements: [{ planId: 'plan-1', enabled: true }],
      overrides: [],
    };
    const svc = service({ flags: [flag] });
    const resolved = await svc.resolveInstitutionEntitlements(institutionId);
    expect(resolved.flags.find((f) => f.key === 'bulk_batch_import')?.enabled).toBe(true);
  });

  it('defaults to disabled when neither an override nor a plan entitlement exists', async () => {
    const flag = { ...bulkBatchImportFlag, entitlements: [], overrides: [] };
    const svc = service({ flags: [flag] });
    const resolved = await svc.resolveInstitutionEntitlements(institutionId);
    expect(resolved.flags.find((f) => f.key === 'bulk_batch_import')?.enabled).toBe(false);
  });

  it('assertInstitutionFlag throws 403 when the resolved flag is disabled', async () => {
    const flag = { ...bulkBatchImportFlag, entitlements: [{ planId: 'plan-1', enabled: false }] };
    const svc = service({ flags: [flag] });
    await expect(svc.assertInstitutionFlag(institutionId, 'bulk_batch_import')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('assertInstitutionFlag resolves when the flag is enabled', async () => {
    const flag = { ...bulkBatchImportFlag, entitlements: [{ planId: 'plan-1', enabled: true }] };
    const svc = service({ flags: [flag] });
    await expect(
      svc.assertInstitutionFlag(institutionId, 'bulk_batch_import'),
    ).resolves.toBeUndefined();
  });
});

describe('InstitutionsService candidate capacity enforcement', () => {
  it('allows adding candidates under the plan capacity', async () => {
    const svc = service({ candidateCapacity: 100, candidateCount: 98 });
    await expect(svc.assertCandidateCapacity(institutionId, 1)).resolves.toBeUndefined();
  });

  it('blocks once the additional candidates would exceed capacity', async () => {
    const svc = service({ candidateCapacity: 100, candidateCount: 99 });
    await expect(svc.assertCandidateCapacity(institutionId, 2)).rejects.toThrow(ForbiddenException);
  });

  it('blocks exactly at the limit boundary (capacity 100, usage 100, +1 more)', async () => {
    const svc = service({ candidateCapacity: 100, candidateCount: 100 });
    await expect(svc.assertCandidateCapacity(institutionId, 1)).rejects.toThrow(ForbiddenException);
  });

  it('never blocks when the plan capacity is null (unlimited)', async () => {
    const svc = service({ candidateCapacity: null, candidateCount: 1_000_000 });
    await expect(svc.assertCandidateCapacity(institutionId, 50)).resolves.toBeUndefined();
  });
});
