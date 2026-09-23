import type { SkillCompetency } from '@smart/contracts';
import type { ObservationBundle, Observation, TrustTier } from '@smart/contracts';
import type { ProjectVerificationReportDto } from '@smart/contracts';

export function projectTrustFromReport(report: ProjectVerificationReportDto): TrustTier {
  if (report.confidence < 0.5) return 'UNTRUSTED';
  if (report.routedToReview) return 'PROVISIONAL';
  return 'TRUSTED';
}

export function projectToObservationBundle(
  report: ProjectVerificationReportDto | null,
  blueprint: { competencyModel: readonly SkillCompetency[] },
): ObservationBundle {
  if (!report || report.confidence < 0.5) {
    return {
      sourceId: 'PROJECT',
      available: false,
      trustTier: 'UNAVAILABLE',
      observations: [],
      authenticityFlags: [],
    };
  }

  const trustTier = projectTrustFromReport(report);

  const observations: Observation[] = blueprint.competencyModel.map((comp) => {
    return {
      competencyId: comp.competencyId,
      capability: comp.capability,
      claimedStatus: 'NOT_TESTED',
      evidence: [],
    };
  });

  const authenticityFlags: string[] = [];
  if (report.plagiarismFlag) authenticityFlags.push('PUBLIC_WEB_SIMILARITY');
  if (report.techAgeFlag) authenticityFlags.push('TECH_AGE');
  authenticityFlags.push(...report.flags);

  return {
    sourceId: 'PROJECT',
    available: true,
    trustTier,
    observations,
    authenticityFlags,
    appliedCeiling: null,
    metadata: { projectReport: report },
  };
}
