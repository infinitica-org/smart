import type { JobFitSummary, PublicCandidateProfileDto } from '@smart/contracts';
import { APPLICATION_SNAPSHOT_VERSION } from '@smart/contracts';

/** Evidence a snapshot relies on. While the application exists, these cannot be deleted. */
export interface EvidenceRef {
  readonly type: 'work_experience' | 'work_experience_document';
  readonly id: string;
}

export interface SnapshotSkill {
  readonly code: string;
  readonly name: string;
  readonly proficiency: string;
}

export interface SnapshotInput {
  readonly profile: PublicCandidateProfileDto;
  readonly verifiedSkills: readonly SnapshotSkill[];
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly fit: JobFitSummary | null;
}

export interface SnapshotRecord {
  readonly profileJson: unknown;
  readonly skillsJson: unknown;
  readonly evidenceRefs: unknown;
  readonly fitJson: unknown;
  readonly serializerVersion: number;
}

/**
 * The immutable payload stored with an application (Th6-394). Values are deep-copied through JSON so
 * nothing the caller holds can change what was stored, and so what we store is exactly what the
 * employer-visible serializer produced at that moment.
 */
export function buildSnapshotRecord(input: SnapshotInput): SnapshotRecord {
  const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    profileJson: copy(input.profile),
    skillsJson: copy(input.verifiedSkills),
    evidenceRefs: copy(input.evidenceRefs),
    fitJson: input.fit ? copy(input.fit) : null,
    serializerVersion: APPLICATION_SNAPSHOT_VERSION,
  };
}

/** Reads a stored fit back; anything malformed is treated as "no fit" rather than trusted. */
export function readSnapshotFit(value: unknown): JobFitSummary | null {
  if (typeof value !== 'object' || value === null) return null;
  const fit = value as Partial<JobFitSummary>;
  if (
    (fit.band === 'STRONG' || fit.band === 'MODERATE' || fit.band === 'STRETCH') &&
    typeof fit.matchPercent === 'number'
  ) {
    return {
      band: fit.band,
      matchPercent: fit.matchPercent,
      topReason: typeof fit.topReason === 'string' ? fit.topReason : null,
    };
  }
  return null;
}

/** Candidate name as it was when they applied. */
export function readSnapshotName(profileJson: unknown): string {
  if (typeof profileJson === 'object' && profileJson !== null) {
    const name = (profileJson as { fullName?: unknown }).fullName;
    if (typeof name === 'string' && name.trim()) return name;
  }
  return 'Candidate';
}
