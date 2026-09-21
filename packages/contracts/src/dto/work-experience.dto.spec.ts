import { describe, expect, it } from 'vitest';
import {
  companyRequiresPublicIdentity,
  validateCompanyPublicIdentity,
  validateWorkExperienceEffectiveUpdate,
  validateWorkExperienceLetterRules,
  validateWorkExperienceMandatoryFields,
  validateWorkExperienceSubmission,
  CreateWorkExperienceSchema,
} from './work-experience.dto.js';

const OFFER_DOCUMENT = {
  documentType: 'OFFER_LETTER' as const,
  fileUrl: 'storage/proofs/offer.pdf',
  fileName: 'offer.pdf',
  fileSizeBytes: 1024,
  mimeType: 'application/pdf',
};

const RELIEVING_DOCUMENT = {
  documentType: 'RELIEVING_LETTER' as const,
  fileUrl: 'storage/proofs/relieving.pdf',
  fileName: 'relieving.pdf',
  fileSizeBytes: 1024,
  mimeType: 'application/pdf',
};

function buildValidOngoingSubmission(overrides: Record<string, unknown> = {}) {
  return {
    companyName: 'Acme Corp',
    role: 'Software Engineer',
    employmentType: 'FULL_TIME',
    startDate: '2022-01-01T00:00:00.000Z',
    isCurrent: true,
    domain: 'Software Engineering',
    responsibilities: 'Built backend services and APIs.',
    skillsClaimed: ['VERSION_CONTROL_CODE_COLLABORATION'],
    documents: [OFFER_DOCUMENT],
    ...overrides,
  };
}

function buildValidEndedSubmission(overrides: Record<string, unknown> = {}) {
  return buildValidOngoingSubmission({
    isCurrent: false,
    endDate: '2023-01-01T00:00:00.000Z',
    documents: [OFFER_DOCUMENT, RELIEVING_DOCUMENT],
    ...overrides,
  });
}

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

  it('CreateWorkExperienceSchema allows draft create without proof documents', () => {
    const result = CreateWorkExperienceSchema.safeParse({
      ...buildValidOngoingSubmission(),
      documents: [],
    });
    expect(result.success).toBe(true);
  });

  it('validates CreateWorkExperienceSchema requires end date when not current', () => {
    const invalidResult = CreateWorkExperienceSchema.safeParse(
      buildValidOngoingSubmission({
        isCurrent: false,
        endDate: undefined,
        documents: [OFFER_DOCUMENT],
      }),
    );
    expect(invalidResult.success).toBe(false);

    const validResult = CreateWorkExperienceSchema.safeParse(buildValidEndedSubmission());
    expect(validResult.success).toBe(true);
  });
});

describe('S6-VB-01 mandatory Work Experience fields', () => {
  it('accepts a valid complete ongoing submission', () => {
    const submission = validateWorkExperienceSubmission(buildValidOngoingSubmission());
    expect(submission.valid).toBe(true);
    expect(submission.issues).toHaveLength(0);

    const parsed = CreateWorkExperienceSchema.safeParse(buildValidOngoingSubmission());
    expect(parsed.success).toBe(true);
  });

  it('rejects missing companyName', () => {
    const result = validateWorkExperienceSubmission(
      buildValidOngoingSubmission({ companyName: '' }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'companyName')).toBe(true);
  });

  it('rejects missing role', () => {
    const result = validateWorkExperienceSubmission(buildValidOngoingSubmission({ role: '' }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'role')).toBe(true);
  });

  it('rejects missing employmentType', () => {
    const result = validateWorkExperienceSubmission(
      buildValidOngoingSubmission({ employmentType: 'NOT_A_TYPE' }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'employmentType')).toBe(true);
  });

  it('rejects missing startDate', () => {
    const result = validateWorkExperienceSubmission(buildValidOngoingSubmission({ startDate: '' }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'startDate')).toBe(true);
  });

  it('rejects missing domain', () => {
    const mandatory = validateWorkExperienceMandatoryFields({
      domain: '',
      responsibilities: 'Built APIs.',
      skillsClaimed: ['VERSION_CONTROL_CODE_COLLABORATION'],
    });
    expect(mandatory.valid).toBe(false);
    expect(mandatory.issues.some((issue) => issue.field === 'domain')).toBe(true);

    const submission = validateWorkExperienceSubmission(
      buildValidOngoingSubmission({ domain: '' }),
    );
    expect(submission.valid).toBe(false);
    expect(submission.issues.some((issue) => issue.path === 'domain')).toBe(true);
  });

  it('rejects missing responsibilities', () => {
    const mandatory = validateWorkExperienceMandatoryFields({
      domain: 'Software Engineering',
      responsibilities: '',
      skillsClaimed: ['VERSION_CONTROL_CODE_COLLABORATION'],
    });
    expect(mandatory.valid).toBe(false);
    expect(mandatory.issues.some((issue) => issue.field === 'responsibilities')).toBe(true);
  });

  it('rejects empty skillsClaimed', () => {
    const mandatory = validateWorkExperienceMandatoryFields({
      domain: 'Software Engineering',
      responsibilities: 'Built APIs.',
      skillsClaimed: [],
    });
    expect(mandatory.valid).toBe(false);
    expect(mandatory.issues.some((issue) => issue.field === 'skillsClaimed')).toBe(true);

    const submission = validateWorkExperienceSubmission(
      buildValidOngoingSubmission({ skillsClaimed: [] }),
    );
    expect(submission.valid).toBe(false);
    expect(submission.issues.some((issue) => issue.path === 'skillsClaimed')).toBe(true);
  });

  it('rejects ended roles without endDate via conditional validation', () => {
    const result = validateWorkExperienceSubmission(
      buildValidOngoingSubmission({
        isCurrent: false,
        endDate: null,
        documents: [OFFER_DOCUMENT, RELIEVING_DOCUMENT],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'endDate')).toBe(true);
  });

  it('rejects submissions missing required proof documents', () => {
    const result = validateWorkExperienceSubmission(buildValidOngoingSubmission({ documents: [] }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'documents')).toBe(true);
  });

  it('validates effective merged updates instead of partial patches alone', () => {
    const existing = buildValidOngoingSubmission();
    const result = validateWorkExperienceEffectiveUpdate(existing, {
      responsibilities: '',
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'responsibilities')).toBe(true);
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
    const result = CreateWorkExperienceSchema.safeParse(
      buildValidOngoingSubmission({
        companyWebsite: 'https://acme.com',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('CreateWorkExperienceSchema accepts public identity when both fields are present', () => {
    const result = CreateWorkExperienceSchema.safeParse(
      buildValidOngoingSubmission({
        companyWebsite: 'https://acme.com',
        companyLinkedinUrl: 'https://linkedin.com/company/acme',
      }),
    );
    expect(result.success).toBe(true);
  });

  it('CreateWorkExperienceSchema rejects invalid website URL when identity is required', () => {
    const result = CreateWorkExperienceSchema.safeParse(
      buildValidOngoingSubmission({
        companyWebsite: 'not-a-url',
        companyLinkedinUrl: 'https://linkedin.com/company/acme',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('validateWorkExperienceSubmission enforces company public identity when catalog data exists', () => {
    const result = validateWorkExperienceSubmission({
      ...buildValidOngoingSubmission(),
      companyWebsite: null,
      companyLinkedinUrl: null,
      catalogCompanyWebsite: 'https://acme.com',
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'companyWebsite')).toBe(true);
  });
});
