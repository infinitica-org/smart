import { describe, expect, it } from 'vitest';
import {
  programLevelForDegree,
  programScoreUiConfig,
  resolveProgramDegree,
} from './education-form-program';

describe('programScoreUiConfig', () => {
  it('maps 10th program to SSC percentage score only', () => {
    const config = programScoreUiConfig('10th Standard');
    expect(config.level).toBe('ssc');
    expect(config.allowUnitChoice).toBe(false);
    expect(config.showBacklogCheckbox).toBe(false);
  });

  it('maps 12th program to HSC percentage score only', () => {
    const config = programScoreUiConfig('12th Standard');
    expect(config.level).toBe('hsc');
    expect(config.allowUnitChoice).toBe(false);
  });

  it('maps degree programs to CGPA or percentage with backlog', () => {
    const config = programScoreUiConfig('B.Tech');
    expect(config.level).toBe('degree');
    expect(config.allowUnitChoice).toBe(true);
    expect(config.showBacklogCheckbox).toBe(true);
  });
});

describe('resolveProgramDegree', () => {
  it('returns custom program text when other is selected', () => {
    expect(resolveProgramDegree('__custom__', 'Integrated M.Sc')).toBe('Integrated M.Sc');
  });
});

describe('programLevelForDegree', () => {
  it('classifies postgraduate programs as degree level', () => {
    expect(programLevelForDegree('MBA')).toBe('degree');
    expect(programLevelForDegree('M.Tech')).toBe('degree');
  });
});
