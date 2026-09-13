export const PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateProfilePhotoFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Only JPEG, PNG, and WebP images are supported.';
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return 'The profile photo must be 2MB or smaller.';
  }
  return null;
}
