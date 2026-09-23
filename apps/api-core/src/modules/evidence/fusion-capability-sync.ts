import type {
  CompetencyStatus,
  ProficiencyLevel,
  SkillEvidenceInferenceSnapshot,
} from '@smart/contracts';

export const FUSION_CAPABILITY_MODEL_PREFIX = 'fusion:' as const;

export function fusionCapabilityModelVersion(input: {
  ruleSetVersion: string;
  taxonomyVersion: string;
  capabilityModelVersion: string;
}): string {
  return `${FUSION_CAPABILITY_MODEL_PREFIX}${input.ruleSetVersion}|${input.taxonomyVersion}|${input.capabilityModelVersion}`;
}

const STATUS_CONFIDENCE: Record<CompetencyStatus, number> = {
  DEMONSTRATED: 0.88,
  PARTIALLY_DEMONSTRATED: 0.62,
  UNCERTAIN: 0.45,
  NOT_DEMONSTRATED: 0.25,
  NOT_TESTED: 0.2,
};

function statusToProficiency(
  status: CompetencyStatus,
  domainLevel: ProficiencyLevel | null,
): ProficiencyLevel {
  if (domainLevel) return domainLevel;
  if (status === 'DEMONSTRATED') return 'INTERMEDIATE';
  if (status === 'PARTIALLY_DEMONSTRATED') return 'BEGINNER';
  return 'BEGINNER';
}

export type FusionCapabilityRow = {
  studentId: string;
  skillCode: string;
  capabilityLabel: string;
  category: string;
  confidenceScore: number;
  proficiency: ProficiencyLevel;
  evidenceRefs: string[];
  modelVersion: string;
  assessmentVerified: boolean;
  projectId: null;
  qlixCheckId: null;
};

export function buildFusionCapabilityRows(
  snapshot: SkillEvidenceInferenceSnapshot,
  modelVersion: string,
): FusionCapabilityRow[] {
  const domainLevel = snapshot.inferredProficiency;
  const category = snapshot.skillCode;

  return snapshot.fusion.capabilityProfile.map((row) => ({
    studentId: snapshot.studentId,
    skillCode: snapshot.skillCode,
    capabilityLabel: row.capability,
    category,
    confidenceScore: STATUS_CONFIDENCE[row.inferredStatus] ?? 0.4,
    proficiency: statusToProficiency(row.inferredStatus, domainLevel),
    evidenceRefs: row.observableEvidence.slice(0, 10),
    modelVersion,
    assessmentVerified: row.primaryEvidenceSource === 'ASSESSMENT',
    projectId: null,
    qlixCheckId: null,
  }));
}
