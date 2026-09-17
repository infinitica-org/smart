import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PROFILE_SECTION,
  isProfileSectionId,
  profileSectionHref,
  profileSectionMeta,
} from './profile-sections';

describe('profile-sections', () => {
  it('defaults to about and validates section ids', () => {
    expect(DEFAULT_PROFILE_SECTION).toBe('about');
    expect(isProfileSectionId('about')).toBe(true);
    expect(isProfileSectionId('overview')).toBe(false);
  });

  it('builds stable profile URLs', () => {
    expect(profileSectionHref('experience')).toBe('/profile?section=experience');
  });

  it('returns metadata for each subsection', () => {
    expect(profileSectionMeta('education').title).toBe('Education');
  });
});
