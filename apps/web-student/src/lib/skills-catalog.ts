import { SKILL_DEFINITIONS, SKILL_PROFICIENCIES, type SkillDefinition } from '@smart/contracts';

/**
 * V1 candidate onboarding only ships the Software Engineering stream — the
 * catalog's `SOFTWARE_DEVELOPMENT` role-depth skills plus the `UNIVERSAL`
 * core skills every stream shares.
 */
export const ONBOARDING_STREAM = 'SOFTWARE_DEVELOPMENT' as const;

/** Two catalog skills bundle multiple languages/frameworks under one code — no per-item skill code exists yet. */
export const MULTI_ITEM_SKILL_CODES = [
  'LANGUAGE_PROFICIENCY',
  'FRONTEND_BACKEND_FRAMEWORK',
] as const;

const relevantSkills = SKILL_DEFINITIONS.filter(
  (skill) => skill.stream === 'UNIVERSAL' || skill.stream === ONBOARDING_STREAM,
);

export const CORE_SKILLS: readonly SkillDefinition[] = relevantSkills.filter(
  (skill) => skill.stream === 'UNIVERSAL',
);

export const NICHE_SKILLS: readonly SkillDefinition[] = relevantSkills.filter(
  (skill) => skill.stream === ONBOARDING_STREAM,
);

/** Niche skills with a single proficiency selector (everything except the two multi-item ones). */
export const SINGLE_VALUE_NICHE_SKILLS: readonly SkillDefinition[] = NICHE_SKILLS.filter(
  (skill) => !(MULTI_ITEM_SKILL_CODES as readonly string[]).includes(skill.code),
);

/** Catalog skill code -> catalog name, so onboarding sends the exact name the backend matches on. */
export const SKILL_CODE_TO_NAME = new Map(relevantSkills.map((skill) => [skill.code, skill.name]));

export const LANGUAGE_PROFICIENCY_SKILL = NICHE_SKILLS.find(
  (skill) => skill.code === 'LANGUAGE_PROFICIENCY',
);
export const FRONTEND_BACKEND_FRAMEWORK_SKILL = NICHE_SKILLS.find(
  (skill) => skill.code === 'FRONTEND_BACKEND_FRAMEWORK',
);

/** Self-declared proficiency options during onboarding — PROFESSIONAL is earned via verification, never self-declared. */
export const SELF_DECLARED_PROFICIENCIES = SKILL_PROFICIENCIES;

export const PROFICIENCY_LABELS: Record<(typeof SKILL_PROFICIENCIES)[number], string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export const COMMON_PROGRAMMING_LANGUAGES = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'C',
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

export const COMMON_FRAMEWORKS = [
  'React',
  'Next.js',
  'Vue',
  'Angular',
  'Node.js',
  'Express',
  'Django',
  'Flask',
  'Spring Boot',
  '.NET',
  'FastAPI',
  'NestJS',
];
