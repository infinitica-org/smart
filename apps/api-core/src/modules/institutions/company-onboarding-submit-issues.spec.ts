import { UnprocessableEntityException } from '@nestjs/common';
import {
  CompanyRepresentativeSchema,
  CompanySignupProfileSchema,
  CompanyVerificationSchema,
} from '@smart/contracts';
import { describe, expect, it } from 'vitest';
import { incompleteSubmissionError } from './company-onboarding-submit-issues.js';

const ok = { success: true } as const;

function bodyOf(error: UnprocessableEntityException) {
  return error.getResponse() as {
    error: string;
    message: string;
    statusCode: number;
    details: { path: string; message: string }[];
  };
}

describe('incompleteSubmissionError', () => {
  it('asks for verification details when none were saved, instead of a generic failure', () => {
    const error = incompleteSubmissionError({
      results: {
        representative: ok,
        profile: ok,
        verification: CompanyVerificationSchema.safeParse({}),
      },
      hasVerificationData: false,
    });

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    const body = bodyOf(error);
    expect(body.statusCode).toBe(422);
    expect(body.error).toBe('validation_failed');
    expect(body.message).toBe(
      'Add your verification details (registered address and business registration information) before submitting.',
    );
    expect(body.message).not.toMatch(/Request failed validation/);
  });

  it('lists the exact missing fields with readable messages', () => {
    const body = bodyOf(
      incompleteSubmissionError({
        results: {
          representative: ok,
          profile: ok,
          verification: CompanyVerificationSchema.safeParse({}),
        },
        hasVerificationData: false,
      }),
    );

    const paths = body.details.map((d) => d.path);
    expect(paths).toContain('verification.registrationCountry');
    expect(paths).toContain('verification.legalName');
    expect(paths).toContain('verification.registeredAddress');
    expect(body.details.find((d) => d.path === 'verification.legalName')?.message).toBe(
      'This field is required.',
    );
  });

  it('names the incomplete sections when verification data exists but others are missing', () => {
    const body = bodyOf(
      incompleteSubmissionError({
        results: {
          representative: CompanyRepresentativeSchema.safeParse({}),
          profile: CompanySignupProfileSchema.safeParse({}),
          verification: ok,
        },
        hasVerificationData: true,
      }),
    );

    expect(body.message).toBe(
      'Complete your contact details and your company profile before submitting.',
    );
    expect(body.details.some((d) => d.path.startsWith('representative.'))).toBe(true);
    expect(body.details.some((d) => d.path.startsWith('profile.'))).toBe(true);
    expect(body.details.every((d) => !d.path.startsWith('verification.'))).toBe(true);
  });

  it('keeps specific rule messages, such as the phone format', () => {
    const body = bodyOf(
      incompleteSubmissionError({
        results: {
          representative: CompanyRepresentativeSchema.safeParse({
            fullName: 'Ada Recruiter',
            workEmail: 'ada@acme.example',
            phone: 'call me',
            jobTitle: 'HR',
            relationship: 'HR',
          }),
          profile: ok,
          verification: ok,
        },
        hasVerificationData: true,
      }),
    );

    expect(body.message).toBe('Complete your contact details before submitting.');
    expect(body.details).toEqual([
      { path: 'representative.phone', message: expect.stringContaining('digits only') },
    ]);
  });
});
