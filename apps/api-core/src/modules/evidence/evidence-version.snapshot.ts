import { createHash } from 'node:crypto';
import type { EvidenceRecordDto } from '@smart/contracts';
import type { EvidenceArtifact, EvidenceRecord } from '../../generated/prisma/index.js';
import { toEvidenceRecordDto } from './evidence.mapper.js';

const VERSION_CONTENT_FIELDS = [
  'evidenceType',
  'source',
  'sourceOwner',
  'sourceReference',
  'evidenceDate',
  'submissionDate',
  'claim',
  'context',
  'provenance',
  'accessibility',
  'relatedSkillCodes',
  'verificationStatus',
  'evidenceStrength',
  'evidenceReliability',
  'freshness',
  'sourceEntityId',
  'sourcePayload',
  'verificationMetadata',
] as const;

export type EvidenceRecordRow = EvidenceRecord & { artifacts?: EvidenceArtifact[] };

export function buildEvidenceSnapshot(row: EvidenceRecordRow): EvidenceRecordDto {
  return toEvidenceRecordDto(row);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableValue(record[key]);
        return acc;
      }, {});
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export function normalizeEvidenceContent(row: EvidenceRecordRow): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const field of VERSION_CONTENT_FIELDS) {
    const value = row[field];
    if (field === 'relatedSkillCodes' && Array.isArray(value)) {
      normalized[field] = [...value].sort();
      continue;
    }
    if (field === 'submissionDate' && value instanceof Date) {
      normalized[field] = value.toISOString();
      continue;
    }
    normalized[field] = stableValue(value ?? null);
  }
  return normalized;
}

export function hashEvidenceContent(row: EvidenceRecordRow): string {
  const payload = JSON.stringify(normalizeEvidenceContent(row));
  return createHash('sha256').update(payload).digest('hex');
}

export function evidenceContentEquals(left: EvidenceRecordRow, right: EvidenceRecordRow): boolean {
  return hashEvidenceContent(left) === hashEvidenceContent(right);
}

export function redactEvidenceSnapshot(snapshot: EvidenceRecordDto): EvidenceRecordDto {
  const {
    sourcePayload: _sp,
    sourceOwner: _so,
    sourceReference: _sr,
    verificationMetadata: _vm,
    ...rest
  } = snapshot;
  return rest;
}
