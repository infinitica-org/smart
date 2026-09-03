import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const institutionId = randomUUID();
const batchId = randomUUID();
const actorId = randomUUID();

function setup() {
  const auditPublisher = {
    record: vi.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    batch: { findFirst: vi.fn().mockResolvedValue({ id: batchId, institutionId }) },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: randomUUID(),
        email: 'john.student@example.test',
        role: 'STUDENT',
        institutionId,
        batchId,
      }),
    },
    invitation: { findFirst: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0) },
  };
  return {
    service: new InstitutionsService(
      prisma as never,
      {
        createAndEnqueue: vi.fn().mockResolvedValue({ invitation: {} }),
      } as never,
      auditPublisher as never,
    ),
  };
}

function probe(service: InstitutionsService, file: Buffer, name: string) {
  return service.previewBatchImport(batchId, institutionId, file, name, 'application/octet-stream');
}

describe('InstitutionsService import file boundary', () => {
  it('detects CSV and XLSX headers and keeps positional CSV import', async () => {
    const { service } = setup();
    const csv = Buffer.from('Student Name,Email Address\nJohn Student,john.student@example.test');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Candidates');
    sheet.addRow(['Student Name', 'Email Address']);
    sheet.addRow(['John Student', 'john.student@example.test']);
    const headers = { headers: ['Student Name', 'Email Address'] };
    await expect(probe(service, csv, 'candidates.csv')).resolves.toMatchObject(headers);
    await expect(
      probe(service, Buffer.from(await workbook.xlsx.writeBuffer()), 'candidates.xlsx'),
    ).resolves.toMatchObject(headers);
    await expect(
      service.importBatchMembers(
        batchId,
        institutionId,
        csv,
        'candidates.csv',
        'text/csv',
        actorId,
      ),
    ).resolves.toMatchObject({ imported: 1, skipped: 0 });
  });

  it.each([
    ['candidates.pdf', Buffer.from('%PDF-test'), 'Unsupported file type'],
    ['candidates.csv', Buffer.alloc(0), 'file is empty'],
    ['candidates.csv', Buffer.alloc(5 * 1024 * 1024 + 1, 0x61), 'exceeds the 5 MB limit'],
    ['candidates.xlsx', Buffer.from('not-a-zip'), 'Could not read XLSX'],
    ['candidates.csv', Buffer.from('%PDF-test\u0000'), 'Could not read CSV'],
  ])('rejects unreadable or unsupported input: %s', async (fileName, file, message) => {
    const { service } = setup();
    await expect(probe(service, file, fileName)).rejects.toThrow(message);
  });

  // ExcelJS parses the full 10,001-row CSV before the row-limit check, which
  // regularly exceeds Vitest's default 5s on CI. The 10k cap itself is unchanged.
  it('rejects spreadsheets above the candidate row limit', async () => {
    const { service } = setup();
    const rows = Array.from(
      { length: 10_001 },
      (_, i) => `S${String(i)},s${String(i)}@example.test`,
    );
    await expect(
      probe(service, Buffer.from(['Name,Email', ...rows].join('\n')), 'candidates.csv'),
    ).rejects.toThrow('10000 candidate row limit');
  }, 45_000);
});
