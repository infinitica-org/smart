import { describe, expect, it } from 'vitest';
import {
  companyRequiresPublicIdentity,
  validateCompanyPublicIdentity,
  validateWorkExperienceLetterRules,
  CreateWorkExperienceSchema,
} from './work-experience.dto.js';

describe('WorkExperience DTO & Letter Validation Rules (WE-T01)', () => {
  it('validates ongoing role with offer letter', () => {
    const res = validateWorkExperienceLetterRules({
      isCurrent: true,
      endDate: null,
      documents: [{ documentType: 'OFFER_LETTER' }],
    });
    expect(res.valid).toBe(true);
    expect(res.hasOfferLetter).toBe(true);
    expect(res.missingDocuments).toHaveLength(0);
  });

  it('rejects ongoing role without offer letter', () => {
    const res = validateWorkExperienceLetterRules({
      isCurrent: true,
      endDate: null,
      documents: [],
    });
    expect(res.valid).toBe(false);
    expect(res.hasOfferLetter).toBe(false);
    expect(res.missingDocuments).toContain('OFFER_LETTER');
    expect(res.message).toContain('offer letter');
  });

  it('validates ongoing role without completion letter', () => {
    const res = validateWorkExperienceLetterRules({
      isCurrent: true,
      endDate: null,
      documents: [{ documentType: 'OFFER_LETTER' }],
    });
    expect(res.valid).toBe(true);
    expect(res.hasCompletionLetter).toBe(false);
  });

  it('validates ended role with both offer letter and relieving letter', () => {
    const res = validateWorkExperienceLetterRules({
      isCurrent: false,
      endDate: '2023-01-01T00:00:00.000Z',
      documents: [{ documentType: 'OFFER_LETTER' }, { documentType: 'RELIEVING_LETTER' }],
    });
    expect(res.valid).toBe(true);
    expect(res.hasOfferLetter).toBe(true);
    expect(res.hasCompletionLetter).toBe(true);
    expect(res.missingDocuments).toHaveLength(0);
  });

  it('validates ended role with offer letter and experience letter', () => {
    const res = validateWorkExperienceLetterRules({
      isCurrent: false,
      endDate: '2023-01-01T00:00:00.000Z',
      documents: [{ documentType: 'OFFER_LETTER' }, { documentType: 'EXPERIENCE_LETTER' }],
    });
    expect(res.valid).toBe(true);
    expect(res.hasOfferLetter).toBe(true);
    expect(res.hasCompletionLetter).toBe(true);
  });

  it('rejects ended role without offer letter', () => {
    const res = validateWorkExperienceLetterRules({
      isCurrent: false,
      endDate: '2023-01-01T00:00:00.000Z',
      documents: [{ documentType: 'RELIEVING_LETTER' }],
    });
    expect(res.valid).toBe(false);
    expect(res.missingDocuments).toContain('OFFER_LETTER');
  });

  it('rejects ended role without completion/relieving letter', () => {
    const res = validateWorkExperienceLetterRules({
      isCurrent: false,
      endDate: '2023-01-01T00:00:00.000Z',
      documents: [{ documentType: 'OFFER_LETTER' }],
    });
    expect(res.valid).toBe(false);
    expect(res.missingDocuments).toContain('COMPLETION_LETTER');
    expect(res.message).toContain('completion or relieving letter');
  });

  it('validates CreateWorkExperienceSchema requires end date when not current', () => {
    const invalidResult = CreateWorkExperienceSchema.safeParse({
      companyName: 'Acme Corp',
      role: 'Developer',
      startDate: '2022-01-01T00:00:00.000Z',
      isCurrent: false,
    });
    expect(invalidResult.success).toBe(false);

    const validResult = CreateWorkExperienceSchema.safeParse({
      companyName: 'Acme Corp',
      role: 'Developer',
      startDate: '2022-01-01T00:00:00.000Z',
      endDate: '2023-01-01T00:00:00.000Z',
      isCurrent: false,
    });
    expect(validResult.success).toBe(true);
  });
});

