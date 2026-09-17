import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PROFILE_SECTION,
  isProfileSectionId,
  profileSectionHref,
  profileSectionMeta,
  resolveProfileSection,
} from './profile-sections';

describe('profile-sections', () => {
  it('defaults to experience and validates section ids', () => {
    expect(DEFAULT_PROFILE_SECTION).toBe('education');
    expect(isProfileSectionId('experience')).toBe(true);
    expect(isProfileSectionId('about')).toBe(false);
    expect(isProfileSectionId('overview')).toBe(false);
    expect(resolveProfileSection('about')).toBe('education');
    expect(resolveProfileSection('preferences')).toBe('resume');
    expect(resolveProfileSection('skills')).toBe('skills');
    expect(profileSectionMeta('skills').title).toBe('Skills');
  });

  it('builds stable profile URLs', () => {
    expect(profileSectionHref('education')).toBe('/profile?section=education');
  });

  it('returns metadata for each subsection', () => {
    expect(profileSectionMeta('education').title).toBe('Education');
  });
});
