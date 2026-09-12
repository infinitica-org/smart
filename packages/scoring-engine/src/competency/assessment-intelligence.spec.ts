import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import {
  buildCategoryCompetencyModel,
  buildDefaultProficiencyRequirements,
} from '@smart/contracts';
import {
  competencyIdsBlockingProficiency,
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

  it('returns null when no competency requirements are met', () => {
    const results = rollupItemResultsToCompetencies({
      competencyModel: model,
      items: [{ competencyIds: [model[0]?.competencyId ?? ''], marksEarned: 0, marksMax: 10 }],
    });
    expect(determineSupportedProficiency(results, requirements)).toBeNull();
  });

  it('does not pass discovery assessment when nothing is demonstrated', () => {
    const output = Effect.runSync(
      evaluateAssessmentIntelligence({
        competencyModel: model,
        proficiencyRequirements: requirements,
        items: [{ competencyIds: [model[0]?.competencyId ?? ''], marksEarned: 0, marksMax: 10 }],
        targetProficiency: 'PROFESSIONAL',
        verificationMode: 'discovery',
      }),
    );
    expect(output.highestAssessmentSupportedProficiency).toBeNull();
    expect(output.assessmentPassed).toBe(false);
    expect(output.recommendedNextStep).not.toBe('NONE');
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

  it('marks assessment complete at demonstrated ceiling without verification gates', () => {
    const [c1, c2, c3] = model.slice(0, 3).map((row) => row.competencyId);
    const output = Effect.runSync(
      evaluateAssessmentIntelligence({
        competencyModel: model,
        proficiencyRequirements: requirements,
        items: [
          { competencyIds: [c1], marksEarned: 10, marksMax: 10 },
          { competencyIds: [c2], marksEarned: 10, marksMax: 10 },
          { competencyIds: [c3], marksEarned: 10, marksMax: 10 },
        ],
        targetProficiency: 'PROFESSIONAL',
        verificationMode: 'discovery',
        allowUpwardProbe: false,
      }),
    );
    expect(output.highestAssessmentSupportedProficiency).toBe('INTERMEDIATE');
    expect(output.assessmentComplete).toBe(true);
    expect(output.recommendedNextStep).toBe('NONE');
    expect(output.requiresEvidenceVerification).toBe(false);
  });

  it('probes the next proficiency tier during diagnostic when critical comps are untested', () => {
    const [c1, c2, c3] = model.slice(0, 3).map((row) => row.competencyId);
    const results = rollupItemResultsToCompetencies({
      competencyModel: model,
      items: [
        { competencyIds: [c1], marksEarned: 10, marksMax: 10 },
        { competencyIds: [c2], marksEarned: 10, marksMax: 10 },
        { competencyIds: [c3], marksEarned: 10, marksMax: 10 },
      ],
    });
    expect(competencyIdsBlockingProficiency(results, 'INTERMEDIATE', requirements)).toEqual([]);
    expect(shouldStopTesting(results, 'PROFESSIONAL', requirements, true)).toBe(false);
  });

  it('stops after targeted assessment without probing another tier upward', () => {
    const items = model.slice(0, 5).map((row) => ({
      competencyIds: [row.competencyId],
      marksEarned: 10,
      marksMax: 10,
    }));
    const results = rollupItemResultsToCompetencies({ competencyModel: model, items });
    expect(determineSupportedProficiency(results, requirements)).toBe('ADVANCED');
    expect(shouldStopTesting(results, 'PROFESSIONAL', requirements, false)).toBe(true);
  });
});
