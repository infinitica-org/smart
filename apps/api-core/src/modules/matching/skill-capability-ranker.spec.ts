import { describe, expect, it } from 'vitest';
import {
  rankSkillCapabilityCandidates,
  scoreSkillCapabilityCandidate,
  type SkillCapabilityCandidate,
  type SkillCapabilityJob,
} from './skill-capability-ranker.js';

const job: SkillCapabilityJob = {
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

describe('skill-capability-ranker', () => {
  it('excludes candidates below the skill coverage gate', () => {
    const partial: SkillCapabilityCandidate = {
      ...fullCandidate,
      studentId: 'student-b',
      verified: [
        { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', rank: 2, proficiency: 'INTERMEDIATE' },
      ],
    };
    const ranked = rankSkillCapabilityCandidates(job, [fullCandidate, partial], 10, 0.6);
    expect(ranked.map((row) => row.studentId)).toEqual(['student-a']);
  });

  it('scores assessment competency hits higher than missing evidence', () => {
    const withAssessment = scoreSkillCapabilityCandidate(job, fullCandidate);
    const withoutAssessment: SkillCapabilityCandidate = {
      ...fullCandidate,
      competencyResults: [],
    };
    const bare = scoreSkillCapabilityCandidate(job, withoutAssessment);
    expect(withAssessment.capabilityScore).toBeGreaterThan(bare.capabilityScore);
  });

  it('assigns STRONG potential fit when score and coverage are high', () => {
    const score = scoreSkillCapabilityCandidate(job, fullCandidate);
    expect(score.potentialFit).toBe('STRONG');
    expect(score.skillCoveragePct).toBe(1);
  });
});
