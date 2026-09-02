import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  combine,
  rankCandidates,
  scoreCandidate,
  type RankerCandidate,
  type RankerJob,
} from './rules-ranker.js';

/**
 * Independent copies of the locked helpers. If `rules-ranker.ts` drifts, these
 * expected millipoints stay put and CI fails.
 */
function specDiv(n: number, d: number): number {
  if (d === 0) return 0;
  return Math.floor((n + Math.floor(d / 2)) / d);
}

function specMean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return specDiv(sum, values.length);
}

function specCombine(s: number, p: number, d: number, e: number, l: number): number {
  return specDiv(s * 350 + p * 300 + d * 150 + e * 100 + l * 100, 1000);
}

const SKILL_A = 'PROGRAMMING_FUNDAMENTALS_LOGIC';
const SKILL_B = 'DATABASE_FUNDAMENTALS';
const SKILL_C = 'DATA_STRUCTURES_ALGORITHMS';

const threeRequired: RankerJob = {
  requiredSkills: [
    { code: SKILL_A, minRank: 2 },
    { code: SKILL_B, minRank: 1 },
    { code: SKILL_C, minRank: 3 },
  ],
  domainCode: 'SOFTWARE_IT',
  minYearsExperience: 0,
  maxYearsExperience: 4,
  location: 'Bengaluru',
};

function candidate(
  overrides: Partial<RankerCandidate> & Pick<RankerCandidate, 'verified'>,
): RankerCandidate {
  return {
    studentId: overrides.studentId ?? randomUUID(),
    years: overrides.years ?? 2,
    location: overrides.location ?? 'Bengaluru',
    verified: overrides.verified,
  };
}

function atBar(code: string, rank = 3): RankerCandidate['verified'][number] {
  return { code, rank, domain: 'SOFTWARE_IT' };
}

describe('SE-T05 locked millipoint helpers', () => {
  it('all 1000s combine to matchMp 1000', () => {
    expect(combine(1000, 1000, 1000, 1000, 1000)).toBe(1000);
    expect(specCombine(1000, 1000, 1000, 1000, 1000)).toBe(1000);
  });

  it('2 of 3 required held at bar → s=667, matchMp=883 (hole not in P)', () => {
    const s = specDiv(2000, 3);
    expect(s).toBe(667);
    const matchMp = specCombine(s, 1000, 1000, 1000, 1000);
    expect(matchMp).toBe(883);

    const scored = scoreCandidate(
      threeRequired,
      candidate({
        verified: [atBar(SKILL_A, 2), atBar(SKILL_B, 1)],
      }),
    );
    expect(scored.s).toBe(667);
    expect(scored.p).toBe(1000);
    expect(scored.matchMp).toBe(883);
  });
});

