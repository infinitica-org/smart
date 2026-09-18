import { roundTo } from '../statistics.js';
import { normalizeUnitScore, proficiencyCeilingToScore } from './qlix-recalibration.js';

export type QlixCompetencyObservationInput = {
  readonly competencyId: string;
  readonly status?: string;
  readonly confidence?: string;
};

export type QlixProjectFusionInput = {
  readonly projectId: string;
  readonly skillCodes: readonly string[];
  readonly appliedProficiencyCeiling?: string | null;
  readonly qualityScore?: number | null;
  readonly authenticityScore?: number | null;
  readonly relevanceScore?: number | null;
  readonly similarityIndex?: number | null;
  readonly aiLikelihood?: number | null;
  readonly qlixConfidence?: string | null;
  readonly competencyObservations?: readonly QlixCompetencyObservationInput[];
  readonly defenseScore?: number | null;
  readonly ownershipConcern?: boolean;
};

export type QlixFusionEncodedEntry = {
  readonly dimensionKey: string;
  readonly skillCode: string;
  readonly score: number;
  readonly confidence: number;
};

const COMPETENCY_STATUS_SCORE: Readonly<Record<string, number>> = {
  DEMONSTRATED: 0.85,
  PARTIALLY_DEMONSTRATED: 0.6,
  PARTIAL: 0.55,
  UNCERTAIN: 0.35,
  NOT_DEMONSTRATED: 0.15,
};

export function competencyObservationScore(status?: string): number {
  if (!status) return 0.35;
  const normalized = status.toUpperCase().replace(/-/g, '_');
  return COMPETENCY_STATUS_SCORE[normalized] ?? 0.35;
}

export function computeQlixSkillScore(
  input: Omit<QlixProjectFusionInput, 'projectId' | 'skillCodes'>,
): number | null {
  const components: number[] = [];

  const ceiling = proficiencyCeilingToScore(input.appliedProficiencyCeiling);
  if (ceiling != null) components.push(ceiling);

  for (const key of ['qualityScore', 'authenticityScore', 'relevanceScore'] as const) {
    const value = normalizeUnitScore(input[key]);
    if (value != null) components.push(value);
  }

  if (input.similarityIndex != null) {
    components.push(Math.max(0, (100 - input.similarityIndex) / 100));
  }

  const observations = input.competencyObservations ?? [];
  const observationAverage =
    observations.length > 0
      ? observations.reduce((sum, row) => sum + competencyObservationScore(row.status), 0) /
        observations.length
      : null;

  if (components.length === 0) {
    return observationAverage;
  }

  const base = components.reduce((sum, value) => sum + value, 0) / components.length;
  if (observationAverage == null) {
    return roundTo(Math.min(1, base), 4);
  }

  return roundTo(Math.min(1, base * 0.7 + observationAverage * 0.3), 4);
}

export function computeQlixFusionConfidence(
  input: Omit<QlixProjectFusionInput, 'projectId' | 'skillCodes'>,
): number {
  const normalized = input.qlixConfidence?.toLowerCase();
  let confidence =
    normalized === 'high'
      ? 0.85
      : normalized === 'medium'
        ? 0.65
        : normalized === 'low'
          ? 0.45
          : 0.5;

  if (input.defenseScore != null) {
    const defenseFactor = 0.7 + 0.3 * (Math.min(100, Math.max(0, input.defenseScore)) / 100);
    confidence = Math.min(1, confidence * defenseFactor);
  }

  if (input.ownershipConcern) {
    confidence *= 0.4;
  }

  if (input.similarityIndex != null && input.similarityIndex >= 80) {
    confidence *= 0.75;
  }

  if (input.aiLikelihood != null && input.aiLikelihood > 70) {
    confidence *= 0.8;
  }

  return roundTo(Math.min(1, Math.max(0.1, confidence)), 2);
}

/** Merge QLIX project evidence into skill-level passive entries (max score/confidence per skill). */
export function encodeQlixFusionEntries(
  projects: readonly QlixProjectFusionInput[],
): readonly QlixFusionEncodedEntry[] {
  const bySkill = new Map<string, QlixFusionEncodedEntry>();

  for (const project of projects) {
    const score = computeQlixSkillScore(project);
    if (score == null) continue;

    const confidence = computeQlixFusionConfidence(project);
    for (const skillCode of project.skillCodes) {
      const existing = bySkill.get(skillCode);
      if (
        !existing ||
        score > existing.score ||
        (score === existing.score && confidence > existing.confidence)
      ) {
        bySkill.set(skillCode, {
          dimensionKey: skillCode,
          skillCode,
          score,
          confidence:
            existing && score === existing.score
              ? Math.max(existing.confidence, confidence)
              : confidence,
        });
      }
    }
  }

  return [...bySkill.values()].sort((a, b) => a.skillCode.localeCompare(b.skillCode));
}
