import type { CompetencyFusionResult, ProficiencyLevel } from '@smart/contracts';
import { capProficiency, proficiencyCapOrdinal } from './status-ordinal.js';

function minProficiency(a: ProficiencyLevel, b: ProficiencyLevel): ProficiencyLevel {
  return proficiencyCapOrdinal(a) <= proficiencyCapOrdinal(b) ? a : b;
}

/** True when fusion applied domain/competency vetoes or left a material conflict open. */
export function fusionRequiresProficiencyDowngrade(fusion: CompetencyFusionResult | null): boolean {
  if (!fusion) return false;
  if (fusion.conflicts.some((row) => !row.resolved)) return true;
  return fusion.fusionTrace.some((row) => row.appliedVetoIds.length > 0);
}

/**
 * After a passing defense interview, assessment-supported proficiency is authoritative
 * unless fusion surfaced a veto or unresolved project conflict that warrants a lower tier.
 */
export function resolveDemonstratedProficiencyForFinalize(input: {
  assessmentSupported: ProficiencyLevel | null;
  fusionInferred: ProficiencyLevel | null;
  interviewPassed: boolean;
  fusion: CompetencyFusionResult | null;
}): ProficiencyLevel | null {
  const assessment = input.assessmentSupported;
  const fusion = input.fusionInferred;
  if (!assessment) return fusion;
  if (!fusion) return assessment;
  if (input.interviewPassed && !fusionRequiresProficiencyDowngrade(input.fusion)) {
    return assessment;
  }
  const capped = capProficiency(assessment, fusion);
  if (capped) return capped;
  return minProficiency(assessment, fusion);
}
