import { QlixSmartAssessmentSchema } from '../evaluation/qlix-client.js';
import type { QlixProjectFusionInput } from '@smart/scoring-engine';

type QlixCheckResultRow = {
  appliedProficiencyCeiling: string | null;
  qualityScore: number | null;
  authenticityScore: number | null;
  relevanceScore: number | null;
  similarityIndex: number | null;
  aiLikelihood: number | null;
  confidence: string | null;
  smartAssessmentJson: unknown;
};

type VerifiedProjectRow = {
  id: string;
  skillMappings: readonly { skillCode: string }[];
  qlixCheckResult: QlixCheckResultRow | null;
};

export function mapVerifiedProjectToQlixFusionInput(
  project: VerifiedProjectRow,
  options?: { defenseScore?: number | null; ownershipConcern?: boolean },
): QlixProjectFusionInput | null {
  const qlix = project.qlixCheckResult;
  if (!qlix) return null;

  const skillCodes = [...new Set(project.skillMappings.map((row) => row.skillCode))];
  if (skillCodes.length === 0) return null;

  const smartAssessment = qlix.smartAssessmentJson
    ? QlixSmartAssessmentSchema.safeParse(qlix.smartAssessmentJson).data
    : null;

  return {
    projectId: project.id,
    skillCodes,
    appliedProficiencyCeiling:
      qlix.appliedProficiencyCeiling ?? smartAssessment?.appliedProficiencyCeiling ?? null,
    qualityScore: qlix.qualityScore ?? smartAssessment?.qualityScore ?? null,
    authenticityScore: qlix.authenticityScore ?? smartAssessment?.authenticityScore ?? null,
    relevanceScore: qlix.relevanceScore ?? smartAssessment?.relevanceScore ?? null,
    similarityIndex: qlix.similarityIndex,
    aiLikelihood: qlix.aiLikelihood,
    qlixConfidence: qlix.confidence,
    competencyObservations: smartAssessment?.competencyObservations ?? [],
    defenseScore: options?.defenseScore ?? null,
    ownershipConcern: options?.ownershipConcern ?? false,
  };
}
