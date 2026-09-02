import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const institutionId = randomUUID();
const batchId = randomUUID();
const actorId = randomUUID();
const mapping = { fullName: 'Student Name', email: 'Email Address', groupLabel: 'Department' };

type ExistingUser = {
  id: string;
  email: string;
  role: 'STUDENT' | 'INSTITUTION_ADMIN';
  institutionId: string;
};

function setup(existingUsers: ExistingUser[] = []) {
  const auditPublisher = {
    record: vi.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    batch: { findFirst: vi.fn().mockResolvedValue({ id: batchId, institutionId }) },
    user: {
      findMany: vi.fn().mockResolvedValue(existingUsers),
      findUnique: vi
        .fn()
        .mockImplementation(({ where }: { where: { email: string } }) =>
          Promise.resolve(existingUsers.find((user) => user.email === where.email) ?? null),
        ),
      update: vi
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve(existingUsers.find((user) => user.id === where.id)),
        ),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: randomUUID(),
        email: 'john.student@example.test',
        role: 'STUDENT',
        institutionId,
        batchId,
      }),
    },
    invitation: { findFirst: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(1) },
  };
  const invitations = { createAndEnqueue: vi.fn().mockResolvedValue({ invitation: {} }) };
  return {
    prisma,
    invitations,
    service: new InstitutionsService(
      prisma as never,
      invitations as never,
      auditPublisher as never,
    ),
  };
}

const csv = (...rows: string[]) =>
  Buffer.from(['Student Name,Email Address,Department', ...rows].join('\n'));

describe('InstitutionsService mapped row validation', () => {
  it('maps arbitrary headers and returns preview metadata', async () => {
    const { service } = setup();
    const result = await service.previewBatchImport(
      batchId,
      institutionId,
      Buffer.from(
        'Department,Email Address,Student Name\nEngineering,john.student@example.test,John Student',
      ),
      'candidates.csv',
      'text/csv',
      mapping,
    );
    expect(result).toMatchObject({
      validRows: 1,
      invalidRows: 0,
      newAccounts: 1,
      existingStudents: 0,
      previewTruncated: false,
    });
    expect(result.preview?.[0]).toMatchObject({
      fullName: 'John Student',
      email: 'john.student@example.test',
      groupLabel: 'Engineering',
      valid: true,
    });
  });

  it('reports missing mapped columns and empty spreadsheets', async () => {
    const { service } = setup();
    await expect(
      service.previewBatchImport(
        batchId,
        institutionId,
        Buffer.from('Name,Mail\nJohn Student,john.student@example.test'),
        'candidates.csv',
        'text/csv',
        mapping,
      ),
    ).resolves.toMatchObject({
      errors: [{ row: 1, message: 'One or more mapped columns are not present in row 1.' }],
    });
    await expect(
      service.previewBatchImport(
        batchId,
        institutionId,
        Buffer.from('Student Name,Email Address,Department'),
        'candidates.csv',
        'text/csv',
        mapping,
      ),
    ).resolves.toMatchObject({
      errors: [{ row: 1, message: 'The spreadsheet has no candidate rows.' }],
    });
  });

  it('reports malformed, duplicate, and empty rows instead of dropping them', async () => {
    const { service, invitations } = setup();
    const result = await service.importBatchMembers(
      batchId,
      institutionId,
      csv(
        'John Student,john.student@example.test,Engineering',
        ',missing.name@example.test,Science',
        'Missing Email,,Science',
        'Malformed,student.example,Science',
        'Duplicate,john.student@example.test,Science',
        ',,',
        `Long Group,long.group@example.test,${'G'.repeat(81)}`,
      ),
      'candidates.csv',
      'text/csv',
      actorId,
      mapping,
    );
    expect(result).toMatchObject({ imported: 1, skipped: 6, validRows: 1, invalidRows: 6 });
    expect(result.errors.map((error) => [error.row, error.message])).toEqual([
      [3, 'Full Name is required.'],
      [4, 'Email is required.'],
      [5, 'Invalid email address.'],
      [6, 'Duplicate email in this upload.'],
      [7, 'Row is empty.'],
      [8, 'Group must be 80 characters or fewer.'],
    ]);
    expect(invitations.createAndEnqueue).toHaveBeenCalledTimes(1);
  });

  it('classifies existing students and rejects cross-tenant or non-student emails', async () => {
    const { service } = setup([
      {
        id: randomUUID(),
        email: 'existing.student@example.test',
        role: 'STUDENT',
        institutionId,
      },
      {
        id: randomUUID(),
        email: 'foreign.student@example.test',
        role: 'STUDENT',
        institutionId: randomUUID(),
      },
      {
        id: randomUUID(),
        email: 'admin.user@example.test',
        role: 'INSTITUTION_ADMIN',
        institutionId,
      },
    ]);
    const result = await service.previewBatchImport(
      batchId,
      institutionId,
      csv(
        'Existing Student,existing.student@example.test,Engineering',
        'Foreign Student,foreign.student@example.test,Engineering',
        'Admin User,admin.user@example.test,Engineering',
      ),
      'candidates.csv',
      'text/csv',
      mapping,
    );
    expect(result).toMatchObject({ validRows: 1, invalidRows: 2, existingStudents: 1 });
    expect(result.errors.map((error) => error.message)).toEqual([
      'Candidate belongs to another institution.',
      'Email belongs to a non-student account.',
    ]);
  });

  it('does not leak internal errors when a mapped row cannot be imported', async () => {
    const { service, invitations } = setup();
    invitations.createAndEnqueue.mockRejectedValueOnce(new Error('database secret'));
    const result = await service.importBatchMembers(
      batchId,
      institutionId,
      csv('John Student,john.student@example.test,Engineering'),
      'candidates.csv',
      'text/csv',
      actorId,
      mapping,
    );
    expect(result.errors[0]?.message).toBe('Candidate could not be imported.');
  });
});
