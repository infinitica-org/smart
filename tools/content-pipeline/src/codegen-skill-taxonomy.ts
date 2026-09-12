import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface RawSkill {
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

interface RawCategory {
  id: string;
  name: string;
  skills: RawSkill[];
}

interface RawTaxonomy {
  taxonomyVersion: string;
  categories: RawCategory[];
}

const here = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(here, '../data/taxonomies/skill.json');
const outPath = path.join(here, '../../../packages/contracts/src/domain/skill-taxonomy.ts');

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function emitSkill(skill: RawSkill): string {
  return `  entry('${skill.code}', '${escapeString(skill.name)}', '${skill.categoryId}', '${escapeString(skill.categoryName)}'),`;
}

export function codegenSkillTaxonomy(): void {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as RawTaxonomy;
  const categoryEntries = raw.categories
    .map(
      (category) =>
        `  '${category.id}': { id: '${category.id}', name: '${escapeString(category.name)}' },`,
    )
    .join('\n');

  const skillLines = raw.categories.flatMap((category) => category.skills.map(emitSkill));

  const source = `/**
 * AUTO-GENERATED from tools/content-pipeline/data/taxonomies/skill.json
 * Source: docs/Global_IT_Skills_Database.xlsx (Category + Skill columns)
 * Regenerate: pnpm --filter @smart/content-pipeline codegen:skill
 * DO NOT EDIT MANUALLY.
 */

import {
  DEFAULT_COMPETENCY_BARS,
  levels,
  type LevelThreshold,
  type ProficiencyLevel,
} from './skill-levels.js';

export const SKILL_TAXONOMY_VERSION = '${raw.taxonomyVersion}' as const;
export const SKILL_TAXONOMY_DOMAINS = ['SOFTWARE_IT'] as const;
export type SkillTaxonomyDomain = (typeof SKILL_TAXONOMY_DOMAINS)[number];

export const SKILL_CATEGORY_IDS = [
${raw.categories.map((c) => `  '${c.id}',`).join('\n')}
] as const;
export type SkillCategoryId = (typeof SKILL_CATEGORY_IDS)[number];

export const SKILL_CATEGORIES: Readonly<
  Record<SkillCategoryId, { readonly id: SkillCategoryId; readonly name: string }>
> = {
${categoryEntries}
};

export interface SkillDefinition {
  readonly code: string;
  readonly name: string;
  readonly categoryId: SkillCategoryId;
  readonly categoryName: string;
  readonly domain: SkillTaxonomyDomain;
  readonly levels: Readonly<Record<ProficiencyLevel, LevelThreshold>>;
  readonly corroborationEligible: boolean;
  readonly assessmentRequiredForClaim: boolean;
}

function entry(
  code: string,
  name: string,
  categoryId: SkillCategoryId,
  categoryName: string,
): SkillDefinition {
  return {
    code,
    name,
    categoryId,
    categoryName,
    domain: 'SOFTWARE_IT',
    levels: levels(DEFAULT_COMPETENCY_BARS),
    corroborationEligible: true,
    assessmentRequiredForClaim: true,
  };
}

export const SKILL_DEFINITIONS: readonly SkillDefinition[] = [
${skillLines.join('\n')}
] as const;

export const SKILL_CODES = SKILL_DEFINITIONS.map((skill) => skill.code);
export const SKILL_CODE_SET: ReadonlySet<string> = new Set(SKILL_CODES);

export interface SkillCategoryGroup {
  readonly id: SkillCategoryId;
  readonly name: string;
  readonly skills: readonly SkillDefinition[];
}

export function groupSkillsByCategory(): readonly SkillCategoryGroup[] {
  return SKILL_CATEGORY_IDS.map((id) => ({
    id,
    name: SKILL_CATEGORIES[id].name,
    skills: SKILL_DEFINITIONS.filter((skill) => skill.categoryId === id),
  }));
}

export function getSkillDefinition(code: string): SkillDefinition | undefined {
  return SKILL_DEFINITIONS.find((skill) => skill.code === code);
}
`;

  writeFileSync(outPath, source, 'utf8');
  process.stdout.write(
    `codegen: wrote ${outPath} (${String(raw.categories.length)} categories, ${String(skillLines.length)} skills)\n`,
  );
}

codegenSkillTaxonomy();
