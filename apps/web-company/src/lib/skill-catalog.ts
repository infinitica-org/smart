import { SKILL_DEFINITIONS } from '@smart/contracts';
import type { SkillLevel } from './types';

/** The proficiency levels the API accepts, in ascending order. */
export type Proficiency = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';

const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));

/** A skill chosen from the platform catalog, with the minimum level the employer requires. */
export type SkillReq = { code: string; name: string; level: SkillLevel };

export interface CatalogGroup {
  categoryName: string;
  skills: { code: string; name: string }[];
}

/** The platform's skill catalog grouped by category, each group sorted by name. */
export const SKILL_CATALOG_GROUPS: CatalogGroup[] = (() => {
  const groups = new Map<string, CatalogGroup>();
  for (const skill of SKILL_DEFINITIONS) {
    const group = groups.get(skill.categoryId) ?? { categoryName: skill.categoryName, skills: [] };
    group.skills.push({ code: skill.code, name: skill.name });
    groups.set(skill.categoryId, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    skills: group.skills.sort((a, b) => a.name.localeCompare(b.name)),
  }));
})();

export function isCatalogSkill(code: string): boolean {
  return SKILL_NAME_BY_CODE.has(code);
}

export function skillNameForCode(code: string): string {
  return SKILL_NAME_BY_CODE.get(code) ?? code;
}

const LEVEL_TO_PROFICIENCY: Record<SkillLevel, Proficiency> = {
  Beginner: 'BEGINNER',
  Intermediate: 'INTERMEDIATE',
  Advanced: 'ADVANCED',
  Professional: 'PROFESSIONAL',
};

const PROFICIENCY_TO_LEVEL: Record<string, SkillLevel> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  PROFICIENT: 'Intermediate',
  ADVANCED: 'Advanced',
  PROFESSIONAL: 'Professional',
};

export function levelToProficiency(level: SkillLevel): Proficiency {
  return LEVEL_TO_PROFICIENCY[level];
}

export function proficiencyToLevel(proficiency: string): SkillLevel {
  return PROFICIENCY_TO_LEVEL[proficiency] ?? 'Intermediate';
}

/** The API shape for an opening's required skills. Only real catalog codes ever reach it. */
export function toRequiredSkills(
  skills: readonly SkillReq[],
): { skillCode: string; minProficiency: Proficiency }[] {
  return skills.map((skill) => ({
    skillCode: skill.code,
    minProficiency: levelToProficiency(skill.level),
  }));
}

/** Rebuilds the editor state from a saved opening; the display name comes from the catalog. */
export function fromRequiredSkills(
  rows: readonly { skillCode: string; minProficiency: string }[] | undefined,
): SkillReq[] {
  return (rows ?? []).map((row) => ({
    code: row.skillCode,
    name: skillNameForCode(row.skillCode),
    level: proficiencyToLevel(row.minProficiency),
  }));
}
