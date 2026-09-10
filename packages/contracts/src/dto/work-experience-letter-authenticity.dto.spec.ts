import { describe, expect, it } from 'vitest';
import {
  AdminWorkExperienceReviewRequestSchema,
  toWorkExperienceDocumentPublicDto,
  WorkExperienceDocumentPublicSchema,
} from './work-experience-letter-authenticity.dto.js';

describe('work-experience-letter-authenticity.dto', () => {
  it('requires an 8+ character admin review reason', () => {
    expect(AdminWorkExperienceReviewRequestSchema.safeParse({ reason: 'short' }).success).toBe(
      false,
    );
    expect(
      AdminWorkExperienceReviewRequestSchema.safeParse({
        reason: 'Manual review confirmed letter authenticity.',
      }).success,
    ).toBe(true);
  });

  it('strips fileUrl from public document DTOs', () => {
    const publicDoc = toWorkExperienceDocumentPublicDto({
      id: '11111111-1111-4111-8111-111111111111',
      experienceId: '22222222-2222-4222-8222-222222222222',
      documentType: 'EXPERIENCE_LETTER',
      fileUrl: 'storage/private/letter.pdf',
      fileName: 'letter.pdf',
      fileSizeBytes: 100,
      mimeType: 'application/pdf',
      authenticityStatus: 'doc_flagged',
      createdAt: '2026-09-10T10:00:00.000Z',
    });

    expect(WorkExperienceDocumentPublicSchema.safeParse(publicDoc).success).toBe(true);
    expect(publicDoc).not.toHaveProperty('fileUrl');
  });
});
