import { describe, expect, it } from 'vitest';
import { AssessmentIntelligenceService } from './assessment-intelligence.service.js';
import { getSkillBlueprint } from '@smart/contracts';

describe('AssessmentIntelligenceService', () => {
  const service = new AssessmentIntelligenceService();

  it('uses declared-target mode when target proficiency is supplied', () => {
    const blueprint = getSkillBlueprint('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    if (!blueprint) throw new Error('missing blueprint fixture');
    const [c0, c1, c2, c3] = blueprint.competencyModel;
    if (!c0 || !c1 || !c2 || !c3) throw new Error('incomplete competency model fixture');
    const grade = {
      scorePercent: 80,
      passed: true,
      itemResults: [
        { index: 1, marksEarned: 1, marksMax: 1, competencyIds: [c0.competencyId] },
        { index: 2, marksEarned: 1, marksMax: 1, competencyIds: [c1.competencyId] },
        { index: 3, marksEarned: 1, marksMax: 1, competencyIds: [c2.competencyId] },
        { index: 4, marksEarned: 10, marksMax: 10, competencyIds: [c3.competencyId] },
      ],
    };

    const result = service.buildAssessmentResult({
      catalogSkillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      attemptId: 'attempt-1',
      blueprint,
      grade: grade as never,
      competencyIdsByIndex: new Map(
        grade.itemResults.map((row) => [row.index, row.competencyIds ?? []] as const),
      ),
      targetProficiency: 'PROFICIENT',
      verificationMode: 'declared-target',
      allowUpwardProbe: false,
    });

    expect(result.targetProficiency).toBe('PROFICIENT');
    expect(result.highestAssessmentSupportedProficiency).toBe('PROFICIENT');
    expect(service.claimPassesFromAssessment(result)).toBe(true);
  });

  it('fails declared target when supported proficiency is below claim', () => {
    const blueprint = getSkillBlueprint('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    if (!blueprint) throw new Error('missing blueprint fixture');
    const firstCompetency = blueprint.competencyModel[0];
    if (!firstCompetency) throw new Error('incomplete competency model fixture');
    const c1 = firstCompetency.competencyId;
    const grade = {
      scorePercent: 90,
      passed: true,
      itemResults: [{ index: 1, marksEarned: 1, marksMax: 1, competencyIds: [c1] }],
    };
    const result = service.buildAssessmentResult({
      catalogSkillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      attemptId: 'attempt-2',
      blueprint,
      grade: grade as never,
      competencyIdsByIndex: new Map([[1, [c1]]]),
      targetProficiency: 'PROFICIENT',
      verificationMode: 'declared-target',
      allowUpwardProbe: false,
    });
    expect(result.highestAssessmentSupportedProficiency).toBe('BEGINNER');
    expect(service.claimPassesFromAssessment(result)).toBe(false);
  });
});
