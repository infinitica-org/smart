import type { WorkExperienceValidationResult } from '@smart/contracts';

/** Matches onboarding URL normalization — Zod requires a valid http(s) URL. */
export function normalizeOptionalHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Mirrors api-core `skipDocumentRules` when no proof files are on the claim yet. */
export function shouldSkipWorkExperienceDocumentRules(params: {
  existingDocumentCount: number;
  pendingUploadCount: number;
}): boolean {
  return params.existingDocumentCount === 0 && params.pendingUploadCount === 0;
}

export function applyWorkExperienceSaveValidation(
  result: WorkExperienceValidationResult,
  options: { skipDocumentRules: boolean },
): WorkExperienceValidationResult {
  if (!options.skipDocumentRules) {
    return result;
  }
  const issues = result.issues.filter((issue) => issue.path !== 'documents');
  return { valid: issues.length === 0, issues };
}
