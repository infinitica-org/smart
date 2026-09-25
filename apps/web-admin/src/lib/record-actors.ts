import type { RecordActorDto } from '@smart/contracts';

/**
 * S6-VV-105 (#168) — "Created by … · Last modified by …" for tenant detail headers.
 * Empty when neither is known (records created before tracking began).
 */
export function formatRecordActors(record?: {
  createdBy?: RecordActorDto;
  updatedBy?: RecordActorDto;
}): string {
  const parts: string[] = [];
  if (record?.createdBy) parts.push(`Created by ${record.createdBy.email}`);
  if (record?.updatedBy) parts.push(`Last modified by ${record.updatedBy.email}`);
  return parts.join(' · ');
}
