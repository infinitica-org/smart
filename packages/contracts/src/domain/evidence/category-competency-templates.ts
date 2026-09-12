import { createHash } from 'node:crypto';
import type { SkillCategoryId } from '../skill-taxonomy.js';
import type { SkillCompetency } from './skill-competency.js';
import type { ProficiencyRequirement } from './proficiency-requirements.js';
import type { ProficiencyLevel } from '../skill-levels.js';

const COMPETENCY_SLOTS: ReadonlyArray<{
  readonly slot: number;
  readonly capability: string;
  readonly observableBehaviours: readonly string[];
  readonly difficulty: ProficiencyLevel;
}> = [
  {
    slot: 1,
    capability: 'Fundamentals',
    observableBehaviours: [
      'recalls core concepts accurately',
      'identifies correct terminology and behaviour',
    ],
    difficulty: 'BEGINNER',
  },
  {
    slot: 2,
    capability: 'Basic Application',
    observableBehaviours: ['applies concepts to bounded problems', 'follows established patterns'],
    difficulty: 'BEGINNER',
  },
  {
    slot: 3,
    capability: 'Problem Solving',
    observableBehaviours: [
      'decomposes problems into solvable steps',
      'selects appropriate techniques under constraints',
    ],
    difficulty: 'INTERMEDIATE',
  },
  {
    slot: 4,
    capability: 'Debugging',
    observableBehaviours: [
      'isolates root cause',
      'interprets errors',
      'produces and explains a correct fix',
    ],
    difficulty: 'ADVANCED',
  },
  {
    slot: 5,
    capability: 'Optimization',
    observableBehaviours: [
      'improves performance or reliability with justification',
      'evaluates trade-offs',
    ],
    difficulty: 'ADVANCED',
  },
  {
    slot: 6,
    capability: 'Design & Architecture',
    observableBehaviours: [
      'structures systems or processes appropriately',
      'justifies design decisions under real constraints',
    ],
    difficulty: 'PROFESSIONAL',
  },
];

/** Deterministic UUID-shaped id per category competency slot (no runtime randomness). */
export function stableCompetencyId(categoryId: SkillCategoryId, slot: number): string {
  const hex = createHash('sha256')
    .update(`${categoryId}:C${String(slot)}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function buildCategoryCompetencyModel(
  skillCode: string,
  categoryId: SkillCategoryId,
): SkillCompetency[] {
  return COMPETENCY_SLOTS.map((entry) => ({
    competencyId: stableCompetencyId(categoryId, entry.slot),
    skillCode,
    capability: entry.capability,
    observableBehaviours: [...entry.observableBehaviours],
    difficulty: entry.difficulty,
    assessmentCriteria: [
      `Demonstrates ${entry.capability.toLowerCase()} behaviours under assessment conditions`,
    ],
    prerequisites: entry.slot > 1 ? [stableCompetencyId(categoryId, entry.slot - 1)] : [],
    role: entry.slot <= 2 ? 'core' : entry.slot <= 4 ? 'supporting' : 'critical',
  }));
}

export function buildDefaultProficiencyRequirements(
  categoryId: SkillCategoryId,
): ProficiencyRequirement[] {
  const c = (slot: number) => stableCompetencyId(categoryId, slot);
  return [
    { level: 'BEGINNER', requiredCompetencyIds: [c(1)], criticalCompetencyIds: [c(1)] },
    {
      level: 'INTERMEDIATE',
      requiredCompetencyIds: [c(1), c(2), c(3)],
      criticalCompetencyIds: [c(3)],
    },
    {
      level: 'ADVANCED',
      requiredCompetencyIds: [c(1), c(2), c(3), c(4), c(5)],
      criticalCompetencyIds: [c(4), c(5)],
    },
    {
      level: 'PROFESSIONAL',
      requiredCompetencyIds: [c(1), c(2), c(3), c(4), c(5), c(6)],
      criticalCompetencyIds: [c(5), c(6)],
    },
  ];
}

export function competencyIdsForCategory(categoryId: SkillCategoryId): string[] {
  return COMPETENCY_SLOTS.map((entry) => stableCompetencyId(categoryId, entry.slot));
}
