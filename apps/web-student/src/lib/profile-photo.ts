export const PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function mimeTypeForProfilePhoto(file: File): string {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return file.type;
}

/** Bust browser cache when the same signed URL is reused after replace. */
export function profilePhotoDisplayUrl(url: string, cacheKey: number | string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(String(cacheKey))}`;
}

export function validateProfilePhotoFile(file: File): string | null {
  const mimeType = mimeTypeForProfilePhoto(file);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return 'Only JPEG, PNG, and WebP images are supported.';
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return 'The profile photo must be 2MB or smaller.';
  }
  return null;
}
