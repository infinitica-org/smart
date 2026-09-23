import { computeAssessmentConfidence } from '../assessment-intelligence.js';
import { minConfidence, capConfidence } from './status-ordinal.js';
import type { CapabilityProfileEntry } from '@smart/contracts';
import type { ProficiencyRequirement } from '@smart/contracts';
import type { CompetencyResult } from '@smart/contracts';

const DOMAIN_VETO_CAP: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

export function computeDomainConfidence(input: {
  assessmentResults: readonly CompetencyResult[];
  testedItemCount: number;
  projectAvailable: boolean;
  projectTrust: 'TRUSTED' | 'PROVISIONAL' | 'UNTRUSTED' | 'UNAVAILABLE' | null;
  projectReport: { scores?: { confidence?: number } } | null;
  appliedDomainVetoIds: string[];
  inferredDomainProficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL' | null;
  capabilityProfile: readonly CapabilityProfileEntry[];
  requirements: readonly ProficiencyRequirement[];
}): { confidence: 'LOW' | 'MEDIUM' | 'HIGH'; confidenceReason: string } {
  const assessmentConf = computeAssessmentConfidence(
    input.assessmentResults,
    input.testedItemCount,
  );

  let projectConf: 'LOW' | 'MEDIUM' | 'HIGH' | null = null;
  if (input.projectAvailable && input.projectTrust) {
    if (input.projectTrust === 'UNTRUSTED' || input.projectTrust === 'UNAVAILABLE') {
      projectConf = 'LOW';
    } else if (input.projectTrust === 'PROVISIONAL') {
      projectConf = 'MEDIUM';
    } else {
      const scoreConf = input.projectReport?.scores?.confidence ?? 0;
      projectConf = scoreConf >= 0.7 ? 'HIGH' : 'MEDIUM';
    }
  }

  let domainConf = projectConf ? minConfidence(assessmentConf, projectConf) : assessmentConf;
  const reasons: string[] = [
    projectConf
      ? `Conservative min(assessment ${assessmentConf}, project ${projectConf})`
      : `Assessment-only ${assessmentConf}`,
  ];

  const domainVetoes = input.appliedDomainVetoIds.filter((id) =>
    ['V-PLAG-01', 'V-DEDUP-01', 'V-INTEGRITY-01'].includes(id),
  );
  if (domainVetoes.length > 0) {
    domainConf = capConfidence(domainConf, DOMAIN_VETO_CAP);
    reasons.push(`${domainVetoes.join(', ')} caps domain at MEDIUM`);
  }

  if (input.inferredDomainProficiency === null) {
    domainConf = 'LOW';
    reasons.push('No inferred domain proficiency');
  }

  const criticalIds = new Set<string>();
  for (const req of input.requirements) {
    for (const id of req.criticalCompetencyIds) criticalIds.add(id);
  }
  const weakCritical = input.capabilityProfile.some(
    (row) =>
      criticalIds.has(row.competencyId) &&
      (row.inferredStatus === 'NOT_TESTED' || row.inferredStatus === 'NOT_DEMONSTRATED'),
  );
  if (weakCritical) {
    domainConf = capConfidence(domainConf, 'MEDIUM');
    reasons.push('Critical competency NOT_TESTED or NOT_DEMONSTRATED caps at MEDIUM');
  }

  return { confidence: domainConf, confidenceReason: reasons.join('; ') };
}

export function activeSourcesFromBundles(
  sources: ReadonlyArray<{ sourceId: string; available: boolean }>,
): string[] {
  return sources.filter((s) => s.available).map((s) => s.sourceId);
}
