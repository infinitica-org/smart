/**
 * SE-T05 locked millipoint rules ranker (Th6-I113 / ADR 0012).
 *
 * Weights, unknown-handling, and helpers are frozen. Changing them after merge
 * reorders every TPO shortlist already shown. Do not renormalize; do not fold a
 * missing required skill into proficiency (coverage already owns the hole).
 */

export const RULE_WEIGHTS = {
  s: 350,
  p: 300,
  d: 150,
  e: 100,
  l: 100,
} as const;

export const PROFICIENCY_RANK = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  PROFICIENT: 3,
  ADVANCED: 4,
  PROFESSIONAL: 5,
} as const;

export type ProficiencyName = keyof typeof PROFICIENCY_RANK;

export interface RankerRequiredSkill {
  readonly code: string;
  readonly minRank: number;
}

export interface RankerVerifiedClaim {
  readonly code: string;
  readonly rank: number;
  readonly domain: string;
}

export interface RankerJob {
  readonly requiredSkills: readonly RankerRequiredSkill[];
  readonly domainCode: string;
  readonly minYearsExperience: number | null;
  readonly maxYearsExperience: number | null;
  readonly location: string | null;
}

export interface RankerCandidate {
  readonly studentId: string;
  readonly verified: readonly RankerVerifiedClaim[];
  readonly years: number | null;
  readonly location: string | null;
}

export interface RankerScore {
  readonly studentId: string;
  readonly matchMp: number;
  readonly s: number;
  readonly p: number;
  readonly d: number;
  readonly e: number;
  readonly l: number;
  readonly strongCompetencies: readonly string[];
  readonly gapCompetencies: readonly string[];
  readonly why: string;
}

/** Half-up integer division. `d === 0` → 0. */
export function div(n: number, d: number): number {
  if (d === 0) return 0;
  return Math.floor((n + Math.floor(d / 2)) / d);
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return div(sum, values.length);
}

export function combine(s: number, p: number, d: number, e: number, l: number): number {
  const weighted =
    s * RULE_WEIGHTS.s +
    p * RULE_WEIGHTS.p +
    d * RULE_WEIGHTS.d +
    e * RULE_WEIGHTS.e +
    l * RULE_WEIGHTS.l;
  return div(weighted, 1000);
}

export function scoreCandidate(job: RankerJob, candidate: RankerCandidate): RankerScore {
  const required = job.requiredSkills;
  const held = new Map(candidate.verified.map((claim) => [claim.code, claim]));

  let s: number;
  let p: number;
  const proficiencyParts: number[] = [];
  const strong: string[] = [];
  const gaps: string[] = [];

  if (required.length === 0) {
    s = 1000;
    p = 1000;
  } else {
    let heldRequired = 0;
    for (const skill of required) {
      const claim = held.get(skill.code);
      if (!claim) {
        gaps.push(skill.code);
        continue;
      }
      heldRequired += 1;
      if (claim.rank >= skill.minRank) {
        proficiencyParts.push(1000);
        strong.push(skill.code);
      } else {
        proficiencyParts.push(div(1000 * claim.rank, skill.minRank));
        gaps.push(skill.code);
      }
    }
    s = div(1000 * heldRequired, required.length);
    p = mean(proficiencyParts);
  }

  for (const claim of candidate.verified) {
    if (!required.some((skill) => skill.code === claim.code) && !strong.includes(claim.code)) {
      strong.push(claim.code);
    }
  }

  const inDomain = candidate.verified.filter((claim) => claim.domain === job.domainCode).length;
  const d = div(1000 * inDomain, candidate.verified.length);

  const e = experienceMp(candidate.years, job.minYearsExperience, job.maxYearsExperience);
  const l = locationMp(candidate.location, job.location);

  return {
    studentId: candidate.studentId,
    matchMp: combine(s, p, d, e, l),
    s,
    p,
    d,
    e,
    l,
    strongCompetencies: strong,
    gapCompetencies: gaps,
    why: buildWhy(strong, gaps),
  };
}

export function rankCandidates(
  job: RankerJob,
  pool: readonly RankerCandidate[],
  limit: number,
): RankerScore[] {
  const ranked = pool.map((candidate) => scoreCandidate(job, candidate));
  ranked.sort((left, right) => {
    if (right.matchMp !== left.matchMp) return right.matchMp - left.matchMp;
    if (right.p !== left.p) return right.p - left.p;
    if (right.s !== left.s) return right.s - left.s;
    if (left.studentId < right.studentId) return -1;
    if (left.studentId > right.studentId) return 1;
    return 0;
  });
  return ranked.slice(0, Math.max(0, limit));
}

function experienceMp(years: number | null, min: number | null, max: number | null): number {
  if (years === null || min === null || max === null) return 1000;
  if (years < min && min > 0) return div(1000 * years, min);
  if (years <= max) return 1000;
  return div(1000, 1 + (years - max));
}

function locationMp(candidate: string | null, opening: string | null): number {
  if (candidate === null || opening === null) return 1000;
  const left = normalizeLocation(candidate);
  const right = normalizeLocation(opening);
  if (left.length === 0 || right.length === 0) return 1000;
  if (left === right) return 1000;
  if (left.includes(right) || right.includes(left)) return 800;
  return 0;
}

function normalizeLocation(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildWhy(strong: readonly string[], gaps: readonly string[]): string {
  const met = strong[0];
  const gap = gaps[0];
  let text: string;
  if (met && gap) text = `Met ${met}; gap ${gap}.`;
  else if (met) text = `Met required skill ${met}.`;
  else if (gap) text = `No required skills verified; gap ${gap}.`;
  else text = 'No required skills to compare.';
  return text.length <= 280 ? text : text.slice(0, 280);
}
