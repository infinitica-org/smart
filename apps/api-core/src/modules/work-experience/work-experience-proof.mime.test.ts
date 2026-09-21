import { describe, expect, it } from 'vitest';

import {
  isAllowedWorkExperienceProofMimeType,
  normalizeWorkExperienceProofMimeType,
} from './work-experience-proof.mime.js';

describe('normalizeWorkExperienceProofMimeType', () => {
  it('infers pdf from extension when mime is octet-stream', () => {
    expect(normalizeWorkExperienceProofMimeType('offer.pdf', 'application/octet-stream')).toBe(
      'application/pdf',
    );
  });

  it('maps image/jpg to image/jpeg', () => {
    expect(normalizeWorkExperienceProofMimeType('scan.jpg', 'image/jpg')).toBe('image/jpeg');
  });
});

describe('isAllowedWorkExperienceProofMimeType', () => {
  it('accepts normalized jpeg', () => {
    expect(isAllowedWorkExperienceProofMimeType('image/jpeg')).toBe(true);
  });
});
