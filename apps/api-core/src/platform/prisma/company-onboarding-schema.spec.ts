import { describe, expect, it } from 'vitest';
import {
  COMPANY_ONBOARDING_STATUSES,
  COMPANY_VERIFICATION_DOCUMENT_REVIEW_STATUSES,
  COMPANY_VERIFICATION_DOCUMENT_TYPES,
  USER_ROLES,
} from '@smart/contracts';
import {
  CompanyOnboardingStatus,
  CompanyVerificationDocumentReviewStatus,
  CompanyVerificationDocumentType,
  UserRole,
} from '../../generated/prisma/index.js';

/**
 * Guards Prisma enum parity with @smart/contracts (Phase 1 / Phase 2 boundary).
 */
describe('company onboarding Prisma enums vs contracts', () => {
  it('CompanyOnboardingStatus matches COMPANY_ONBOARDING_STATUSES', () => {
    expect(Object.values(CompanyOnboardingStatus).sort()).toEqual(
      [...COMPANY_ONBOARDING_STATUSES].sort(),
    );
  });

  it('CompanyVerificationDocumentType matches COMPANY_VERIFICATION_DOCUMENT_TYPES', () => {
    expect(Object.values(CompanyVerificationDocumentType).sort()).toEqual(
      [...COMPANY_VERIFICATION_DOCUMENT_TYPES].sort(),
    );
  });

  it('CompanyVerificationDocumentReviewStatus matches contract review statuses', () => {
    expect(Object.values(CompanyVerificationDocumentReviewStatus).sort()).toEqual(
      [...COMPANY_VERIFICATION_DOCUMENT_REVIEW_STATUSES].sort(),
    );
  });

  it('Prisma UserRole includes contract USER_ROLES except PUBLIC', () => {
    const contractDbRoles = USER_ROLES.filter((r) => r !== 'PUBLIC').sort();
    expect(Object.values(UserRole).sort()).toEqual(contractDbRoles);
  });
});
