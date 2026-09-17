import { describe, expect, it } from 'vitest';

import { primaryInstitutionName } from './profile-identity';

describe('primaryInstitutionName', () => {
  it('prefers the current education entry', () => {
    const name = primaryInstitutionName(
      [
        { institutionName: 'Old College', current: false } as never,
        { institutionName: 'RV College of Engineering', current: true } as never,
      ],
      undefined,
    );
    expect(name).toBe('RV College of Engineering');
  });

  it('falls back to first education then account institution', () => {
    expect(
      primaryInstitutionName([{ institutionName: 'MIT', current: false } as never], undefined),
    ).toBe('MIT');
    expect(primaryInstitutionName([], { institutionName: 'Stanford University' } as never)).toBe(
      'Stanford University',
    );
  });

  it('returns null when no institution data exists', () => {
    expect(primaryInstitutionName([], undefined)).toBeNull();
  });
});