describe('SE-T05 scoreCandidate', () => {
  it('full match at or above min is millipoint 1000', () => {
    const scored = scoreCandidate(
      threeRequired,
      candidate({
        verified: [atBar(SKILL_A, 2), atBar(SKILL_B, 1), atBar(SKILL_C, 3)],
      }),
    );
    expect(scored.matchMp).toBe(1000);
    expect(scored.s).toBe(1000);
    expect(scored.p).toBe(1000);
    expect(scored.d).toBe(1000);
    expect(scored.e).toBe(1000);
    expect(scored.l).toBe(1000);
  });

  it('over-min proficiency equals at-min (no extra credit, no penalty)', () => {
    const atMin = scoreCandidate(
      { ...threeRequired, requiredSkills: [{ code: SKILL_A, minRank: 2 }] },
      candidate({ verified: [atBar(SKILL_A, 2)] }),
    );
    const overMin = scoreCandidate(
      { ...threeRequired, requiredSkills: [{ code: SKILL_A, minRank: 2 }] },
      candidate({ verified: [atBar(SKILL_A, 3)] }),
    );
    expect(atMin.p).toBe(1000);
    expect(overMin.p).toBe(1000);
    expect(overMin.matchMp).toBe(atMin.matchMp);
  });

  it('one-step proficiency shortfall scores strictly above a missing skill', () => {
    const job: RankerJob = {
      ...threeRequired,
      requiredSkills: [
        { code: SKILL_A, minRank: 3 },
        { code: SKILL_B, minRank: 3 },
        { code: SKILL_C, minRank: 3 },
      ],
    };
    const shortfall = scoreCandidate(
      job,
      candidate({
        verified: [atBar(SKILL_A, 3), atBar(SKILL_B, 3), atBar(SKILL_C, 2)],
      }),
    );
    const missing = scoreCandidate(
      job,
      candidate({
        verified: [atBar(SKILL_A, 3), atBar(SKILL_B, 3)],
      }),
    );
    expect(shortfall.p).toBe(specMean([1000, 1000, specDiv(2000, 3)]));
    expect(shortfall.matchMp).toBeGreaterThan(missing.matchMp);
  });

  it('unknown years (e=1000) outranks years=1 with min=2 by 50 millipoints', () => {
    const job: RankerJob = {
      ...threeRequired,
      requiredSkills: [{ code: SKILL_A, minRank: 1 }],
      minYearsExperience: 2,
      maxYearsExperience: 4,
    };
    const verified = [atBar(SKILL_A, 1)];
    const unknown = scoreCandidate(job, candidate({ verified, years: null }));
    const intern = scoreCandidate(job, candidate({ verified, years: 1 }));
    expect(unknown.e).toBe(1000);
    expect(intern.e).toBe(500);
    expect(unknown.matchMp - intern.matchMp).toBe(50);
  });

  it('max=0 and years=1 scores e=500, never 0', () => {
    const scored = scoreCandidate(
      {
        ...threeRequired,
        requiredSkills: [{ code: SKILL_A, minRank: 1 }],
        minYearsExperience: 0,
        maxYearsExperience: 0,
      },
      candidate({ verified: [atBar(SKILL_A, 1)], years: 1 }),
    );
    expect(scored.e).toBe(500);
    expect(scored.e).toBeGreaterThan(0);
  });

  it('Bengaluru vs Bengaluru, Karnataka outranks a different city', () => {
    const job: RankerJob = {
      ...threeRequired,
      requiredSkills: [{ code: SKILL_A, minRank: 1 }],
    };
    const verified = [atBar(SKILL_A, 1)];
    const contained = scoreCandidate(
      job,
      candidate({ verified, location: 'Bengaluru, Karnataka' }),
    );
    const other = scoreCandidate(job, candidate({ verified, location: 'Chennai' }));
    expect(contained.l).toBe(800);
    expect(other.l).toBe(0);
    expect(contained.matchMp).toBeGreaterThan(other.matchMp);
  });

  it('keeps millipoint order that 0/1 scoring would collapse', () => {
    const job: RankerJob = {
      ...threeRequired,
      requiredSkills: [{ code: SKILL_A, minRank: 3 }],
    };
    const oneStep = scoreCandidate(job, candidate({ verified: [atBar(SKILL_A, 2)] }));
    const missing = scoreCandidate(
      job,
      candidate({
        verified: [{ code: SKILL_B, rank: 3, domain: 'SOFTWARE_IT' }],
      }),
    );
    expect(oneStep.p).toBe(specDiv(2000, 3));
    expect(oneStep.matchMp).not.toBe(missing.matchMp);
    expect(oneStep.matchMp).toBeGreaterThan(missing.matchMp);
  });
});

describe('SE-T05 rankCandidates', () => {
  it('sorts matchMp desc, then p, then s, then studentId asc', () => {
    const job: RankerJob = {
      ...threeRequired,
      requiredSkills: [{ code: SKILL_A, minRank: 2 }],
    };
    const low = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const high = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const tiedA = candidate({
      studentId: high,
      verified: [atBar(SKILL_A, 2)],
    });
    const tiedB = candidate({
      studentId: low,
      verified: [atBar(SKILL_A, 2)],
    });
    const weaker = candidate({
      studentId: randomUUID(),
      verified: [atBar(SKILL_A, 1)],
    });
    const ranked = rankCandidates(job, [tiedA, weaker, tiedB], 10);
    expect(ranked.map((row) => row.studentId)).toEqual([low, high, weaker.studentId]);
  });

  it('applies limit after ranking', () => {
    const job: RankerJob = {
      ...threeRequired,
      requiredSkills: [{ code: SKILL_A, minRank: 1 }],
    };
    const pool = [
      candidate({ verified: [atBar(SKILL_A, 1)] }),
      candidate({ verified: [atBar(SKILL_A, 1)] }),
      candidate({ verified: [atBar(SKILL_A, 1)] }),
    ];
    expect(rankCandidates(job, pool, 1)).toHaveLength(1);
    expect(rankCandidates(job, pool, 1)[0]?.matchMp).toBe(1000);
  });
});
