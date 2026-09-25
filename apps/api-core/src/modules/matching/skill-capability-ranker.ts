/**
 * Deterministic skill + capability ranker (S6-RM-23).
 *
 * Headline `rawMatchScore`: average verified required-skill demand (millipoints).
 * Linear rank spacing (Beginner→Professional as 1–5) is an approximation; the 1.5 cap
 * is one nominal step above the ask, not a measured proficiency gap.
 * Equal weight per required skill — JobOpeningSkill has no critical/core flag yet.
 *
 * Sort: raw demand → capability tie-break → transfer tie-break. LLM does not score.
 */

import {
  getSkillBlueprint,
  getSkillDefinition,
  type CompetencyStatus,
  type MatchEvidenceSource,
  type PotentialFit,
  type TransferSkillReason,
} from '@smart/contracts';

export const SKILL_CAPABILITY_RANKER_VERSION = 'v1.2.0' as const;

/** Millipoints at exactly the asked proficiency. Credit above the ask stops here. */
export const HELD_AT_ASK_MP = 1000;
export const HELD_ABOVE_ASK_CAP_MP = 1500;
export const WHY_MAX_LENGTH = 280;

export const PROFICIENCY_RANK = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  PROFICIENT: 3,
  ADVANCED: 4,
  PROFESSIONAL: 5,
} as const;

export type ProficiencyName = keyof typeof PROFICIENCY_RANK;

export const ROLE_WEIGHT = {
  critical: 2,
  core: 1.5,
  supporting: 1,
} as const;

export interface SkillCapabilityRequiredSkill {
  readonly code: string;
  readonly name: string;
  readonly minRank: number;
  readonly minProficiency: string;
}

export interface SkillCapabilityRequiredCapability {
  readonly competencyId: string;
  readonly capability: string;
  readonly skillCode: string;
  readonly role: keyof typeof ROLE_WEIGHT;
}

export interface SkillCapabilityJob {
  readonly requiredSkills: readonly SkillCapabilityRequiredSkill[];
  readonly requiredCapabilities: readonly SkillCapabilityRequiredCapability[];
}

export interface VerifiedSkillClaim {
  readonly code: string;
  readonly rank: number;
  readonly proficiency: string;
}

export interface CompetencyResultRow {
  readonly competencyId: string;
  readonly status: CompetencyStatus;
}

export interface InferredCapabilityRow {
  readonly capabilityLabel: string;
  readonly skillCode: string | null;
  readonly confidenceScore: number;
  readonly assessmentVerified: boolean;
}

export interface QlixCompetencyObservation {
  readonly competencyId: string;
  readonly status: string | null | undefined;
}

export interface SkillCapabilityCandidate {
  readonly studentId: string;
  readonly verified: readonly VerifiedSkillClaim[];
  readonly competencyResults: readonly CompetencyResultRow[];
  readonly inferredCapabilities: readonly InferredCapabilityRow[];
  readonly qlixObservations: readonly QlixCompetencyObservation[];
}

export interface SkillFitRowInternal {
  readonly skillCode: string;
  readonly skillName: string;
  readonly status: 'MET' | 'PARTIAL' | 'MISSING';
  readonly requiredProficiency: string;
  readonly actualProficiency: string | null;
}

export interface CapabilityFitRowInternal {
  readonly competencyId: string;
  readonly capability: string;
  readonly skillCode: string;
  readonly hitScore: number;
  readonly evidenceSource: MatchEvidenceSource;
}

export interface TransferSkillInternal {
  readonly skillCode: string;
  readonly skillName: string;
  readonly reason: TransferSkillReason;
  readonly rank: number;
}

export interface SkillCapabilityScore {
  readonly studentId: string;
  /** Uncapped average demand; used for sort. */
  readonly rawMatchScore: number;
  /** API display: min(rawMatchScore, 1). */
  readonly matchScore: number;
  readonly skillScore: number;
  readonly capabilityScore: number;
  readonly skillCoveragePct: number;
  readonly capabilityCoveragePct: number;
  readonly potentialFit: PotentialFit;
  readonly requiredSkillsHeld: number;
  readonly requiredSkillsMissing: number;
  readonly transferSkills: readonly TransferSkillInternal[];
  readonly skillFit: readonly SkillFitRowInternal[];
  readonly capabilityFit: readonly CapabilityFitRowInternal[];
  readonly strongCompetencies: readonly string[];
  readonly gapCompetencies: readonly string[];
  readonly why: string;
}

function div(n: number, d: number): number {
  if (d === 0) return 0;
  return Math.floor((n + Math.floor(d / 2)) / d);
}

function tokenOverlap(left: string, right: string): number {
  const tokens = (value: string) =>
    new Set(
      value
        .toLowerCase()
        .split(/\W+/)
        .filter((part) => part.length > 2),
    );
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared += 1;
  }
  return shared / Math.max(a.size, b.size);
}

