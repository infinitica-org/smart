import { describe, expect, it } from 'vitest';
import {
  PROFILE_PHOTO_MAX_BYTES,
  profilePhotoDisplayUrl,
  validateProfilePhotoFile,
} from './profile-photo';

function file(type: string, sizeBytes: number, name = 'photo.png'): File {
  return { type, size: sizeBytes, name } as File;
}

describe('validateProfilePhotoFile', () => {
  it('accepts supported image types within the size limit', () => {
    expect(validateProfilePhotoFile(file('image/png', PROFILE_PHOTO_MAX_BYTES))).toBeNull();
  });

  it('rejects unsupported mime types', () => {
    expect(validateProfilePhotoFile(file('image/gif', 1024, 'animation.gif'))).toMatch(
      /JPEG, PNG, and WebP/i,
    );
  });

  it('rejects files larger than 2MB', () => {
    expect(validateProfilePhotoFile(file('image/jpeg', PROFILE_PHOTO_MAX_BYTES + 1))).toMatch(
      /2MB/i,
    );
  });

  it('accepts common extensions when the browser omits mime type', () => {
    expect(validateProfilePhotoFile(file('', 1024, 'avatar.jpg'))).toBeNull();
  });
});

describe('profilePhotoDisplayUrl', () => {
  it('appends a cache-busting query parameter', () => {
    expect(profilePhotoDisplayUrl('https://cdn.example/photo.jpg', 123)).toBe(
      'https://cdn.example/photo.jpg?v=123',
    );
  });
});
