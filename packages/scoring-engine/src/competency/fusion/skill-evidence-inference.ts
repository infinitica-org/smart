import { Effect } from 'effect';
import type {
  AssessmentConfidenceLevel,
  CompetencyFusionResult,
  FusionInput,
  ObservationBundle,
  ProficiencyLevel,
  SkillCompetency,
} from '@smart/contracts';
import { FUSION_RULE_SET_VERSION } from '@smart/contracts';
import { fuseDomainCapability } from './proficiency-fusion.js';
import { mergeProjectObservationBundles } from './qlix-project-observations.js';

export type SkillInferenceProvenance = {
  ruleSetVersion: string;
  taxonomyVersion: string;
  rubricVersion?: string;
  capabilityModelVersion?: string;
  assessmentBlueprintRef?: string;
  interviewBlueprintRef?: string;
  promptRefs: readonly string[];
  evidenceRecordIds: readonly string[];
};

export type SkillEvidenceInferenceOutcome = {
  skillCode: string;
  outcome: 'INFERRED' | 'INSUFFICIENT_EVIDENCE' | 'VETO_BLOCKED';
  inferredProficiency: ProficiencyLevel | null;
  confidence: AssessmentConfidenceLevel;
  confidenceReason: string;
  proficiencyInferenceReason: 'INSUFFICIENT_EVIDENCE' | 'VETO_BLOCKED' | null;
  fusion: CompetencyFusionResult;
  evidenceCount: number;
  provenance: SkillInferenceProvenance;
};

export function mapFusionToSkillEvidenceInference(input: {
  skillCode: string;
  fusion: CompetencyFusionResult;
  provenance: SkillInferenceProvenance;
  evidenceCount: number;
}): SkillEvidenceInferenceOutcome {
  const { fusion } = input;
  let outcome: SkillEvidenceInferenceOutcome['outcome'] = 'INFERRED';
  if (fusion.inferredDomainProficiency === null) {
    outcome =
      fusion.proficiencyInferenceReason === 'INSUFFICIENT_EVIDENCE'
        ? 'INSUFFICIENT_EVIDENCE'
        : 'VETO_BLOCKED';
  }

  return {
    skillCode: input.skillCode,
    outcome,
    inferredProficiency: fusion.inferredDomainProficiency,
    confidence: fusion.confidence,
    confidenceReason: fusion.confidenceReason,
    proficiencyInferenceReason: fusion.proficiencyInferenceReason ?? null,
    fusion,
    evidenceCount: input.evidenceCount,
    provenance: input.provenance,
  };
}

export function runSkillEvidenceFusion(input: {
  skillCode: string;
  competencyModel: readonly SkillCompetency[];
  proficiencyRequirements: FusionInput['proficiencyRequirements'];
  targetProficiency: ProficiencyLevel;
  assessmentBundle: ObservationBundle | null;
  projectBundles: readonly ObservationBundle[];
  proctoringRiskHigh?: boolean;
  provenance: SkillInferenceProvenance;
}): Effect.Effect<SkillEvidenceInferenceOutcome, never> {
  return Effect.gen(function* () {
    const mergedProject = mergeProjectObservationBundles(input.projectBundles, {
      competencyModel: input.competencyModel,
    });

    const sources: ObservationBundle[] = [];
    if (input.assessmentBundle?.available) sources.push(input.assessmentBundle);
    if (mergedProject?.available) sources.push(mergedProject);

    const evidenceCount = input.projectBundles.filter((b) => b.available).length;

    if (sources.length === 0) {
      const emptyFusion: CompetencyFusionResult = {
        skillCode: input.skillCode,
        capabilityProfile: [],
        inferredDomainProficiency: null,
        proficiencyInferenceReason: 'INSUFFICIENT_EVIDENCE',
        ruleSetVersion: input.provenance.ruleSetVersion ?? FUSION_RULE_SET_VERSION,
        capabilityGaps: [],
        confidence: 'LOW',
        confidenceReason: 'No admissible assessment or project evidence.',
        activeSources: [],
        conflicts: [],
        fusionTrace: [],
        assessmentComplete: false,
        recommendedNextStep: 'EVIDENCE_VERIFICATION',
      };
      return mapFusionToSkillEvidenceInference({
        skillCode: input.skillCode,
        fusion: emptyFusion,
        provenance: input.provenance,
        evidenceCount,
      });
    }

    const fusionInput: FusionInput = {
      competencyModel: [...input.competencyModel],
      proficiencyRequirements: input.proficiencyRequirements,
      sources,
      targetProficiency: input.targetProficiency,
      proctoringRiskHigh: input.proctoringRiskHigh ?? false,
      ruleSetVersion: input.provenance.ruleSetVersion ?? FUSION_RULE_SET_VERSION,
    };

    const fusion = yield* fuseDomainCapability(fusionInput);
    return mapFusionToSkillEvidenceInference({
      skillCode: input.skillCode,
      fusion,
      provenance: input.provenance,
      evidenceCount,
    });
  });
}