describe('S6-VB-01 company public identity (AC1)', () => {
  it('does not require identity when company has no public presence signals', () => {
    expect(
      companyRequiresPublicIdentity({
        companyId: null,
        companyWebsite: null,
        catalogCompanyWebsite: null,
        catalogCompanyLinkedinUrl: null,
      }),
    ).toBe(false);
    expect(
      validateCompanyPublicIdentity({
        companyWebsite: null,
        companyLinkedinUrl: null,
        required: false,
      }).valid,
    ).toBe(true);
  });

  it('requires website and LinkedIn when companyId is set', () => {
    expect(
      companyRequiresPublicIdentity({ companyId: '11111111-1111-4111-8111-111111111111' }),
    ).toBe(true);
    const missingWebsite = validateCompanyPublicIdentity({
      companyWebsite: null,
      companyLinkedinUrl: 'https://linkedin.com/company/acme',
      required: true,
    });
    expect(missingWebsite.valid).toBe(false);
    expect(missingWebsite.field).toBe('companyWebsite');

    const missingLinkedin = validateCompanyPublicIdentity({
      companyWebsite: 'https://acme.com',
      companyLinkedinUrl: null,
      required: true,
    });
    expect(missingLinkedin.valid).toBe(false);
    expect(missingLinkedin.field).toBe('companyLinkedinUrl');
  });

  it('requires identity when catalog company has public profile data', () => {
    expect(
      companyRequiresPublicIdentity({
        catalogCompanyWebsite: 'https://acme.com',
      }),
    ).toBe(true);
    expect(
      validateCompanyPublicIdentity({
        companyWebsite: 'https://acme.com',
        companyLinkedinUrl: 'https://linkedin.com/company/acme',
        required: true,
      }).valid,
    ).toBe(true);
  });

  it('requires identity when student supplies company website', () => {
    expect(
      companyRequiresPublicIdentity({
        companyWebsite: 'https://acme.com',
      }),
    ).toBe(true);
  });

  it('CreateWorkExperienceSchema rejects missing LinkedIn when website is provided', () => {
    const result = CreateWorkExperienceSchema.safeParse({
      companyName: 'Acme Corp',
      role: 'Engineer',
      startDate: '2022-01-01T00:00:00.000Z',
      isCurrent: true,
      companyWebsite: 'https://acme.com',
      documents: [
        {
          documentType: 'OFFER_LETTER',
          fileUrl: 'x',
          fileName: 'a.pdf',
          fileSizeBytes: 100,
          mimeType: 'application/pdf',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('CreateWorkExperienceSchema accepts public identity when both fields are present', () => {
    const result = CreateWorkExperienceSchema.safeParse({
      companyName: 'Acme Corp',
      role: 'Engineer',
      startDate: '2022-01-01T00:00:00.000Z',
      isCurrent: true,
      companyWebsite: 'https://acme.com',
      companyLinkedinUrl: 'https://linkedin.com/company/acme',
      documents: [
        {
          documentType: 'OFFER_LETTER',
          fileUrl: 'x',
          fileName: 'a.pdf',
          fileSizeBytes: 100,
          mimeType: 'application/pdf',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('CreateWorkExperienceSchema rejects invalid website URL when identity is required', () => {
    const result = CreateWorkExperienceSchema.safeParse({
      companyName: 'Acme Corp',
      role: 'Engineer',
      startDate: '2022-01-01T00:00:00.000Z',
      isCurrent: true,
      companyWebsite: 'not-a-url',
      companyLinkedinUrl: 'https://linkedin.com/company/acme',
      documents: [
        {
          documentType: 'OFFER_LETTER',
          fileUrl: 'x',
          fileName: 'a.pdf',
          fileSizeBytes: 100,
          mimeType: 'application/pdf',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
