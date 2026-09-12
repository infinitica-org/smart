import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import {
  buildCategoryCompetencyModel,
  buildDefaultProficiencyRequirements,
} from '@smart/contracts';
import {
  evaluateAssessmentIntelligence,
  determineSupportedProficiency,
  rollupItemResultsToCompetencies,
  shouldStopTesting,
} from './assessment-intelligence.js';

const skillCode = 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT';
const categoryId = 'PROGRAMMING_LANGUAGES' as const;
const model = buildCategoryCompetencyModel(skillCode, categoryId);
const requirements = buildDefaultProficiencyRequirements(categoryId);

describe('assessment-intelligence', () => {
  it('rolls up item marks into competency statuses', () => {
    const first = model.at(0);
    if (!first) throw new Error('expected competency model fixture');
    const c1 = first.competencyId;
    const results = rollupItemResultsToCompetencies({
      competencyModel: model,
      items: [{ competencyIds: [c1], marksEarned: 1, marksMax: 1 }],
    });
    expect(results.find((row) => row.competencyId === c1)?.status).toBe('DEMONSTRATED');
  });

  it('determines intermediate when C1-C3 demonstrated', () => {
    const [c1, c2, c3] = model.slice(0, 3).map((row) => row.competencyId);
    const results = rollupItemResultsToCompetencies({
      competencyModel: model,
      items: [
        { competencyIds: [c1], marksEarned: 1, marksMax: 1 },
        { competencyIds: [c2], marksEarned: 10, marksMax: 10 },
        { competencyIds: [c3], marksEarned: 10, marksMax: 10 },
      ],
    });
    expect(determineSupportedProficiency(results, requirements)).toBe('INTERMEDIATE');
  });

  it('blocks advanced when critical optimization competency failed', () => {
    const items = model.slice(0, 5).map((row, index) => ({
      competencyIds: [row.competencyId],
      marksEarned: index === 4 ? 0 : 10,
      marksMax: 10,
    }));
    const output = Effect.runSync(
      evaluateAssessmentIntelligence({
        competencyModel: model,
        proficiencyRequirements: requirements,
        items,
        targetProficiency: 'ADVANCED',
      }),
    );
    expect(output.highestAssessmentSupportedProficiency).toBe('INTERMEDIATE');
    expect(output.assessmentPassed).toBe(false);
  });

  it('stops testing once target proficiency is supported with no critical gaps', () => {
    const items = model.slice(0, 5).map((row) => ({
      competencyIds: [row.competencyId],
      marksEarned: 10,
      marksMax: 10,
    }));
    const results = rollupItemResultsToCompetencies({ competencyModel: model, items });
    expect(shouldStopTesting(results, 'ADVANCED', requirements)).toBe(true);
  });
});
