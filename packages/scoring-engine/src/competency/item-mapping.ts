import {
  PROFICIENCY_LEVEL_ORDER,
  type ProficiencyLevel,
  type SkillCompetency,
} from '@smart/contracts';

export type SdeFormStage = 'DIAGNOSTIC' | 'FULL';
export type SdeFormFormat = 'MCQ' | 'TRACE' | 'CODING' | 'SCENARIO' | 'DEBUG' | 'DESIGN_REASONING';

/** Required competency slots (C1…Cn) for a declared verification tier. */
const SLOTS_BY_PROFICIENCY: Readonly<Record<ProficiencyLevel, number>> = {
  BEGINNER: 1,
  INTERMEDIATE: 3,
  PROFICIENT: 4,
  ADVANCED: 5,
  PROFESSIONAL: 6,
};

export function competencySlotCountForProficiency(level: ProficiencyLevel): number {
  return SLOTS_BY_PROFICIENCY[level];
}

export function scaleFormCounts(
  closed: { MCQ: number; TRACE: number },
  openCount: number,
  stage: SdeFormStage,
  options?: { minItemCount?: number },
): { closed: { MCQ: number; TRACE: number }; openCount: number } {
  if (stage === 'FULL') {
    return { closed, openCount };
  }
  const scaled = {
    closed: {
      MCQ: Math.max(2, Math.ceil(closed.MCQ * 0.4)),
      TRACE: Math.max(1, Math.ceil(closed.TRACE * 0.4)),
    },
    openCount: Math.max(1, Math.ceil(openCount * 0.4)),
  };
  const minItemCount = options?.minItemCount;
  if (minItemCount == null || minItemCount <= 0) {
    return scaled;
  }
  const fullTotal = closed.MCQ + closed.TRACE + openCount;
  const target = Math.min(minItemCount, fullTotal);
  let total = scaled.closed.MCQ + scaled.closed.TRACE + scaled.openCount;
  while (total < target) {
    if (scaled.closed.MCQ < closed.MCQ) {
      scaled.closed.MCQ += 1;
      total += 1;
      continue;
    }
    if (scaled.closed.TRACE < closed.TRACE) {
      scaled.closed.TRACE += 1;
      total += 1;
      continue;
    }
    if (scaled.openCount < openCount) {
      scaled.openCount += 1;
      total += 1;
      continue;
    }
    break;
  }
  return scaled;
}

function legacyFormatSlot(format: SdeFormFormat, itemIndex: number, modelLength: number): number {
  const slotByFormat: Record<SdeFormFormat, number> = {
    MCQ: 0,
    TRACE: 0,
    CODING: 1,
    SCENARIO: 2,
    DEBUG: 3,
    DESIGN_REASONING: 5,
  };
  return Math.min(modelLength - 1, slotByFormat[format] ?? (itemIndex - 1) % modelLength);
}

export function assignCompetencyIds(
  format: SdeFormFormat,
  itemIndex: number,
  competencyModel: readonly SkillCompetency[],
  targetProficiency?: ProficiencyLevel,
): string[] {
  if (competencyModel.length === 0) {
    return [];
  }
  if (targetProficiency && PROFICIENCY_LEVEL_ORDER.includes(targetProficiency)) {
    const slotCount = Math.min(
      competencySlotCountForProficiency(targetProficiency),
      competencyModel.length,
    );
    const slot = (Math.max(1, itemIndex) - 1) % slotCount;
    const competency = competencyModel[slot];
    return competency ? [competency.competencyId] : [];
  }
  const slot = legacyFormatSlot(format, itemIndex, competencyModel.length);
  const competency = competencyModel[slot] ?? competencyModel[0];
  return competency ? [competency.competencyId] : [];
}
