import { Effect } from 'effect';
import { FUSION_RULE_SET_VERSION } from '@smart/contracts';
import type {
  CompetencyStatus,
  CompetencyResult,
  ProficiencyLevel,
  CapabilityProfileEntry,
  FusionTraceEntry,
  CompetencyFusionResult,
  FusionInput,
} from '@smart/contracts';
import {
  determineSupportedProficiency,
  recommendAssessmentNextStep,
} from '../assessment-intelligence.js';
import { filterAdmissibleObservations } from './admissibility.js';
import { minStatus, maxStatus, capProficiency } from './status-ordinal.js';
import {
  evaluateUpgradeRule,
  FUSION_VETOS_V1,
  type FusionRuleContext,
  type VetoInput,
} from './fusion-rules.v1.js';
import { computeDomainConfidence } from './domain-confidence.js';
import { buildCapabilityGaps } from './capability-gaps.js';

function statusFromSource(
  admissible: Array<{
    sourceId: 'ASSESSMENT' | 'PROJECT';
    observation: { claimedStatus: CompetencyStatus };
  }>,
  sourceId: 'ASSESSMENT' | 'PROJECT',
): CompetencyStatus | null {
  const row = admissible.find((a) => a.sourceId === sourceId);
  return row?.observation.claimedStatus ?? null;
}

