import { Inject, Injectable } from '@nestjs/common';
import {
  buildSkillBlueprintForCategory,
  getSkillDefinition,
  type AssessmentResult,
  type SkillBlueprint,
  type SkillProficiency,
} from '@smart/contracts';
import { evaluateAssessmentIntelligence, proficiencyMeetsTarget } from '@smart/scoring-engine';
import { Effect } from 'effect';
import type { GradeSdeSkillFormResponse } from '@smart/contracts';
import { VerificationOrchestratorService } from '../evidence/verification-orchestrator.service.js';

@Injectable()
export class AssessmentIntelligenceService {
  constructor(
    @Inject(VerificationOrchestratorService)
    private readonly verification: VerificationOrchestratorService,
  ) {}

  resolveBlueprint(catalogSkillCode: string): SkillBlueprint {
    const definition = getSkillDefinition(catalogSkillCode);
    if (!definition) {
      throw new Error(`Unknown catalog skill ${catalogSkillCode}`);
    }
    return buildSkillBlueprintForCategory(
      definition.code,
      definition.name,
      definition.domain,
      definition.categoryName,
      definition.categoryId,
    );
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
      passed: intelligence.assessmentPassed,
      assessmentPassed: intelligence.assessmentPassed,
      competencySupportedProficiency: intelligence.highestAssessmentSupportedProficiency,
    };
  }

  buildAssessmentResult(input: {
    catalogSkillCode: string;
    attemptId: string;
    blueprint: SkillBlueprint;
    targetProficiency: SkillProficiency;
    grade: GradeSdeSkillFormResponse;
    competencyIdsByIndex: ReadonlyMap<number, readonly string[]>;
  }): AssessmentResult {
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
        targetProficiency: input.targetProficiency,
      }),
    );
    const gate = this.verification.evaluateGate({
      targetProficiency: input.targetProficiency,
      supportedProficiency: intelligence.highestAssessmentSupportedProficiency,
      recommendedNextStep: intelligence.recommendedNextStep,
      confidence: intelligence.confidence,
    });
    return {
      skillCode: input.catalogSkillCode,
      assessmentVersion: 'v1',
      attemptId: input.attemptId,
      competencyResults: intelligence.competencyResults,
      highestAssessmentSupportedProficiency: intelligence.highestAssessmentSupportedProficiency,
      targetProficiency: input.targetProficiency,
      uncertainties: intelligence.uncertainties,
      recommendedNextStep: gate.recommendedNextStep,
      requiresInterview: gate.requiresInterview,
      requiresAdditionalAssessment: intelligence.requiresAdditionalAssessment,
      confidence: intelligence.confidence,
      scorePercent: input.grade.scorePercent,
      evaluatedAt: new Date().toISOString(),
    };
  }

  claimPassesFromAssessment(
    assessmentResult: AssessmentResult,
    targetProficiency: SkillProficiency,
  ): boolean {
    const target = targetProficiency as AssessmentResult['targetProficiency'];
    return (
      proficiencyMeetsTarget(assessmentResult.highestAssessmentSupportedProficiency, target) &&
      assessmentResult.recommendedNextStep === 'NONE'
    );
  }
}
