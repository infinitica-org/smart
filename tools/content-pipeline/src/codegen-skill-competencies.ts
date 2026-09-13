import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORY_ASSESSMENT_DEFAULTS,
  SKILL_REGISTRY_PROFILES,
  type SkillRegistryProfile,
} from './skill-registry-data.js';

interface RawSkill {
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

interface RawTaxonomy {
  categories: Array<{ id: string; skills: RawSkill[] }>;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(here, '../data/taxonomies/skill.json');
const outDir = path.join(here, '../../../packages/contracts/src/generated');

const SLOT_DIFFICULTIES = [
  'BEGINNER',
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'ADVANCED',
  'PROFESSIONAL',
] as const;
const SLOT_ROLES = ['core', 'core', 'supporting', 'critical', 'critical', 'critical'] as const;

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function stableSkillCompetencyId(skillCode: string, slot: number): string {
  const hex = createHash('sha256')
    .update(`${skillCode}:C${String(slot)}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function resolveProfile(skill: RawSkill): SkillRegistryProfile {
  const explicit = SKILL_REGISTRY_PROFILES[skill.code];
  if (explicit) return explicit;
  const defaults =
    CATEGORY_ASSESSMENT_DEFAULTS[skill.categoryId as keyof typeof CATEGORY_ASSESSMENT_DEFAULTS];
  const shortName = skill.name.split('(')[0]?.trim() ?? skill.name;
  return {
    topics: [
      `${shortName} core concepts & terminology`,
      `${shortName} applied fundamentals`,
      `${shortName} problem solving under constraints`,
      `${shortName} debugging & troubleshooting`,
      `${shortName} optimization & trade-offs`,
      `${shortName} system design & industry best practices`,
    ] as SkillRegistryProfile['topics'],
    sdeFormCode: defaults.sdeFormCode,
    taskFamily: defaults.taskFamily,
    focusOptions: [shortName.slice(0, 32)],
    flavorNotes: [`Industry-standard ${shortName} scenarios`],
  };
}

function emitCompetencyModel(skill: RawSkill, profile: SkillRegistryProfile): string {
  const ids = [1, 2, 3, 4, 5, 6].map((slot) => stableSkillCompetencyId(skill.code, slot));
  const entries = profile.topics.map((capability, index) => {
    const slot = index + 1;
    const topic = capability.toLowerCase();
    return `      {
        competencyId: '${ids[index]}',
        skillCode: '${skill.code}',
        capability: '${escapeString(capability)}',
        observableBehaviours: [
          'Explains ${escapeString(topic)} accurately under assessment conditions',
          'Applies ${escapeString(topic)} to bounded practical problems',
        ],
        difficulty: '${SLOT_DIFFICULTIES[index]}',
        assessmentCriteria: [
          'Demonstrates ${escapeString(capability.toLowerCase())} in timed assessment items',
        ],
        prerequisites: ${slot > 1 ? `[ '${ids[index - 1]}' ]` : '[]'},
        role: '${SLOT_ROLES[index]}',
      }`;
  });
  return entries.join(',\n');
}

type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';

const DEFAULT_VERIFICATION_FLAGS: Record<
  ProficiencyLevel,
  {
    realWorldApplicationRequired: boolean;
    substantialApplicationRequired: boolean;
    interviewRequired: boolean;
  }
> = {
  BEGINNER: {
    realWorldApplicationRequired: false,
    substantialApplicationRequired: false,
    interviewRequired: false,
  },
  INTERMEDIATE: {
    realWorldApplicationRequired: false,
    substantialApplicationRequired: false,
    interviewRequired: false,
  },
  ADVANCED: {
    realWorldApplicationRequired: true,
    substantialApplicationRequired: false,
    interviewRequired: true,
  },
  PROFESSIONAL: {
    realWorldApplicationRequired: true,
    substantialApplicationRequired: true,
    interviewRequired: true,
  },
};

function emitVerificationFlags(level: ProficiencyLevel, profile: SkillRegistryProfile): string {
  const merged = {
    ...DEFAULT_VERIFICATION_FLAGS[level],
    ...(profile.proficiencyVerificationOverrides?.[level] ?? {}),
  };
  return [
    `realWorldApplicationRequired: ${String(merged.realWorldApplicationRequired)}`,
    `substantialApplicationRequired: ${String(merged.substantialApplicationRequired)}`,
    `interviewRequired: ${String(merged.interviewRequired)}`,
  ].join(', ');
}

function emitProficiencyRequirements(skill: RawSkill, profile: SkillRegistryProfile): string {
  const ids = [1, 2, 3, 4, 5, 6].map((slot) => stableSkillCompetencyId(skill.code, slot));
  return `[
      { level: 'BEGINNER', requiredCompetencyIds: [ '${ids[0]}' ], criticalCompetencyIds: [ '${ids[0]}' ], ${emitVerificationFlags('BEGINNER', profile)} },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '${ids[0]}', '${ids[1]}', '${ids[2]}' ], criticalCompetencyIds: [ '${ids[2]}' ], ${emitVerificationFlags('INTERMEDIATE', profile)} },
      { level: 'ADVANCED', requiredCompetencyIds: [ '${ids[0]}', '${ids[1]}', '${ids[2]}', '${ids[3]}', '${ids[4]}' ], criticalCompetencyIds: [ '${ids[3]}', '${ids[4]}' ], ${emitVerificationFlags('ADVANCED', profile)} },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '${ids[0]}', '${ids[1]}', '${ids[2]}', '${ids[3]}', '${ids[4]}', '${ids[5]}' ], criticalCompetencyIds: [ '${ids[4]}', '${ids[5]}' ], ${emitVerificationFlags('PROFESSIONAL', profile)} },
    ]`;
}

export function codegenSkillCompetencies(): void {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as RawTaxonomy;
  const skills = raw.categories.flatMap((category) => category.skills);
  mkdirSync(outDir, { recursive: true });

  const competencyEntries = skills.map((skill) => {
    const profile = resolveProfile(skill);
    return `  '${skill.code}': {
    skillCode: '${skill.code}',
    name: '${escapeString(skill.name)}',
    domain: 'SOFTWARE_IT',
    category: '${escapeString(skill.categoryName)}',
    prerequisites: [],
    competencyModel: [
${emitCompetencyModel(skill, profile)}
    ],
    proficiencyRequirements: ${emitProficiencyRequirements(skill, profile)},
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of ${escapeString(skill.name)}',
      INTERMEDIATE: 'Independent execution of bounded ${escapeString(skill.name)} tasks',
      ADVANCED: 'Owns ${escapeString(skill.name)} components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for ${escapeString(skill.name)} at org scale',
    },
    assessmentBlueprint: '${profile.sdeFormCode}',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  }`;
  });

  const assessmentEntries = skills.map((skill) => {
    const profile = resolveProfile(skill);
    return `  '${skill.code}': {
    skillCode: '${skill.code}',
    catalogSkillName: '${escapeString(skill.name)}',
    sdeFormCode: '${profile.sdeFormCode}',
    taskFamily: '${profile.taskFamily}',
    skillFocusOptions: [${profile.focusOptions.map((f) => `'${escapeString(f)}'`).join(', ')}],
    flavorNotes: [${profile.flavorNotes.map((f) => `'${escapeString(f)}'`).join(', ')}],
  }`;
  });

  const competencySource = `/**
 * AUTO-GENERATED from tools/content-pipeline/src/skill-registry-data.ts
 * Regenerate: pnpm --filter @smart/content-pipeline codegen:competencies
 * DO NOT EDIT MANUALLY.
 */
