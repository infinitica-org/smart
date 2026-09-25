import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  auditExportHeader,
  auditExportLine,
  csvCell,
  type AuditExportRow,
} from './audit-log-export.js';
import { AUDIT_EXPORT_MAX_ROWS, AuditLogExportService } from './audit-log-export.service.js';
import { InstitutionsAdminController } from './institutions-admin.controller.js';

function row(overrides: Partial<AuditExportRow> = {}): AuditExportRow {
  return {
    id: 'row-1',
    createdAt: new Date('2026-09-25T10:00:00.000Z'),
    action: 'institution.held',
    actorId: 'admin-1',
    actor: { email: 'admin@smart.test', role: 'SUPER_ADMIN' },
    resourceType: 'institution',
    resourceId: 'inst-1',
    reasonCode: 'overdue invoice',
    metadata: { planCode: 'PRO' },
    ...overrides,
  };
}

describe('audit export formatting (S6-VV-101)', () => {
  it('quotes commas, quotes and newlines per RFC 4180', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell(null)).toBe('');
  });

  it('neutralises spreadsheet formulas in exported text', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('writes a CSV header and one line per record, metadata as JSON', () => {
    expect(auditExportHeader('csv')).toBe(
      'createdAt,action,actorId,actorEmail,actorRole,resourceType,resourceId,reasonCode,metadata\r\n',
    );
    expect(auditExportLine(row(), 'csv')).toBe(
      '2026-09-25T10:00:00.000Z,institution.held,admin-1,admin@smart.test,SUPER_ADMIN,institution,inst-1,overdue invoice,"{""planCode"":""PRO""}"\r\n',
    );
  });

  it('writes JSON Lines with no header', () => {
    expect(auditExportHeader('jsonl')).toBe('');
    expect(JSON.parse(auditExportLine(row({ actor: null }), 'jsonl'))).toMatchObject({
      action: 'institution.held',
      actorEmail: null,
      metadata: { planCode: 'PRO' },
    });
  });
});

describe('AuditLogExportService (S6-VV-101)', () => {
  async function collect(lines: AsyncGenerator<string>): Promise<string[]> {
    const out: string[] = [];
    for await (const line of lines) out.push(line);
    return out;
  }

  it('refuses an export over the row cap without auditing it', async () => {
    const prisma = { auditLog: { count: vi.fn().mockResolvedValue(AUDIT_EXPORT_MAX_ROWS + 1) } };
    const audit = { record: vi.fn() };
    const service = new AuditLogExportService(prisma as never, audit as never);

    await expect(service.prepare({}, 'csv', 'admin-1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('audits the export with its filter, then streams every page by keyset', async () => {
    const pageOne = Array.from({ length: 5_000 }, (_, i) => row({ id: `a${i}` }));
    const pageTwo = [row({ id: 'b0' })];
    const findMany = vi.fn().mockResolvedValueOnce(pageOne).mockResolvedValueOnce(pageTwo);
    const prisma = { auditLog: { count: vi.fn().mockResolvedValue(5_001), findMany } };
    const audit = { record: vi.fn() };
    const service = new AuditLogExportService(prisma as never, audit as never);

    const prepared = await service.prepare({ action: 'institution' }, 'csv', 'admin-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'audit.exported',
        metadata: { format: 'csv', rowCount: 5_001, filter: { action: 'institution' } },
      }),
    );

    const lines = await collect(prepared.lines);
    expect(lines).toHaveLength(1 + 5_001);
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[0]?.[0]).not.toHaveProperty('cursor');
    expect(findMany.mock.calls[1]?.[0]).toMatchObject({ cursor: { id: 'a4999' }, skip: 1 });
    expect(findMany.mock.calls[0]?.[0].where).toEqual({
      action: { contains: 'institution', mode: 'insensitive' },
    });
  });
});

describe('GET /admin/audit-logs/export (S6-VV-101)', () => {
  it('streams a CSV attachment with the parsed filters and format', async () => {
    const prepare = vi.fn().mockResolvedValue({
      rowCount: 1,
      lines: (async function* () {
        yield auditExportHeader('csv');
        yield auditExportLine(row(), 'csv');
      })(),
    });
    const controller = new InstitutionsAdminController({} as never, { prepare } as never);
    const headers: Record<string, string> = {};
    let body: NodeJS.ReadableStream | undefined;
    const reply = {
      header(name: string, value: string) {
        headers[name] = value;
        return reply;
      },
      send(payload: NodeJS.ReadableStream) {
        body = payload;
        return reply;
      },
    };

    await controller.exportAuditLogs(
      { action: 'institution', format: 'csv', q: '' },
      { sub: 'admin-1', role: 'SUPER_ADMIN', inst: null } as never,
      reply as never,
    );

    expect(prepare).toHaveBeenCalledWith({ action: 'institution' }, 'csv', 'admin-1');
    expect(headers['Content-Type']).toBe('text/csv; charset=utf-8');
    expect(headers['Content-Disposition']).toMatch(
      /^attachment; filename="smart-audit-log-.*\.csv"$/,
    );
    let text = '';
    for await (const chunk of body as AsyncIterable<string>) text += chunk;
    expect(text.split('\r\n')[1]).toContain('institution.held');
  });

  it('rejects an unknown format before touching the database', async () => {
    const prepare = vi.fn();
    const controller = new InstitutionsAdminController({} as never, { prepare } as never);

    await expect(
      controller.exportAuditLogs({ format: 'xlsx' }, { sub: 'admin-1' } as never, {} as never),
    ).rejects.toThrow();
    expect(prepare).not.toHaveBeenCalled();
  });
});
