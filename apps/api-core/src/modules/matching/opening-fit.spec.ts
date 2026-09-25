import { SKILL_DEFINITIONS } from '@smart/contracts';
import { describe, expect, it } from 'vitest';
import { fitBandFor, scoreOpeningForStudent } from './opening-fit.js';

const [a, b, c] = SKILL_DEFINITIONS;
const code = (skill: typeof a) => (skill as NonNullable<typeof a>).code;
const domain = (skill: typeof a) => (skill as NonNullable<typeof a>).domain;

const opening = (skills: { code: string; min: string }[]) => ({
  domainCode: domain(a),
  minYearsExperience: null,
  maxYearsExperience: null,
  location: null,
  requiredSkills: skills.map((s) => ({ minProficiency: s.min, skill: { code: s.code } })),
});
const claim = (skill: typeof a, proficiency: string) => ({
  proficiency,
  skill: { code: code(skill), domain: domain(skill) },
});

describe('opening-level fit (Th6-379)', () => {
  it('uses the STRONG / MODERATE / STRETCH thresholds of the matching service', () => {
    expect(fitBandFor(1)).toBe('STRONG');
    expect(fitBandFor(0.99)).toBe('MODERATE');
    expect(fitBandFor(0.5)).toBe('MODERATE');
    expect(fitBandFor(0.49)).toBe('STRETCH');
  });

  it('is STRONG when every required skill is met, with a reason per met skill', () => {
    const fit = scoreOpeningForStudent('s1', opening([{ code: code(a), min: 'INTERMEDIATE' }]), [
      claim(a, 'ADVANCED'),
    ]);
    expect(fit?.band).toBe('STRONG');
    expect(fit?.matchPercent).toBeGreaterThan(0);
    expect(fit?.reasons[0]).toContain('meets the Intermediate requirement');
  });

  it('is MODERATE when half the requirement is held and lists the partial skill after met ones', () => {
    const fit = scoreOpeningForStudent(
      's1',
      opening([
        { code: code(a), min: 'INTERMEDIATE' },
        { code: code(b), min: 'ADVANCED' },
      ]),
      [claim(a, 'INTERMEDIATE'), claim(b, 'INTERMEDIATE')],
    );
    expect(fit?.band).toBe('MODERATE');
    expect(fit?.reasons[0]).toContain('meets');
    expect(fit?.reasons[1]).toContain('the role asks for Advanced');
  });

  it('is null when the job lists no skills, the student has none verified, or none overlap', () => {
    expect(scoreOpeningForStudent('s1', opening([]), [claim(a, 'ADVANCED')])).toBeNull();
    expect(
      scoreOpeningForStudent('s1', opening([{ code: code(a), min: 'BEGINNER' }]), []),
    ).toBeNull();
    expect(
      scoreOpeningForStudent('s1', opening([{ code: code(a), min: 'BEGINNER' }]), [
        claim(c, 'ADVANCED'),
      ]),
    ).toBeNull();
  });
});
