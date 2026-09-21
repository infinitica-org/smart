import type { SkillCompetency } from '@smart/contracts';

export type SdeFormStage = 'DIAGNOSTIC' | 'FULL';
export type SdeFormFormat = 'MCQ' | 'TRACE' | 'CODING' | 'SCENARIO' | 'DEBUG' | 'DESIGN_REASONING';

export function scaleFormCounts(
  closed: { MCQ: number; TRACE: number },
  openCount: number,
  stage: SdeFormStage,
): { closed: { MCQ: number; TRACE: number }; openCount: number } {
  if (stage === 'FULL') {
    return { closed, openCount };
  }
  return {
    closed: {
      MCQ: Math.max(2, Math.ceil(closed.MCQ * 0.4)),
      TRACE: Math.max(1, Math.ceil(closed.TRACE * 0.4)),
    },
    openCount: Math.max(1, Math.ceil(openCount * 0.4)),
  };
}

export function assignCompetencyIds(
  format: SdeFormFormat,
  itemIndex: number,
  competencyModel: readonly SkillCompetency[],
): string[] {
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
