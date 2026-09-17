import { describe, expect, it } from 'vitest';
import type { WorkExperienceDocumentDto } from '@smart/contracts';
import { summarizeWorkExperienceDocumentCheck } from './work-experience-document-check';

function doc(
  overrides: Partial<WorkExperienceDocumentDto> & Pick<WorkExperienceDocumentDto, 'documentType'>,
): WorkExperienceDocumentDto {
  return {
    id: 'doc-1',
    experienceId: 'exp-1',
    fileUrl: 'storage/proof.pdf',
    fileName: 'proof.pdf',
    fileSizeBytes: 100,
    mimeType: 'application/pdf',
    authenticityStatus: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('summarizeWorkExperienceDocumentCheck', () => {
  it('shows complete when only an offer letter is attached', () => {
    const summary = summarizeWorkExperienceDocumentCheck({
      documents: [doc({ documentType: 'OFFER_LETTER' })],
      validationResults: {},
    });
    expect(summary.text).toBe('Supporting docs on file');
    expect(summary.tag).toBe('Complete');
  });

  it('prompts validate proof for pending employment letters', () => {
    const summary = summarizeWorkExperienceDocumentCheck({
      documents: [
        doc({ id: 'offer', documentType: 'OFFER_LETTER' }),
        doc({ id: 'rel', documentType: 'RELIEVING_LETTER', authenticityStatus: 'pending' }),
      ],
      validationResults: {},
    });
    expect(summary.text).toContain('Validate Proof');
    expect(summary.tag).toBe('Action needed');
  });

  it('shows validated when authenticity is doc_ok', () => {
    const summary = summarizeWorkExperienceDocumentCheck({
      documents: [doc({ documentType: 'EXPERIENCE_LETTER', authenticityStatus: 'doc_ok' })],
      validationResults: {},
    });
    expect(summary.text).toBe('Validated (AI Check)');
    expect(summary.tag).toBe('Complete');
  });
});
