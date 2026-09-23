import type {
  CompetencyStatus,
  Observation,
  ObservationBundle,
  ProjectVerificationReportDto,
  SkillCompetency,
} from '@smart/contracts';
import { projectToObservationBundle } from './source-adapters/project.adapter.js';
import { maxStatus, proficiencyCapOrdinal } from './status-ordinal.js';
import type { ProficiencyLevel } from '@smart/contracts';

export type QlixProjectCompetencyObservationInput = {
  competencyId: string;
  status?: string | null;
  evidenceSnippets?: string[] | null;
};

export type QlixProjectEvidenceInput = {
  report: ProjectVerificationReportDto;
  competencyObservations: readonly QlixProjectCompetencyObservationInput[];
  appliedProficiencyCeiling?: string | null;
  evidenceRecordId?: string;
  projectId?: string;
};

const QLIX_STATUS_MAP: Record<string, CompetencyStatus> = {
  DEMONSTRATED: 'DEMONSTRATED',
  PARTIALLY_DEMONSTRATED: 'PARTIALLY_DEMONSTRATED',
  UNCERTAIN: 'UNCERTAIN',
  NOT_DEMONSTRATED: 'NOT_DEMONSTRATED',
  NOT_TESTED: 'NOT_TESTED',
};

export function normalizeQlixCompetencyStatus(raw: string | null | undefined): CompetencyStatus {
  if (!raw) return 'NOT_TESTED';
  const key = raw.trim().toUpperCase().replace(/\s+/g, '_');
  return QLIX_STATUS_MAP[key] ?? 'NOT_TESTED';
}

function parseProficiencyCeiling(raw: string | null | undefined): ProficiencyLevel | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase();
  if (
    normalized === 'BEGINNER' ||
    normalized === 'INTERMEDIATE' ||
    normalized === 'PROFICIENT' ||
    normalized === 'ADVANCED' ||
    normalized === 'PROFESSIONAL'
  ) {
    return normalized;
  }
  return null;
}

/** Build a PROJECT observation bundle from verify report + QLIX competency rows (SKL-02 / I306). */
export function projectBundleFromQlixEvidence(
  input: QlixProjectEvidenceInput,
  blueprint: { competencyModel: readonly SkillCompetency[] },
): ObservationBundle {
  const base = projectToObservationBundle(input.report, blueprint);
  if (!base.available) return base;

  const obsByCompetency = new Map(
    input.competencyObservations.map((row) => [row.competencyId, row]),
  );

  const observations: Observation[] = blueprint.competencyModel.map((comp) => {
    const qlix = obsByCompetency.get(comp.competencyId);
    const claimedStatus = qlix
      ? normalizeQlixCompetencyStatus(qlix.status)
      : ('NOT_TESTED' as CompetencyStatus);
    const snippets = qlix?.evidenceSnippets ?? [];
    const evidence = [
      ...(input.projectId ? [`project:${input.projectId}`] : []),
      ...(input.evidenceRecordId ? [`evidence:${input.evidenceRecordId}`] : []),
      ...snippets.slice(0, 5).map((s) => s.slice(0, 500)),
    ];
    return {
      competencyId: comp.competencyId,
      capability: comp.capability,
      claimedStatus,
      evidence,
    };
  });

  const ceiling = parseProficiencyCeiling(input.appliedProficiencyCeiling ?? null);

  return {
    ...base,
    observations,
    appliedCeiling: ceiling,
    metadata: {
      ...base.metadata,
      projectReport: input.report,
    },
  };
}

const TRUST_RANK = {
  UNAVAILABLE: 0,
  UNTRUSTED: 1,
  PROVISIONAL: 2,
  TRUSTED: 3,
} as const;

function weakerTrust(
  a: ObservationBundle['trustTier'],
  b: ObservationBundle['trustTier'],
): ObservationBundle['trustTier'] {
  return TRUST_RANK[a] <= TRUST_RANK[b] ? a : b;
}

/** Fuse multiple PROJECT bundles into one decisive bundle per competency (I306). */
export function mergeProjectObservationBundles(
  bundles: readonly ObservationBundle[],
  blueprint: { competencyModel: readonly SkillCompetency[] },
): ObservationBundle | null {
  const projectBundles = bundles.filter((b) => b.sourceId === 'PROJECT' && b.available);
  const seed = projectBundles[0];
  if (!seed) return null;

  let trustTier = seed.trustTier;
  let appliedCeiling: ProficiencyLevel | null = null;
  const authenticityFlags = new Set<string>();

  const mergedObs = new Map<string, Observation>();

  for (const bundle of projectBundles) {
    trustTier = weakerTrust(trustTier, bundle.trustTier);
    for (const flag of bundle.authenticityFlags) authenticityFlags.add(flag);
    if (bundle.appliedCeiling) {
      appliedCeiling =
        appliedCeiling &&
        proficiencyCapOrdinal(appliedCeiling) < proficiencyCapOrdinal(bundle.appliedCeiling)
          ? appliedCeiling
          : bundle.appliedCeiling;
    }

    for (const comp of blueprint.competencyModel) {
      const obs = bundle.observations.find((o) => o.competencyId === comp.competencyId);
      if (!obs) continue;
      const existing = mergedObs.get(comp.competencyId);
      if (!existing) {
        mergedObs.set(comp.competencyId, { ...obs });
        continue;
      }
      const fusedStatus =
        maxStatus(existing.claimedStatus, obs.claimedStatus) ?? existing.claimedStatus;
      mergedObs.set(comp.competencyId, {
        ...existing,
        claimedStatus: fusedStatus,
        evidence: [...new Set([...existing.evidence, ...obs.evidence])].slice(0, 20),
      });
    }
  }

  const observations: Observation[] = blueprint.competencyModel.map((comp) => {
    const row = mergedObs.get(comp.competencyId);
    return (
      row ?? {
        competencyId: comp.competencyId,
        capability: comp.capability,
        claimedStatus: 'NOT_TESTED' as CompetencyStatus,
        evidence: [],
      }
    );
  });

  return {
    sourceId: 'PROJECT',
    available: true,
    trustTier,
    observations,
    authenticityFlags: [...authenticityFlags],
    appliedCeiling,
    metadata: { projectReport: projectBundles[0]?.metadata?.projectReport },
  };
}
