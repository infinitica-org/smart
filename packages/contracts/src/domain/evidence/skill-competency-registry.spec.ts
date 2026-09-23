import { describe, expect, it } from 'vitest';
import { SKILL_CODES } from '../skill-taxonomy.js';
import {
  getSkillAssessmentSpec,
  getSkillBlueprint,
  sdeFormCodeForSkill,
} from './skill-competency-registry.js';

describe('skill-competency-registry', () => {
  it('covers every catalog skill with a six-slot competency model', () => {
    for (const code of SKILL_CODES) {
      const blueprint = getSkillBlueprint(code);
      expect(blueprint, code).toBeDefined();
      expect(blueprint?.competencyModel).toHaveLength(6);
      expect(blueprint?.proficiencyRequirements?.length).toBe(5);
    }
  });

  it('maps computer vision to domain-specific competencies and assessment spec', () => {
    const blueprint = getSkillBlueprint('COMPUTER_VISION_ENGINEERING');
    expect(blueprint?.competencyModel[2]?.capability).toContain('CNN');
    const spec = getSkillAssessmentSpec('COMPUTER_VISION_ENGINEERING');
    expect(spec?.catalogSkillName).toBe('Computer Vision');
    expect(spec?.flavorNotes).toContain('IoU/mAP metrics');
    expect(sdeFormCodeForSkill('COMPUTER_VISION_ENGINEERING')).toBe('SDE_PROGRAMMING_FUNDAMENTALS');
  });

  it('assigns unique competency ids per skill', () => {
    const python = getSkillBlueprint('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    const java = getSkillBlueprint('JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT');
    expect(python?.competencyModel[0]?.competencyId).not.toBe(
      java?.competencyModel[0]?.competencyId,
    );
  });

  it('applies per-skill verification overrides from registry profiles', () => {
    const python = getSkillBlueprint('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    const aws = getSkillBlueprint('AMAZON_WEB_SERVICES_AWS_ARCHITECTURE');
    const pythonAdvanced = python?.proficiencyRequirements.find((row) => row.level === 'ADVANCED');
    const awsAdvanced = aws?.proficiencyRequirements.find((row) => row.level === 'ADVANCED');
    expect(pythonAdvanced?.realWorldApplicationRequired).toBe(false);
    expect(awsAdvanced?.realWorldApplicationRequired).toBe(true);
  });
});
