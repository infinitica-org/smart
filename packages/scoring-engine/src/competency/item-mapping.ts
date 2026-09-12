import type { SkillCompetency } from '@smart/contracts';

export type SdeFormStage = 'DIAGNOSTIC' | 'TARGETED' | 'FULL';
export type SdeFormFormat = 'MCQ' | 'TRACE' | 'CODING' | 'SCENARIO' | 'DEBUG' | 'DESIGN_REASONING';

export function scaleFormCounts(
  closed: { MCQ: number; TRACE: number },
  openCount: number,
  stage: SdeFormStage,
  targetedCompetencyCount = 2,
): { closed: { MCQ: number; TRACE: number }; openCount: number } {
  if (stage === 'FULL') {
    return { closed, openCount };
  }
  if (stage === 'DIAGNOSTIC') {
    return {
      closed: {
        MCQ: Math.max(2, Math.ceil(closed.MCQ * 0.4)),
        TRACE: Math.max(1, Math.ceil(closed.TRACE * 0.4)),
      },
      openCount: Math.max(1, Math.ceil(openCount * 0.4)),
    };
  }
  return {
    closed: {
      MCQ: Math.min(2, closed.MCQ),
      TRACE: Math.min(1, closed.TRACE),
    },
    openCount: Math.max(1, Math.min(targetedCompetencyCount, openCount)),
  };
}

export function assignCompetencyIds(
  format: SdeFormFormat,
  itemIndex: number,
  competencyModel: readonly SkillCompetency[],
  targetCompetencyIds?: readonly string[],
): string[] {
  if (targetCompetencyIds && targetCompetencyIds.length > 0) {
    return [targetCompetencyIds[itemIndex % targetCompetencyIds.length]!];
  }
  const slotByFormat: Record<SdeFormFormat, number> = {
    MCQ: 0,
    TRACE: 0,
    CODING: 1,
    SCENARIO: 2,
    DEBUG: 3,
    DESIGN_REASONING: 5,
  };
  const slot = Math.min(
    competencyModel.length - 1,
    slotByFormat[format] ?? itemIndex % competencyModel.length,
  );
  const competency = competencyModel[slot] ?? competencyModel[0];
  return competency ? [competency.competencyId] : [];
}
