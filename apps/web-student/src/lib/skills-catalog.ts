import {
  SKILL_CATEGORIES,
  SKILL_CATEGORY_IDS,
  SKILL_DEFINITIONS,
  type SkillCategoryId,
  type SkillDefinition,
  proficiencyLevelUiLabel,
} from '@smart/contracts';

export const ALL_SKILLS: readonly SkillDefinition[] = SKILL_DEFINITIONS;

export const CATEGORY_OPTIONS = SKILL_CATEGORY_IDS.map((id) => ({
  id,
  name: SKILL_CATEGORIES[id].name,
}));

export function skillsForCategory(categoryId: SkillCategoryId): readonly SkillDefinition[] {
  return SKILL_DEFINITIONS.filter((skill) => skill.categoryId === categoryId);
}

/** Onboarding: architecture & design skills shown as single-value proficiency rows. */
export const CORE_SKILLS: readonly SkillDefinition[] = skillsForCategory(
  'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
);

/** Onboarding: DevOps skills shown as single-value proficiency rows. */
export const SINGLE_VALUE_NICHE_SKILLS: readonly SkillDefinition[] = skillsForCategory(
  'DEVOPS_INFRASTRUCTURE',
).slice(0, 5);

export const SKILL_CODE_TO_NAME = new Map(
  SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]),
);

export const SELF_DECLARED_PROFICIENCIES = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'PROFESSIONAL',
] as const;

export const PROFICIENCY_LABELS: Record<string, string> = {
  BEGINNER: proficiencyLevelUiLabel('BEGINNER'),
  INTERMEDIATE: proficiencyLevelUiLabel('INTERMEDIATE'),
  ADVANCED: proficiencyLevelUiLabel('ADVANCED'),
  PROFESSIONAL: proficiencyLevelUiLabel('PROFESSIONAL'),
};

export const CONTROLLED_PROGRAMMING_LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Kotlin',
  'Swift',
  'PHP',
  'Ruby',
  'SQL',
];

export const FRONTEND_FRAMEWORKS = [
  'React',
  'Next.js',
  'Vue.js',
  'Angular',
  'Svelte',
  'HTML5 / CSS3',
];

export const BACKEND_FRAMEWORKS = [
  'Node.js / Express',
  'Spring Boot',
  'Django',
  'FastAPI',
  '.NET Core',
  'Ruby on Rails',
];
