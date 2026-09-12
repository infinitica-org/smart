const PROOF_DATA_URI_MAX_CHARS = 7_000_000;

export class InvalidStudentProofFileUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStudentProofFileUrlError';
  }
}

/**
 * Student-controlled proof references must not trigger server-side fetches to
 * arbitrary HTTP(S) URLs or absolute filesystem paths (SSRF / path traversal).
 */
export function assertStudentControlledProofFileUrl(fileUrl: string): void {
  const trimmed = fileUrl.trim();
  if (!trimmed) {
    throw new InvalidStudentProofFileUrlError('Proof document fileUrl is required.');
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    throw new InvalidStudentProofFileUrlError(
      'Remote proof document URLs are not accepted. Upload the file through the secure upload endpoint.',
    );
  }

  if (trimmed.startsWith('file://')) {
    throw new InvalidStudentProofFileUrlError('Local file URLs are not accepted.');
  }

  if (trimmed.startsWith('data:')) {
    if (trimmed.length > PROOF_DATA_URI_MAX_CHARS) {
      throw new InvalidStudentProofFileUrlError('Inline proof document payload is too large.');
    }
    return;
  }

  if (trimmed.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(trimmed)) {
    throw new InvalidStudentProofFileUrlError('Absolute filesystem paths are not accepted.');
  }

  if (trimmed.includes('..')) {
    throw new InvalidStudentProofFileUrlError('Proof document path traversal is not allowed.');
  }
}