import type { SkillBlueprint } from '../domain/evidence/skill-blueprint.js';

export const SKILL_COMPETENCY_INDEX: Readonly<Record<string, SkillBlueprint>> = {
${competencyEntries.join(',\n')}
} as const;

export const SKILL_COMPETENCY_CODES = Object.keys(SKILL_COMPETENCY_INDEX);
`;

  const assessmentSource = `/**
 * AUTO-GENERATED from tools/content-pipeline/src/skill-registry-data.ts
 * Regenerate: pnpm --filter @smart/content-pipeline codegen:competencies
 * DO NOT EDIT MANUALLY.
 */
import type { SkillAssessmentSpec } from '../domain/skill-assessment-spec.js';

export const SKILL_ASSESSMENT_INDEX: Readonly<Record<string, SkillAssessmentSpec>> = {
${assessmentEntries.join(',\n')}
} as const;

export const SKILL_ASSESSMENT_CODES = Object.keys(SKILL_ASSESSMENT_INDEX);
`;

  writeFileSync(path.join(outDir, 'skill-competency-index.ts'), competencySource, 'utf8');
  writeFileSync(path.join(outDir, 'skill-assessment-index.ts'), assessmentSource, 'utf8');

  const missing = skills.filter((skill) => !SKILL_REGISTRY_PROFILES[skill.code]);
  process.stdout.write(
    `codegen: wrote ${String(skills.length)} skill blueprints (${String(missing.length)} used category fallback)\n`,
  );
}

codegenSkillCompetencies();