function assessmentStatusScore(status: CompetencyStatus): number {
  switch (status) {
    case 'DEMONSTRATED':
      return 1;
    case 'PARTIALLY_DEMONSTRATED':
      return 0.65;
    case 'UNCERTAIN':
      return 0.35;
    default:
      return 0;
  }
}

function qlixStatusScore(status: string | null | undefined): number {
  if (status === 'DEMONSTRATED') return 0.8;
  if (status === 'PARTIALLY_DEMONSTRATED') return 0.5;
  return 0;
}

function capabilityHit(
  required: SkillCapabilityRequiredCapability,
  candidate: SkillCapabilityCandidate,
): { score: number; source: MatchEvidenceSource } {
  const assessment = candidate.competencyResults.find(
    (row) => row.competencyId === required.competencyId,
  );
  if (assessment) {
    const score = assessmentStatusScore(assessment.status);
    if (score > 0) return { score, source: 'ASSESSMENT' };
  }

  const qlix = candidate.qlixObservations.find((row) => row.competencyId === required.competencyId);
  if (qlix) {
    const score = qlixStatusScore(qlix.status);
    if (score > 0) return { score, source: 'QLIX' };
  }

  let best = 0;
  for (const inferred of candidate.inferredCapabilities) {
    if (inferred.skillCode !== required.skillCode) continue;
    const overlap = tokenOverlap(inferred.capabilityLabel, required.capability);
    if (overlap < 0.35) continue;
    const score = inferred.confidenceScore * overlap * (inferred.assessmentVerified ? 1 : 0.7);
    if (score > best) best = score;
  }
  if (best > 0) return { score: Math.min(1, best), source: 'INFERRED' };

  return { score: 0, source: 'NONE' };
}

function heldMillipoints(rank: number, minRank: number): number {
  if (minRank <= 0) return 0;
  return Math.min(div(1000 * rank, minRank), HELD_ABOVE_ASK_CAP_MP);
}

function computePotentialFit(rawMatchScore: number): PotentialFit {
  if (rawMatchScore >= 1) return 'STRONG';
  if (rawMatchScore >= 0.5) return 'MODERATE';
  return 'STRETCH';
}

function shortenLabel(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + '…';
}

/** Exported for unit tests (280-char budget, clause-safe truncation). */
export function buildWhy(input: {
  requiredTotal: number;
  requiredSkillsHeld: number;
  requiredSkillsMissing: number;
  skillFit: readonly SkillFitRowInternal[];
  transferSkills: readonly TransferSkillInternal[];
}): string {
  const met = input.skillFit.find((row) => row.status === 'MET' || row.status === 'PARTIAL');
  const gap = input.skillFit.find((row) => row.status === 'MISSING');
  const transfer = input.transferSkills[0];
  const parts: string[] = [];
  parts.push(
    `Held ${input.requiredSkillsHeld} of ${input.requiredTotal} required (${input.requiredSkillsMissing} missing).`,
  );
  if (met) parts.push(`Met ${shortenLabel(met.skillName, 48)}`);
  if (gap) parts.push(`gap ${shortenLabel(gap.skillName, 48)}`);
  if (transfer) parts.push(`transfer ${shortenLabel(transfer.skillName, 40)}`);
  let text = parts.join('; ') + '.';
  if (text.length <= WHY_MAX_LENGTH) return text;
  text = parts.slice(0, -1).join('; ') + '.';
  if (text.length <= WHY_MAX_LENGTH) return text;
  return shortenLabel(text, WHY_MAX_LENGTH);
}

function computeTransferSkills(
  job: SkillCapabilityJob,
  candidate: SkillCapabilityCandidate,
): TransferSkillInternal[] {
  const requiredCodes = new Set(job.requiredSkills.map((skill) => skill.code));
  const requiredCategories = new Set<string>();
  for (const skill of job.requiredSkills) {
    const def = getSkillDefinition(skill.code);
    if (def) requiredCategories.add(def.categoryId);
  }

  const transfer: TransferSkillInternal[] = [];
  for (const claim of candidate.verified) {
    if (requiredCodes.has(claim.code)) continue;
    const def = getSkillDefinition(claim.code);
    if (!def) continue;

    let reason: TransferSkillReason | null = null;
    if (requiredCategories.has(def.categoryId)) {
      reason = 'SAME_CATEGORY';
    } else {
      const blueprint = getSkillBlueprint(claim.code);
      for (const required of job.requiredCapabilities) {
        for (const row of blueprint?.competencyModel ?? []) {
          if (row.role !== 'critical' && row.role !== 'core') continue;
          if (tokenOverlap(row.capability, required.capability) >= 0.35) {
            reason = 'CAPABILITY_OVERLAP';
            break;
          }
        }
        if (reason) break;
      }
    }
    if (!reason) continue;
    transfer.push({
      skillCode: claim.code,
      skillName: def.name,
      reason,
      rank: claim.rank,
    });
  }

  transfer.sort((left, right) => {
    if (right.rank !== left.rank) return right.rank - left.rank;
    if (left.skillCode < right.skillCode) return -1;
    if (left.skillCode > right.skillCode) return 1;
    return 0;
  });
  return transfer;
}

