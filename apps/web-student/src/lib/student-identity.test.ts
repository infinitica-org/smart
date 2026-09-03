import { describe, expect, it } from 'vitest';
import { givenNameFromFullName, initialsFromFullName, profileSubtitle } from './student-identity';

describe('student-identity', () => {
  it('builds initials from GET /users/me fullName', () => {
    expect(initialsFromFullName('Ada Lovelace')).toBe('AL');
    expect(initialsFromFullName('Sathe')).toBe('SA');
    expect(initialsFromFullName('')).toBe('?');
  });

  it('uses the first token as the welcome name', () => {
    expect(givenNameFromFullName('Ada Lovelace')).toBe('Ada');
  });

  it('prefers onboarding experience over invented headlines', () => {
    expect(
      profileSubtitle({
        institutionName: 'Mock College',
        primaryTrack: 'MBA_FINANCE',
        latestRole: 'Intern',
        latestCompany: 'Example Corp',
      }),
    ).toBe('Intern · Example Corp');
  });
});
