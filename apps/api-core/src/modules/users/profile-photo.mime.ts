const PROFILE_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/** Browsers on Windows often send `application/octet-stream` — infer from the file name. */
export function normalizeProfilePhotoMimeType(fileName: string, mimeType: string): string {
  const trimmed = mimeType?.trim() ?? '';
  if (trimmed === 'image/jpg') return 'image/jpeg';
  if (PROFILE_PHOTO_MIME_TYPES.has(trimmed)) return trimmed;

  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return trimmed;
}

export function isAllowedProfilePhotoMimeType(mimeType: string): boolean {
  return PROFILE_PHOTO_MIME_TYPES.has(mimeType);
}
