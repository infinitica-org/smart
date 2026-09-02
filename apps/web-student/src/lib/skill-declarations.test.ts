import { describe, expect, it } from 'vitest';
import { createDeclarations, seedSkillDeclarations, skillsForStream } from './skill-declarations';

describe('skill-declarations', () => {
  it('scopes taxonomy skills by stream within SOFTWARE_IT', () => {
    const universal = skillsForStream('UNIVERSAL');
    expect(universal.length).toBeGreaterThan(0);
    expect(universal.every((s) => s.domain === 'SOFTWARE_IT' && s.stream === 'UNIVERSAL')).toBe(
      true,
    );
  });

  it('declares selected skills as Declared without duplicating', () => {
    const existing = seedSkillDeclarations();
    const { created, next } = createDeclarations({
      skillCodes: ['DATABASE_FUNDAMENTALS', 'PROGRAMMING_FUNDAMENTALS_LOGIC'],
      proficiency: 'BEGINNER',
      existing,
    });

    expect(created).toHaveLength(1);
    expect(created[0]?.skillCode).toBe('DATABASE_FUNDAMENTALS');
    expect(created[0]?.verificationStatus).toBe('DECLARED');
    expect(created[0]?.proficiency).toBe('BEGINNER');
    expect(next).toHaveLength(existing.length + 1);
  });

  it('seeds Declared, Verified, In verification, and Locked with cooldown', () => {
    const seeded = seedSkillDeclarations();
    expect(seeded.some((s) => s.verificationStatus === 'DECLARED')).toBe(true);
    expect(seeded.some((s) => s.verificationStatus === 'VERIFIED')).toBe(true);
    expect(seeded.some((s) => s.verificationStatus === 'IN_VERIFICATION')).toBe(true);
    const locked = seeded.find((s) => s.verificationStatus === 'LOCKED');
    expect(locked?.lockedUntil).toBeTruthy();
  });
});
