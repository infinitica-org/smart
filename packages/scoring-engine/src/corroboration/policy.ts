import type { ProficiencyLevel } from '@smart/contracts';

/**
 * Practitioner-frozen corroboration policy defaults (S6-RM-10).
 * Learned weights replace these via SignalWeightModel when cohort data exists.
 *
 * Owner: Ramansh.
 */

export interface CorroborationPolicy {
  /** Passive score floor (0–1) below which a passed assessment triggers review. */
  readonly contradictionFloor: Readonly<Record<ProficiencyLevel, number>>;
  /** Minimum passive confidence to treat a dimension as meaningful. */
  readonly minPassiveConfidence: number;
}

export const DEFAULT_CORROBORATION_POLICY: CorroborationPolicy = {
  contradictionFloor: {
    BEGINNER: 0.2,
    INTERMEDIATE: 0.25,
    PROFICIENT: 0.275,
    ADVANCED: 0.3,
    PROFESSIONAL: 0.35,
  },
  minPassiveConfidence: 0.15,
} as const;
