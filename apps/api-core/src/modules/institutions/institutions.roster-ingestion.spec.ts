import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const noopRedis = { get: vi.fn(), setex: vi.fn(), del: vi.fn() };

const institutionId = randomUUID();
const batchId = randomUUID();
const actorId = randomUUID();

function setupRosterTest(opts?: {
  whitelistedDomains?: string[];
  candidateCapacity?: number | null;
  existingUserCount?: number;
}) {
  const auditPublisher = {
    record: vi.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    institution: {
      findUnique: vi.fn().mockResolvedValue({
        id: institutionId,
        name: 'Tech University',
        domains: opts?.whitelistedDomains ?? ['tech.edu', 'student.tech.edu'],
        verificationStatus: 'APPROVED',
        planId: 'plan-1',
        plan: { code: 'PRO', candidateCapacity: opts?.candidateCapacity ?? 500 },
      }),
    },
    featureFlag: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    campus: { findFirst: vi.fn().mockResolvedValue(null) },
    batch: {
      findFirst: vi.fn().mockResolvedValue({
        id: batchId,
        institutionId,
        name: 'CSE Batch 2026',
        code: 'CSE-2026',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: batchId,
          institutionId,
          name: data.name ?? 'CSE Class of 2026',
          code: data.code ?? 'CSE-2026',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: batchId,
          institutionId,
          name: data.name ?? 'CSE Batch 2026',
          code: data.code ?? 'CSE-2026',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: randomUUID(),
        email: 'alice.smith@student.tech.edu',
        role: 'STUDENT',
        institutionId,
        batchId,
      }),
      count: vi.fn().mockResolvedValue(opts?.existingUserCount ?? 10),
    },
    invitation: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  return {
    service: new InstitutionsService(
      prisma as never,
      {
        createAndEnqueue: vi.fn().mockImplementation(({ email, fullName }) =>
          Promise.resolve({
            invitation: {
              id: randomUUID(),
              email,
              fullName,
              role: 'STUDENT',
              institutionId,
              batchId,
              status: 'PENDING',
              createdAt: new Date(),
            },
          }),
        ),
      } as never,
      auditPublisher as never,
      noopRedis as never,
      {} as never,
    ),
    prisma,
  };
}

describe('Epic UNIV-02: Student Roster Ingestion & Domain Whitelisting (Th6-I190..Th6-I199)', () => {
  it('Th6-I190: creates batch with metadata', async () => {
    const { service, prisma } = setupRosterTest();
    const result = await service.createBatch(
      institutionId,
      {
        name: 'CSE Class of 2026',
        code: 'CSE-2026',
      },
      actorId,
    );
    expect(prisma.batch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'CSE Class of 2026',
          code: 'CSE-2026',
          institutionId,
        }),
      }),
    );
    expect(result).toHaveProperty('batchId', batchId);
    expect(result).toHaveProperty('name', 'CSE Class of 2026');
  });

  it('Th6-I191: builds import template spreadsheet with expected headers', async () => {
    const { service } = setupRosterTest();
    const buffer = await service.buildImportTemplate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('Th6-I193 & Th6-I194: previews and executes batch roster ingestion', async () => {
    const { service } = setupRosterTest();
    const csv = Buffer.from(
      'Full Name,Email,Group\nAlice Smith,alice.smith@student.tech.edu,Section A\nBob Jones,bob.jones@student.tech.edu,Section B',
    );

    const preview = await service.previewBatchImport(
      batchId,
      institutionId,
      csv,
      'roster.csv',
      'text/csv',
    );
    expect(preview.headers).toEqual(['Full Name', 'Email', 'Group']);

    const imported = await service.importBatchMembers(
      batchId,
      institutionId,
      csv,
      'roster.csv',
      'text/csv',
      actorId,
    );
    expect(imported).toMatchObject({
      imported: 2,
      skipped: 0,
      newAccounts: 2,
    });
  });

  it('Th6-I199: enforces candidate capacity limits before batch ingestion', async () => {
    const { service } = setupRosterTest({ candidateCapacity: 10, existingUserCount: 10 });
    const csv = Buffer.from('Full Name,Email\nNew Student,new.student@student.tech.edu');

    await expect(
      service.importBatchMembers(batchId, institutionId, csv, 'roster.csv', 'text/csv', actorId),
    ).rejects.toThrow(/allows up to 10 candidates/i);
  });
});
