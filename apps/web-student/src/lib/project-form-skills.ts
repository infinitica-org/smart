import { getSkillDefinition, type SkillLibraryResponse } from '@smart/contracts';

export type ProjectSkillOption = {
  code: string;
  name: string;
  categoryName: string;
};

export function flattenSkillLibrary(library: SkillLibraryResponse): ProjectSkillOption[] {
  const rows: ProjectSkillOption[] = [];
  for (const category of library.categories) {
    for (const skill of category.skills) {
      rows.push({
        code: skill.code,
        name: skill.name,
        categoryName: category.name,
      });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function stackLabelFromSkillCodes(codes: readonly string[]): string {
  const names = codes.map((code) => getSkillDefinition(code)?.name ?? code).filter(Boolean);
  return names.join(', ');
}

export function defaultSkillContribution(approach: string): string {
  const trimmed = approach.trim();
  if (trimmed.length >= 10) return trimmed.slice(0, 4000);
  return 'Applied this skill while building and delivering this project.';
}
