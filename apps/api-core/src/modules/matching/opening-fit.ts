/**
 * JOB-02 (Th6-379/382) — READ-ONLY opening-level fit for a student.
 *
 * NOTE FOR REVIEW (Ramansh, Th6-368–371): this file does not change any scoring. It calls the locked
 * rules ranker (`scoreCandidate`) for the percentage and derives the band with the same thresholds
 * `computePotentialFit` uses (>= 1 STRONG, >= 0.5 MODERATE, else STRETCH), applied to how fully the
 * student meets the opening's required skills. The UI shows this band; it never recomputes it.
 */
import { SKILL_DEFINITIONS, type JobFitBand } from '@smart/contracts';
import {
  PROFICIENCY_RANK,
  scoreCandidate,
  type ProficiencyName,
  type RankerCandidate,
  type RankerJob,
} from './rules-ranker.js';

const skillNameByCode = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));

export interface OpeningFitOpening {
  domainCode: string | null;
  minYearsExperience: number | null;
  maxYearsExperience: number | null;
  location: string | null;
  requiredSkills: readonly { minProficiency: string; skill: { code: string } }[];
}

export interface VerifiedClaimFact {
  proficiency: string;
  skill: { code: string; domain: string };
}

export interface OpeningFit {
  matchPercent: number;
  band: JobFitBand;
  /** Strongest first: met requirements, then partial ones. */
  reasons: string[];
}

export function rankOf(proficiency: string): number {
  return PROFICIENCY_RANK[proficiency as ProficiencyName] ?? 0;
}

function label(proficiency: string): string {
  return proficiency.charAt(0) + proficiency.slice(1).toLowerCase();
}

/** Band from how fully the required skills are met: mean of min(1, held rank / required rank). */
export function fitBandFor(coverage: number): JobFitBand {
  if (coverage >= 1) return 'STRONG';
  if (coverage >= 0.5) return 'MODERATE';
  return 'STRETCH';
}

/** Null when the opening lists no required skills or the student has no verified skills to compare. */
export function scoreOpeningForStudent(
  studentId: string,
  opening: OpeningFitOpening,
  claims: readonly VerifiedClaimFact[],
): OpeningFit | null {
  if (opening.requiredSkills.length === 0 || claims.length === 0) return null;

  const candidate: RankerCandidate = {
    studentId,
    verified: claims.map((claim) => ({
      code: claim.skill.code,
      rank: rankOf(claim.proficiency),
      domain: claim.skill.domain,
    })),
    years: null,
    location: null,
  };
  const job: RankerJob = {
    requiredSkills: opening.requiredSkills.map((row) => ({
      code: row.skill.code,
      minRank: rankOf(row.minProficiency),
    })),
    domainCode: opening.domainCode ?? 'SOFTWARE_IT',
    minYearsExperience: opening.minYearsExperience,
    maxYearsExperience: opening.maxYearsExperience,
    location: opening.location,
  };
  const score = scoreCandidate(job, candidate);
  if (score.s === 0) return null;

  const held = new Map(claims.map((claim) => [claim.skill.code, claim]));
  const met: string[] = [];
  const partial: string[] = [];
  let coverageSum = 0;
  for (const required of opening.requiredSkills) {
    const name = skillNameByCode.get(required.skill.code) ?? required.skill.code;
    const claim = held.get(required.skill.code);
    const minRank = rankOf(required.minProficiency);
    if (!claim) continue;
    const ratio = minRank <= 0 ? 1 : Math.min(1, rankOf(claim.proficiency) / minRank);
    coverageSum += ratio;
    if (ratio >= 1) {
      met.push(
        `Your verified ${name} (${label(claim.proficiency)}) meets the ${label(required.minProficiency)} requirement`,
      );
    } else {
      partial.push(
        `${name}: you have ${label(claim.proficiency)}, the role asks for ${label(required.minProficiency)}`,
      );
    }
  }

  return {
    matchPercent: Math.max(0, Math.min(100, Math.round(score.matchMp / 10))),
    band: fitBandFor(coverageSum / opening.requiredSkills.length),
    reasons: [...met, ...partial],
  };
}
