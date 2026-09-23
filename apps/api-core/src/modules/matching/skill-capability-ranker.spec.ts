import { describe, expect, it } from 'vitest';
import {
  WHY_MAX_LENGTH,
  buildWhy,
  rankSkillCapabilityCandidates,
  scoreSkillCapabilityCandidate,
  type SkillCapabilityCandidate,
  type SkillCapabilityJob,
} from './skill-capability-ranker.js';

const baseJob: SkillCapabilityJob = {
  requiredSkills: [
    {
      code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      name: 'Python',
      minRank: 2,
      minProficiency: 'INTERMEDIATE',
    },
    {
      code: 'SQL_QUERY_OPTIMIZATION',
      name: 'SQL',
      minRank: 1,
      minProficiency: 'BEGINNER',
    },
  ],
  requiredCapabilities: [
    {
      competencyId: '828ed14b-2aca-408b-adc1-78e24f22b09d',
      capability: 'Python syntax, idioms & standard library',
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      role: 'critical',
    },
  ],
};

const fullCandidate: SkillCapabilityCandidate = {
  studentId: 'student-a',
  verified: [
    { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', rank: 2, proficiency: 'INTERMEDIATE' },
    { code: 'SQL_QUERY_OPTIMIZATION', rank: 1, proficiency: 'BEGINNER' },
  ],
  competencyResults: [
    {
      competencyId: '828ed14b-2aca-408b-adc1-78e24f22b09d',
      status: 'DEMONSTRATED',
    },
  ],
  inferredCapabilities: [],
  qlixObservations: [],
};

describe('skill-capability-ranker (S6-RM-23)', () => {
  it('keeps partial matches instead of applying a coverage cutoff', () => {
    const partial: SkillCapabilityCandidate = {
      ...fullCandidate,
      studentId: 'student-b',
      verified: [
        { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', rank: 2, proficiency: 'INTERMEDIATE' },
      ],
    };
    const { ranked } = rankSkillCapabilityCandidates(baseJob, [fullCandidate, partial], 10);
    expect(ranked.map((row) => row.studentId)).toEqual(['student-a', 'student-b']);
    expect(ranked[1]?.requiredSkillsMissing).toBe(1);
  });

  it('drops candidates with no verified required skills', () => {
    const none: SkillCapabilityCandidate = {
      ...fullCandidate,
      studentId: 'student-z',
      verified: [],
    };
    const { ranked, candidatesScoredCount } = rankSkillCapabilityCandidates(
      baseJob,
      [none, fullCandidate],
      10,
    );
    expect(candidatesScoredCount).toBe(1);
    expect(ranked).toHaveLength(1);
  });

  it('scores one level above the ask higher than exactly at the ask', () => {
    const atAsk: SkillCapabilityCandidate = {
      studentId: 'at-ask',
      verified: [
        { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', rank: 2, proficiency: 'INTERMEDIATE' },
      ],
      competencyResults: [],
      inferredCapabilities: [],
      qlixObservations: [],
    };
    const aboveAsk: SkillCapabilityCandidate = {
      studentId: 'above',
      verified: [
        { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', rank: 3, proficiency: 'ADVANCED' },
      ],
      competencyResults: [],
      inferredCapabilities: [],
      qlixObservations: [],
    };
    const firstRequired = baseJob.requiredSkills[0];
    if (!firstRequired) throw new Error('expected base job skill fixture');
    const job: SkillCapabilityJob = {
      requiredSkills: [firstRequired],
      requiredCapabilities: [],
    };
    const atScore = scoreSkillCapabilityCandidate(job, atAsk);
    const aboveScore = scoreSkillCapabilityCandidate(job, aboveAsk);
    expect(atScore.rawMatchScore).toBeCloseTo(1);
    expect(aboveScore.rawMatchScore).toBeCloseTo(1.5);
    expect(aboveScore.matchScore).toBe(1);
  });

  it('caps credit at 1.5 for skills far above the ask', () => {
    const job: SkillCapabilityJob = {
      requiredSkills: [
        {
          code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
          name: 'Python',
          minRank: 1,
          minProficiency: 'BEGINNER',
        },
      ],
      requiredCapabilities: [],
    };
    const pro: SkillCapabilityCandidate = {
      studentId: 'pro',
      verified: [
        { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', rank: 4, proficiency: 'PROFESSIONAL' },
      ],
      competencyResults: [],
      inferredCapabilities: [],
      qlixObservations: [],
    };
    expect(scoreSkillCapabilityCandidate(job, pro).rawMatchScore).toBeCloseTo(1.5);
  });

  it('uses capability score as tie-break when raw demand matches', () => {
    const lowCap: SkillCapabilityCandidate = {
      ...fullCandidate,
      studentId: 'low',
      competencyResults: [],
    };
    const { ranked } = rankSkillCapabilityCandidates(baseJob, [lowCap, fullCandidate], 10);
    expect(ranked[0]?.studentId).toBe('student-a');
  });

  it('assigns STRONG potential fit when raw demand is at least 1', () => {
    const score = scoreSkillCapabilityCandidate(baseJob, fullCandidate);
    expect(score.potentialFit).toBe('STRONG');
    expect(score.requiredSkillsHeld).toBe(2);
    expect(score.requiredSkillsMissing).toBe(0);
  });

  it('buildWhy stays within 280 characters for worst-case labels', () => {
    const longName = 'Enterprise '.repeat(12).trim();
    const why = buildWhy({
      requiredTotal: 12,
      requiredSkillsHeld: 2,
      requiredSkillsMissing: 10,
      skillFit: [
        {
          skillCode: 'A',
          skillName: longName,
          status: 'MET',
          requiredProficiency: 'INTERMEDIATE',
          actualProficiency: 'ADVANCED',
        },
        {
          skillCode: 'B',
          skillName: longName,
          status: 'MISSING',
          requiredProficiency: 'BEGINNER',
          actualProficiency: null,
        },
      ],
      transferSkills: [
        {
          skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
          skillName: longName,
          reason: 'SAME_CATEGORY',
          rank: 3,
        },
      ],
    });
    expect(why.length).toBeLessThanOrEqual(WHY_MAX_LENGTH);
    expect(why).toMatch(/Held 2 of 12 required \(10 missing\)/);
  });
});
