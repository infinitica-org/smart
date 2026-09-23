import { describe, expect, it } from 'vitest';
import {
  buildCategoryCompetencyModel,
  buildDefaultProficiencyRequirements,
  stableCompetencyId,
} from './category-competency-templates.js';
import { resolveProficiencyVerification } from './proficiency-requirements.js';
import { buildSkillBlueprintForCategory } from './skill-blueprint.js';

describe('category-competency-templates', () => {
  it('builds six competencies per category with stable ids', () => {
    const model = buildCategoryCompetencyModel(
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      'PROGRAMMING_LANGUAGES',
    );
    expect(model).toHaveLength(6);
    expect(model[0]?.competencyId).toBe(stableCompetencyId('PROGRAMMING_LANGUAGES', 1));
    expect(model[5]?.role).toBe('critical');
  });

  it('maps advanced proficiency to first five competencies', () => {
    const requirements = buildDefaultProficiencyRequirements('PROGRAMMING_LANGUAGES');
    const advanced = requirements.find((row) => row.level === 'ADVANCED');
    expect(advanced?.requiredCompetencyIds).toHaveLength(5);
    expect(advanced?.criticalCompetencyIds).toHaveLength(2);
  });

  it('builds a populated skill blueprint', () => {
    const blueprint = buildSkillBlueprintForCategory(
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      'Python Application Backend Development',
      'SOFTWARE_IT',
      'Programming Languages',
      'PROGRAMMING_LANGUAGES',
    );
    expect(blueprint.competencyModel).toHaveLength(6);
    expect(blueprint.proficiencyRequirements).toHaveLength(5);
  });
});

describe('resolveProficiencyVerification', () => {
  it('reads verification flags from blueprint proficiency requirements', () => {
    const requirements = buildDefaultProficiencyRequirements('PROGRAMMING_LANGUAGES');
    expect(resolveProficiencyVerification(requirements, 'BEGINNER')).toEqual({
      realWorldApplicationRequired: false,
      substantialApplicationRequired: false,
      interviewRequired: false,
    });
    expect(resolveProficiencyVerification(requirements, 'ADVANCED')).toEqual({
      realWorldApplicationRequired: true,
      substantialApplicationRequired: false,
      interviewRequired: true,
    });
    expect(resolveProficiencyVerification(requirements, 'PROFESSIONAL')).toEqual({
      realWorldApplicationRequired: true,
      substantialApplicationRequired: true,
      interviewRequired: true,
    });
  });

  it('falls back to legacy level gates when requirement row is missing', () => {
    expect(resolveProficiencyVerification([], 'ADVANCED')).toEqual({
      realWorldApplicationRequired: false,
      substantialApplicationRequired: false,
      interviewRequired: true,
    });
  });
});
