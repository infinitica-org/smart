/**
 * Versioned skill dimension references — decouple corroboration from a fixed taxonomy.
 *
 * Owner: Ramansh (S6-RM-10 corroboration engine).
 */

import type { ProficiencyLevel } from './skills.js';

/** Active taxonomy version for passive-signal encoding. Bump when INF-05 changes. */
export const ACTIVE_TAXONOMY_VERSION = 'inf-05@3' as const;

export interface SkillDimensionRef {
  readonly taxonomyVersion: string;
  /** Opaque stable key within the taxonomy version (typically catalog skillCode). */
  readonly dimensionKey: string;
  readonly skillCode?: string;
  readonly proficiencyLevel?: ProficiencyLevel;
}