export function scoreSkillCapabilityCandidate(
  job: SkillCapabilityJob,
  candidate: SkillCapabilityCandidate,
): SkillCapabilityScore {
  const held = new Map(candidate.verified.map((claim) => [claim.code, claim]));
  const skillFit: SkillFitRowInternal[] = [];
  let heldRequired = 0;
  let missingRequired = 0;
  let demandSumMp = 0;

  for (const skill of job.requiredSkills) {
    const claim = held.get(skill.code);
    if (!claim) {
      missingRequired += 1;
      skillFit.push({
        skillCode: skill.code,
        skillName: skill.name,
        status: 'MISSING',
        requiredProficiency: skill.minProficiency,
        actualProficiency: null,
      });
      continue;
    }
    heldRequired += 1;
    const contribution = heldMillipoints(claim.rank, skill.minRank);
    demandSumMp += contribution;
    if (claim.rank >= skill.minRank) {
      skillFit.push({
        skillCode: skill.code,
        skillName: skill.name,
        status: 'MET',
        requiredProficiency: skill.minProficiency,
        actualProficiency: claim.proficiency,
      });
    } else {
      skillFit.push({
        skillCode: skill.code,
        skillName: skill.name,
        status: 'PARTIAL',
        requiredProficiency: skill.minProficiency,
        actualProficiency: claim.proficiency,
      });
    }
  }

  const skillCount = job.requiredSkills.length;
  const rawMatchScore = skillCount === 0 ? 0 : demandSumMp / (HELD_AT_ASK_MP * skillCount);
  const matchScore = Math.min(rawMatchScore, 1);
  const skillCoveragePct = skillCount === 0 ? 0 : heldRequired / skillCount;
  const skillScore = rawMatchScore;

  const capabilityFit: CapabilityFitRowInternal[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const required of job.requiredCapabilities) {
    const hit = capabilityHit(required, candidate);
    const weight = ROLE_WEIGHT[required.role];
    weightedSum += hit.score * weight;
    weightTotal += weight;
    capabilityFit.push({
      competencyId: required.competencyId,
      capability: required.capability,
      skillCode: required.skillCode,
      hitScore: hit.score,
      evidenceSource: hit.source,
    });
  }

  const capabilityCoveragePct =
    capabilityFit.length === 0
      ? 1
      : capabilityFit.filter((row) => row.hitScore >= 0.5).length / capabilityFit.length;
  const capabilityScore = weightTotal === 0 ? 0 : weightedSum / weightTotal;

  const transferSkills = computeTransferSkills(job, candidate);

  const strongCompetencies = capabilityFit
    .filter((row) => row.hitScore >= 0.65)
    .map((row) => row.capability.slice(0, 200));
  const gapCompetencies = capabilityFit
    .filter((row) => row.hitScore < 0.5)
    .map((row) => row.capability.slice(0, 200));

  const potentialFit = computePotentialFit(rawMatchScore);

  return {
    studentId: candidate.studentId,
    rawMatchScore,
    matchScore,
    skillScore,
    capabilityScore,
    skillCoveragePct,
    capabilityCoveragePct,
    potentialFit,
    requiredSkillsHeld: heldRequired,
    requiredSkillsMissing: missingRequired,
    transferSkills,
    skillFit,
    capabilityFit,
    strongCompetencies,
    gapCompetencies,
    why: buildWhy({
      requiredTotal: skillCount,
      requiredSkillsHeld: heldRequired,
      requiredSkillsMissing: missingRequired,
      skillFit,
      transferSkills,
    }),
  };
}

export function rankSkillCapabilityCandidates(
  job: SkillCapabilityJob,
  pool: readonly SkillCapabilityCandidate[],
  limit: number,
): { ranked: SkillCapabilityScore[]; candidatesScoredCount: number } {
  const scored = pool
    .map((candidate) => scoreSkillCapabilityCandidate(job, candidate))
    .filter((score) => score.rawMatchScore > 0);

  const candidatesScoredCount = scored.length;

  scored.sort((left, right) => {
    if (right.rawMatchScore !== left.rawMatchScore) {
      return right.rawMatchScore > left.rawMatchScore ? 1 : -1;
    }
    if (right.capabilityScore !== left.capabilityScore) {
      return right.capabilityScore > left.capabilityScore ? 1 : -1;
    }
    if (right.transferSkills.length !== left.transferSkills.length) {
      return right.transferSkills.length - left.transferSkills.length;
    }
    const leftBestTransfer = left.transferSkills[0]?.rank ?? 0;
    const rightBestTransfer = right.transferSkills[0]?.rank ?? 0;
    if (rightBestTransfer !== leftBestTransfer) return rightBestTransfer - leftBestTransfer;
    if (left.studentId < right.studentId) return -1;
    if (left.studentId > right.studentId) return 1;
    return 0;
  });

  return {
    ranked: scored.slice(0, Math.max(0, limit)),
    candidatesScoredCount,
  };
}
