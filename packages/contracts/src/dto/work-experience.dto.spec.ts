import { describe, expect, it } from 'vitest';
import {
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
