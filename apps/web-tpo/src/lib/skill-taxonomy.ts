import { SKILL_CATEGORIES, SKILL_DEFINITIONS, type SkillCategoryId } from '@smart/contracts';

export function skillNameFor(code: string): string {
  return SKILL_DEFINITIONS.find((skill) => skill.code === code)?.name ?? code;
}

export function skillCategoryFor(code: string): SkillCategoryId | null {
  return SKILL_DEFINITIONS.find((skill) => skill.code === code)?.categoryId ?? null;
}

export function categoryLabel(categoryId: SkillCategoryId): string {
  return SKILL_CATEGORIES[categoryId].name;
}

export function categoryNameForSkillCode(code: string): string {
  const categoryId = skillCategoryFor(code);
  return categoryId ? categoryLabel(categoryId) : 'Uncategorized';
}
