import {
  PROFICIENCY_LEVEL_ORDER,
  type CompetencyStatus,
  type ProficiencyLevel,
} from '@smart/contracts';

export const STATUS_ORDINAL = {
  NOT_TESTED: 0,
  NOT_DEMONSTRATED: 1,
  UNCERTAIN: 2,
  PARTIALLY_DEMONSTRATED: 3,
  DEMONSTRATED: 4,
} as const;

export type CompetencyStatusOrdinal = CompetencyStatus;

const CONFIDENCE_ORDINAL = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
} as const;

export function minStatus(
  a: CompetencyStatus | null,
  b: CompetencyStatus | null,
): CompetencyStatus | null {
  if (a === null) return b;
  if (b === null) return a;
  return STATUS_ORDINAL[a] <= STATUS_ORDINAL[b] ? a : b;
}

export function maxStatus(
  a: CompetencyStatus | null,
  b: CompetencyStatus | null,
): CompetencyStatus | null {
  if (a === null) return b;
  if (b === null) return a;
  return STATUS_ORDINAL[a] >= STATUS_ORDINAL[b] ? a : b;
}

export function minConfidence(
  a: 'LOW' | 'MEDIUM' | 'HIGH',
  b: 'LOW' | 'MEDIUM' | 'HIGH',
): 'LOW' | 'MEDIUM' | 'HIGH' {
  return CONFIDENCE_ORDINAL[a] <= CONFIDENCE_ORDINAL[b] ? a : b;
}

export function capConfidence(
  level: 'LOW' | 'MEDIUM' | 'HIGH',
  cap: 'LOW' | 'MEDIUM' | 'HIGH',
): 'LOW' | 'MEDIUM' | 'HIGH' {
  return minConfidence(level, cap);
}

const PROFICIENCY_ORDER = PROFICIENCY_LEVEL_ORDER;

export function proficiencyCapOrdinal(level: ProficiencyLevel): number {
  return PROFICIENCY_ORDER.indexOf(level);
}

export function capProficiency(
  current: ProficiencyLevel | null,
  cap: ProficiencyLevel,
): ProficiencyLevel | null {
  if (current === null) return null;
  return proficiencyCapOrdinal(current) > proficiencyCapOrdinal(cap) ? cap : current;
}
