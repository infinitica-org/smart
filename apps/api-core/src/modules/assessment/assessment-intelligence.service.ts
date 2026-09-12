import { Injectable } from '@nestjs/common';
import {
  getSkillBlueprint,
  getSkillDefinition,
  SKILL_VERIFICATION_DISCOVERY_TARGET,
  type AssessmentResult,
  type SkillBlueprint,
  type SkillProficiency,
} from '@smart/contracts';
import { evaluateAssessmentIntelligence, type VerificationMode } from '@smart/scoring-engine';
import { Effect } from 'effect';
import type { GradeSdeSkillFormResponse } from '@smart/contracts';

@Injectable()
export class AssessmentIntelligenceService {
  resolveBlueprint(catalogSkillCode: string): SkillBlueprint {
    const definition = getSkillDefinition(catalogSkillCode);
    if (!definition) {
      throw new Error(`Unknown catalog skill ${catalogSkillCode}`);
    }
    const blueprint = getSkillBlueprint(catalogSkillCode);
    if (!blueprint) {
      throw new Error(`No competency blueprint for catalog skill ${catalogSkillCode}`);
    }
    return blueprint;
  }

  enrichGrade(
    grade: GradeSdeSkillFormResponse,
    blueprint: SkillBlueprint,
    targetProficiency: SkillProficiency,
    competencyIdsByIndex: ReadonlyMap<number, readonly string[]>,
  ): GradeSdeSkillFormResponse {
    const items = grade.itemResults.map((item) => ({
      competencyIds: competencyIdsByIndex.get(item.index) ?? item.competencyIds ?? [],
      marksEarned: item.marksEarned,
      marksMax: item.marksMax,
    }));
    const intelligence = Effect.runSync(
      evaluateAssessmentIntelligence({
        competencyModel: blueprint.competencyModel,
        proficiencyRequirements: blueprint.proficiencyRequirements ?? [],
        items,
        targetProficiency,
      }),
    );
    return {
      ...grade,
      passed: intelligence.assessmentComplete,
      assessmentPassed: intelligence.assessmentComplete,
      competencySupportedProficiency:
        intelligence.highestAssessmentSupportedProficiency ?? undefined,
    };
  }

  buildAssessmentResult(input: {
    catalogSkillCode: string;
    attemptId: string;
    blueprint: SkillBlueprint;
    targetProficiency?: SkillProficiency;
    verificationMode?: VerificationMode;
    allowUpwardProbe?: boolean;
    grade: GradeSdeSkillFormResponse;
    competencyIdsByIndex: ReadonlyMap<number, readonly string[]>;
  }): AssessmentResult {
    const targetProficiency = input.targetProficiency ?? SKILL_VERIFICATION_DISCOVERY_TARGET;
    const verificationMode = input.verificationMode ?? 'discovery';
    const items = input.grade.itemResults.map((item) => ({
      competencyIds: input.competencyIdsByIndex.get(item.index) ?? item.competencyIds ?? [],
      marksEarned: item.marksEarned,
      marksMax: item.marksMax,
    }));
    const intelligence = Effect.runSync(
      evaluateAssessmentIntelligence({
        competencyModel: input.blueprint.competencyModel,
        proficiencyRequirements: input.blueprint.proficiencyRequirements ?? [],
        items,
        targetProficiency,
        verificationMode,
        allowUpwardProbe: input.allowUpwardProbe,
      }),
    );
    return {
      skillCode: input.catalogSkillCode,
      assessmentVersion: 'v1',
      attemptId: input.attemptId,
      competencyResults: intelligence.competencyResults,
      highestAssessmentSupportedProficiency: intelligence.highestAssessmentSupportedProficiency,
      targetProficiency,
      assessmentComplete: intelligence.assessmentComplete,
      assessmentPassed: intelligence.assessmentComplete,
      uncertainties: intelligence.uncertainties,
      recommendedNextStep: intelligence.recommendedNextStep,
      requiresInterview: intelligence.requiresInterview,
      requiresEvidenceVerification: intelligence.requiresEvidenceVerification,
      requiresAdditionalAssessment: intelligence.requiresAdditionalAssessment,
      confidence: intelligence.confidence,
      scorePercent: input.grade.scorePercent,
      evaluatedAt: new Date().toISOString(),
    };
  }

  claimPassesFromAssessment(assessmentResult: AssessmentResult): boolean {
    return (
      assessmentResult.assessmentComplete &&
      assessmentResult.highestAssessmentSupportedProficiency !== null &&
      assessmentResult.recommendedNextStep === 'NONE'
    );
  }
}
