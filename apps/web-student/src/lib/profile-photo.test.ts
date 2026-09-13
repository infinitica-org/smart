import { describe, expect, it } from 'vitest';
import { PROFILE_PHOTO_MAX_BYTES, validateProfilePhotoFile } from './profile-photo';

function file(type: string, sizeBytes: number): File {
  return { type, size: sizeBytes } as File;
}

describe('validateProfilePhotoFile', () => {
  it('accepts supported image types within the size limit', () => {
    expect(validateProfilePhotoFile(file('image/png', PROFILE_PHOTO_MAX_BYTES))).toBeNull();
  });

  it('rejects unsupported mime types', () => {
    expect(validateProfilePhotoFile(file('image/gif', 1024))).toMatch(/JPEG, PNG, and WebP/i);
  });

  it('rejects files larger than 2MB', () => {
    expect(validateProfilePhotoFile(file('image/jpeg', PROFILE_PHOTO_MAX_BYTES + 1))).toMatch(
      /2MB/i,
    );
  });
});
