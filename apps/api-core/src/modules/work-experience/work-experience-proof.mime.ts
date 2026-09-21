const WE_PROOF_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

/** Browsers on Windows often send `application/octet-stream` — infer from the file name. */
export function normalizeWorkExperienceProofMimeType(fileName: string, mimeType: string): string {
  const trimmed = mimeType?.trim() ?? '';
  if (trimmed === 'image/jpg') return 'image/jpeg';
  if (WE_PROOF_MIME_TYPES.has(trimmed)) return trimmed;

  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return trimmed;
}

export function isAllowedWorkExperienceProofMimeType(mimeType: string): boolean {
  return WE_PROOF_MIME_TYPES.has(mimeType);
}
