/**
 * Deterministic skill + capability ranker (S6-RM-22).
 * Scores verified skills and assessment/inferred/QLIX capability evidence.
 * LLM does not set scores — only JD extraction and post-rank narrative.
 */

import type { CompetencyStatus, MatchEvidenceSource, PotentialFit } from '@smart/contracts';

export const SKILL_CAPABILITY_WEIGHTS = {
  skillCoverage: 0.6,
  skillProficiency: 0.4,
  finalSkill: 0.45,
  finalCapability: 0.55,
} as const;

export const PROFICIENCY_RANK = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
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

export interface SkillCapabilityScore {
  readonly studentId: string;
  readonly matchScore: number;
  readonly skillScore: number;
  readonly capabilityScore: number;
  readonly skillCoveragePct: number;
  readonly capabilityCoveragePct: number;
  readonly potentialFit: PotentialFit;
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

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return div(sum, values.length);
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

function computePotentialFit(matchScore: number, skillCoveragePct: number): PotentialFit {
  if (matchScore >= 0.75 && skillCoveragePct >= 0.8) return 'STRONG';
  if (matchScore >= 0.6) return 'MODERATE';
  return 'STRETCH';
}

function buildWhy(
  skillFit: readonly SkillFitRowInternal[],
  capabilityFit: readonly CapabilityFitRowInternal[],
): string {
  const met = skillFit.find((row) => row.status === 'MET');
  const gap = skillFit.find((row) => row.status !== 'MET');
  const capHit = capabilityFit.find((row) => row.hitScore >= 0.65);
  const parts: string[] = [];
  if (met) parts.push(`Met ${met.skillName}`);
  if (capHit) parts.push(`capability ${capHit.capability.slice(0, 40)}`);
  if (gap) parts.push(`gap ${gap.skillName}`);
  const text = parts.length > 0 ? parts.join('; ') + '.' : 'Skill and capability profile computed.';
  return text.length <= 280 ? text : text.slice(0, 280);
}

export function scoreSkillCapabilityCandidate(
  job: SkillCapabilityJob,
  candidate: SkillCapabilityCandidate,
): SkillCapabilityScore {
  const held = new Map(candidate.verified.map((claim) => [claim.code, claim]));
  const skillFit: SkillFitRowInternal[] = [];
  const proficiencyParts: number[] = [];
  let heldRequired = 0;

  for (const skill of job.requiredSkills) {
    const claim = held.get(skill.code);
    if (!claim) {
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
    if (claim.rank >= skill.minRank) {
      proficiencyParts.push(1);
      skillFit.push({
        skillCode: skill.code,
        skillName: skill.name,
        status: 'MET',
        requiredProficiency: skill.minProficiency,
        actualProficiency: claim.proficiency,
      });
    } else {
      proficiencyParts.push(claim.rank / skill.minRank);
      skillFit.push({
        skillCode: skill.code,
        skillName: skill.name,
        status: 'PARTIAL',
        requiredProficiency: skill.minProficiency,
        actualProficiency: claim.proficiency,
      });
    }
  }

  const skillCoveragePct =
    job.requiredSkills.length === 0 ? 1 : heldRequired / job.requiredSkills.length;
  const skillProficiency = job.requiredSkills.length === 0 ? 1 : mean(proficiencyParts);
  const skillScore =
    SKILL_CAPABILITY_WEIGHTS.skillCoverage * skillCoveragePct +
    SKILL_CAPABILITY_WEIGHTS.skillProficiency * skillProficiency;

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
  const capabilityScore = weightTotal === 0 ? 1 : weightedSum / weightTotal;

  const matchScore =
    SKILL_CAPABILITY_WEIGHTS.finalSkill * skillScore +
    SKILL_CAPABILITY_WEIGHTS.finalCapability * capabilityScore;

  const strongCompetencies = capabilityFit
    .filter((row) => row.hitScore >= 0.65)
    .map((row) => row.capability.slice(0, 200));
  const gapCompetencies = capabilityFit
    .filter((row) => row.hitScore < 0.5)
    .map((row) => row.capability.slice(0, 200));

  const potentialFit = computePotentialFit(matchScore, skillCoveragePct);

  return {
    studentId: candidate.studentId,
    matchScore,
    skillScore,
    capabilityScore,
    skillCoveragePct,
    capabilityCoveragePct,
    potentialFit,
    skillFit,
    capabilityFit,
    strongCompetencies,
    gapCompetencies,
    why: buildWhy(skillFit, capabilityFit),
  };
}

export function rankSkillCapabilityCandidates(
  job: SkillCapabilityJob,
  pool: readonly SkillCapabilityCandidate[],
  limit: number,
  minSkillCoverage: number,
): SkillCapabilityScore[] {
  const scored = pool
    .map((candidate) => scoreSkillCapabilityCandidate(job, candidate))
    .filter((score) => score.skillCoveragePct >= minSkillCoverage);

  scored.sort((left, right) => {
    if (right.matchScore !== left.matchScore) return right.matchScore > left.matchScore ? 1 : -1;
    if (right.capabilityScore !== left.capabilityScore) {
      return right.capabilityScore > left.capabilityScore ? 1 : -1;
    }
    if (right.skillScore !== left.skillScore) return right.skillScore > left.skillScore ? 1 : -1;
    if (left.studentId < right.studentId) return -1;
    if (left.studentId > right.studentId) return 1;
    return 0;
  });

  return scored.slice(0, Math.max(0, limit));
}
