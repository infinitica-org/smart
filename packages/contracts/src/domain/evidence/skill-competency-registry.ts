import { getSkillDefinition } from '../skill-taxonomy.js';
import type { SkillAssessmentSpec } from '../skill-assessment-spec.js';
import { SkillAssessmentSpecSchema } from '../skill-assessment-spec.js';
import { SKILL_ASSESSMENT_INDEX } from '../../generated/skill-assessment-index.js';
import { SKILL_COMPETENCY_INDEX } from '../../generated/skill-competency-index.js';
import { buildSkillBlueprintForCategory } from './skill-blueprint.js';
import type { SkillBlueprint } from './skill-blueprint.js';
import { SkillBlueprintSchema } from './skill-blueprint.js';

export function getSkillBlueprint(skillCode: string): SkillBlueprint | undefined {
  const authored = SKILL_COMPETENCY_INDEX[skillCode];
  if (authored) {
    return SkillBlueprintSchema.parse(authored);
  }
  const definition = getSkillDefinition(skillCode);
  if (!definition) return undefined;
  return buildSkillBlueprintForCategory(
    definition.code,
    definition.name,
    definition.domain,
    definition.categoryName,
    definition.categoryId,
  );
}

export function getSkillAssessmentSpec(skillCode: string): SkillAssessmentSpec | undefined {
  const spec = SKILL_ASSESSMENT_INDEX[skillCode];
  if (!spec) return undefined;
  return SkillAssessmentSpecSchema.parse(spec);
}

export function sdeFormCodeForSkill(skillCode: string): string | null {
  return getSkillAssessmentSpec(skillCode)?.sdeFormCode ?? null;
}

export function skillFocusOptionsForSkill(skillCode: string): readonly string[] {
  return getSkillAssessmentSpec(skillCode)?.skillFocusOptions ?? [];
}

export function resolveSkillFocusForCatalog(
  skillCode: string,
  requested?: string | null,
): string | null {
  const options = skillFocusOptionsForSkill(skillCode);
  if (options.length === 0) {
    const trimmed = requested?.trim() ?? '';
    return trimmed.length > 0 ? trimmed.slice(0, 64) : null;
  }
  if (requested && options.includes(requested)) return requested;
  return options[0] ?? null;
}
