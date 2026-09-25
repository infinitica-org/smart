/**
 * S6-VV-101 (#496) — pure formatting for audit-log exports.
 */
export type AuditExportFormat = 'csv' | 'jsonl';

export interface AuditExportRow {
  id: string;
  createdAt: Date;
  action: string;
  actorId: string | null;
  actor?: { email: string; role: string } | null;
  resourceType: string;
  resourceId: string | null;
  reasonCode: string | null;
  metadata: unknown;
}

export const AUDIT_EXPORT_COLUMNS = [
  'createdAt',
  'action',
  'actorId',
  'actorEmail',
  'actorRole',
  'resourceType',
  'resourceId',
  'reasonCode',
  'metadata',
] as const;

/**
 * RFC 4180 quoting plus spreadsheet formula-injection protection: a cell that
 * starts with = + - @ (or a tab/CR) is prefixed with ' so Excel/Sheets show it
 * as text instead of evaluating attacker-influenced input (e.g. a reason).
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'string' ? value : JSON.stringify(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toRecord(row: AuditExportRow): Record<(typeof AUDIT_EXPORT_COLUMNS)[number], unknown> {
  return {
    createdAt: row.createdAt.toISOString(),
    action: row.action,
    actorId: row.actorId,
    actorEmail: row.actor?.email ?? null,
    actorRole: row.actor?.role ?? null,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    reasonCode: row.reasonCode,
    metadata: row.metadata ?? null,
  };
}

export function auditExportHeader(format: AuditExportFormat): string {
  return format === 'csv' ? `${AUDIT_EXPORT_COLUMNS.join(',')}\r\n` : '';
}

export function auditExportLine(row: AuditExportRow, format: AuditExportFormat): string {
  const record = toRecord(row);
  if (format === 'jsonl') return `${JSON.stringify(record)}\n`;
  return `${AUDIT_EXPORT_COLUMNS.map((column) => csvCell(record[column])).join(',')}\r\n`;
}
