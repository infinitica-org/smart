import { describe, expect, it } from 'vitest';

import {
  applyWorkExperienceSaveValidation,
  normalizeOptionalHttpUrl,
  shouldSkipWorkExperienceDocumentRules,
} from './work-experience-save-validation';

describe('normalizeOptionalHttpUrl', () => {
  it('prefixes https when scheme is omitted', () => {
    expect(normalizeOptionalHttpUrl('acme.com')).toBe('https://acme.com');
  });

  it('returns null for blank input', () => {
    expect(normalizeOptionalHttpUrl('   ')).toBeNull();
  });
});
describe('shouldSkipWorkExperienceDocumentRules', () => {
  it('skips document rules when there are no stored or pending proof files', () => {
    expect(
      shouldSkipWorkExperienceDocumentRules({ existingDocumentCount: 0, pendingUploadCount: 0 }),
    ).toBe(true);
  });

  it('requires document rules when proof is already attached or queued', () => {
    expect(
      shouldSkipWorkExperienceDocumentRules({ existingDocumentCount: 1, pendingUploadCount: 0 }),
    ).toBe(false);
    expect(
      shouldSkipWorkExperienceDocumentRules({ existingDocumentCount: 0, pendingUploadCount: 1 }),
    ).toBe(false);
  });
});

describe('applyWorkExperienceSaveValidation', () => {
  it('drops document issues when skipDocumentRules is enabled', () => {
    const filtered = applyWorkExperienceSaveValidation(
      {
        valid: false,
        issues: [
          { path: 'documents', message: 'Offer letter required.' },
          { path: 'role', message: 'Role is required.' },
        ],
      },
      { skipDocumentRules: true },
    );
    expect(filtered.valid).toBe(false);
    expect(filtered.issues).toEqual([{ path: 'role', message: 'Role is required.' }]);
  });

  it('keeps document issues when proof rules apply', () => {
    const result = applyWorkExperienceSaveValidation(
      {
        valid: false,
        issues: [{ path: 'documents', message: 'Offer letter required.' }],
      },
      { skipDocumentRules: false },
    );
    expect(result.issues).toHaveLength(1);
  });
});