export function fuseDomainCapability(
  input: FusionInput,
): Effect.Effect<CompetencyFusionResult, never> {
  return Effect.sync(() => {
    const ruleSetVersion = input.ruleSetVersion ?? FUSION_RULE_SET_VERSION;
    const bundles = input.sources;
    const projectBundle = bundles.find((b) => b.sourceId === 'PROJECT');
    const projectFlags = projectBundle?.authenticityFlags ?? [];
    const appliedCeiling = projectBundle?.appliedCeiling ?? null;

    const capabilityProfile: CapabilityProfileEntry[] = [];
    const fusionTrace: FusionTraceEntry[] = [];
    const conflicts: CompetencyFusionResult['conflicts'] = [];
    const appliedDomainVetoIds = new Set<string>();

    let domainCap: ProficiencyLevel | null = null;

    if (input.proctoringRiskHigh) {
      appliedDomainVetoIds.add('V-INTEGRITY-01');
    }

    for (const competency of input.competencyModel) {
      const admissible = filterAdmissibleObservations({ competency, sources: bundles });
      const assessmentStatus = statusFromSource(admissible, 'ASSESSMENT');
      const projectStatus = statusFromSource(admissible, 'PROJECT');
      const projectTrust = projectBundle?.available ? projectBundle.trustTier : null;

      const ctx: FusionRuleContext = {
        role: competency.role ?? 'supporting',
        difficulty: competency.difficulty ?? 'BEGINNER',
        assessmentStatus,
        projectStatus,
        projectTrust,
      };

      const upgrade = evaluateUpgradeRule(ctx);
      let candidateStatus = upgrade.status;

      const appliedVetoIds: string[] = [];
      const divergenceIds: string[] = [];

      for (const veto of FUSION_VETOS_V1) {
        const effect = veto.applies({
          ...ctx,
          candidateStatus,
          assessmentStatus,
          projectStatus,
          projectTrust,
          projectFlags,
          appliedCeiling,
          role: competency.role ?? 'supporting',
          preferProvisionalOnCriticalConflict: false,
        } as VetoInput);

        if (!effect) continue;

        if (effect.statusCeiling) {
          const minResult = minStatus(candidateStatus, effect.statusCeiling);
          if (minResult) candidateStatus = minResult;
          appliedVetoIds.push(veto.vetoId);
        }
        if (effect.statusFloor) {
          const maxResult = maxStatus(candidateStatus, effect.statusFloor);
          if (maxResult) candidateStatus = maxResult;
          if (!appliedVetoIds.includes(veto.vetoId)) appliedVetoIds.push(veto.vetoId);
        }
        if (effect.divergenceId) divergenceIds.push(effect.divergenceId);
        if (effect.domainCap) {
          appliedDomainVetoIds.add(veto.vetoId);
          domainCap = domainCap ? capProficiency(domainCap, effect.domainCap) : effect.domainCap;
        }
        if (effect.unresolvedConflict) {
          conflicts.push({
            type: 'CONFLICT',
            competencyId: competency.competencyId,
            sources: ['ASSESSMENT', 'PROJECT'],
            message: 'Unresolved critical competency conflict',
            resolved: false,
          });
        }
        if (effect.ignoreProject) {
          candidateStatus = assessmentStatus ?? 'NOT_TESTED';
        }
      }

      if (upgrade.emitsResolvedConflict) {
        conflicts.push({
          type: 'CONFLICT',
          competencyId: competency.competencyId,
          sources: ['ASSESSMENT', 'PROJECT'],
          message: 'Assessment DEMONSTRATED contradicted by project — downgraded to PARTIAL',
          resolved: true,
        });
      }

      const contributingSources = admissible.map((a) => a.sourceId);
      const observableEvidence = admissible.flatMap((a) => a.observation.evidence).slice(0, 20);

      capabilityProfile.push({
        competencyId: competency.competencyId,
        capability: competency.capability,
        inferredStatus: candidateStatus,
        primaryEvidenceSource: upgrade.decisiveSource,
        supportingSources: contributingSources.filter((s) => s !== upgrade.decisiveSource),
        observableEvidence,
      });

      fusionTrace.push({
        competencyId: competency.competencyId,
        fusedStatus: candidateStatus,
        contributingSources,
        appliedRuleIds: [upgrade.ruleId],
        appliedVetoIds,
        divergenceIds: divergenceIds.length > 0 ? divergenceIds : undefined,
        resolvedConflict: upgrade.emitsResolvedConflict,
        ruleSetVersion,
        confidenceReason: `Rule ${upgrade.ruleId}${appliedVetoIds.length ? `; vetoes ${appliedVetoIds.join(',')}` : ''}`,
        inputs: {
          ...(assessmentStatus ? { ASSESSMENT: assessmentStatus } : {}),
          ...(projectStatus ? { PROJECT: projectStatus } : {}),
        },
      });
    }

    const competencyResults: CompetencyResult[] = capabilityProfile.map((row) => ({
      competencyId: row.competencyId,
      status: row.inferredStatus,
      confidence: 'MEDIUM' as const,
      evidence: row.observableEvidence,
    }));

    let inferredDomainProficiency = determineSupportedProficiency(
      competencyResults,
      input.proficiencyRequirements,
    );

    if (appliedCeiling) {
      appliedDomainVetoIds.add('V-CEIL-01');
      domainCap = domainCap ? capProficiency(domainCap, appliedCeiling) : appliedCeiling;
    }

    if (domainCap && inferredDomainProficiency) {
      inferredDomainProficiency = capProficiency(inferredDomainProficiency, domainCap);
    }

    let proficiencyInferenceReason: 'INSUFFICIENT_EVIDENCE' | 'VETO_BLOCKED' | null = null;
    if (inferredDomainProficiency === null) {
      const allWeak = competencyResults.every(
        (r) => r.status === 'NOT_TESTED' || r.status === 'NOT_DEMONSTRATED',
      );
      proficiencyInferenceReason = allWeak ? 'INSUFFICIENT_EVIDENCE' : 'VETO_BLOCKED';
    }

    const assessmentBundle = bundles.find((b) => b.sourceId === 'ASSESSMENT');
    const testedItemCount =
      assessmentBundle?.metadata?.testedItemCount ??
      competencyResults.filter((r) => r.status !== 'NOT_TESTED').length;

    const domainConfidence = computeDomainConfidence({
      assessmentResults: competencyResults,
      testedItemCount,
      projectAvailable: projectBundle?.available ?? false,
      projectTrust: projectBundle?.trustTier ?? null,
      projectReport: projectBundle?.metadata?.projectReport as {
        scores?: { confidence?: number };
      } | null,
      appliedDomainVetoIds: [...appliedDomainVetoIds],
      inferredDomainProficiency,
      capabilityProfile,
      requirements: input.proficiencyRequirements,
    });

    const next = recommendAssessmentNextStep({
      supportedProficiency: inferredDomainProficiency,
      targetProficiency: input.targetProficiency,
      competencyResults,
      requirements: input.proficiencyRequirements,
      stageComplete: true,
      allowUpwardProbe: false,
    });

    const recommendedNextStep = next.recommendedNextStep;

    const capabilityGaps = buildCapabilityGaps(
      capabilityProfile,
      input.competencyModel,
      input.targetProficiency,
      input.proficiencyRequirements,
    );
    const skillCode = input.competencyModel[0]?.skillCode ?? 'UNKNOWN';

    return {
      skillCode,
      capabilityProfile,
      inferredDomainProficiency,
      proficiencyInferenceReason,
      ruleSetVersion,
      capabilityGaps,
      confidence: domainConfidence.confidence,
      confidenceReason: domainConfidence.confidenceReason,
      activeSources: bundles.filter((b) => b.available).map((b) => b.sourceId),
      conflicts,
      fusionTrace,
      assessmentComplete: true,
      recommendedNextStep,
    };
  });
}
