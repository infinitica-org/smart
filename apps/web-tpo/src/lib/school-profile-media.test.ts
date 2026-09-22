import { describe, expect, it } from 'vitest';
import { SCHOOL_LOGO_MAX_BYTES, validateSchoolImageFile } from './school-profile-media';

describe('validateSchoolImageFile', () => {
  it('rejects unsupported types', () => {
    const file = new File(['x'], 'logo.gif', { type: 'image/gif' });
    expect(validateSchoolImageFile(file, SCHOOL_LOGO_MAX_BYTES)).toMatch(/JPEG, PNG, and WebP/i);
  });

  it('rejects oversized files', () => {
    const file = new File([new Uint8Array(SCHOOL_LOGO_MAX_BYTES + 1)], 'logo.png', {
      type: 'image/png',
    });
    expect(validateSchoolImageFile(file, SCHOOL_LOGO_MAX_BYTES)).toMatch(/2MB or smaller/i);
  });

  it('accepts jpeg under the limit', () => {
    const file = new File(['ok'], 'logo.jpg', { type: 'image/jpeg' });
    expect(validateSchoolImageFile(file, SCHOOL_LOGO_MAX_BYTES)).toBeNull();
  });
});
