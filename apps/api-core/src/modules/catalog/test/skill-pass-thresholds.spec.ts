import { describe, expect, it } from 'vitest';
import { TRACK_DEFINITIONS } from '@smart/contracts';
import {
  passThresholdsFor,
  TECH_FULLSTACK_SKILL_PASS_THRESHOLDS,
} from '../skill-pass-thresholds.js';

describe('skill pass thresholds (INF-05)', () => {
  it('defines a pass bar map for every TECH_FULLSTACK topic', () => {
    const topics =
      TRACK_DEFINITIONS.find((track) => track.code === 'TECH_FULLSTACK')?.domains.flatMap(
        (domain) => [...domain.topics],
      ) ?? [];
    expect(topics.length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(TECH_FULLSTACK_SKILL_PASS_THRESHOLDS).sort()).toEqual([...topics].sort());
  });

  it('returns named TECH_FULLSTACK bars', () => {
    const bars = passThresholdsFor('TECH_FULLSTACK', 'React');
    expect(bars.BEGINNER.interviewPass).toBeNull();
    expect(bars.INTERMEDIATE.assessmentPass).toBe(0.6);
  });
});
