import { describe, expect, it } from 'vitest';
import { destinationAfterAuth, destinationAfterEnrollment } from './candidate-routing';

describe('destinationAfterAuth', () => {
  it('keeps the institution → enroll → onboarding → dashboard order', () => {
    expect(
      destinationAfterAuth({
        institutionId: null,
        primaryTrack: null,
        onboardingCompleted: false,
      }),
    ).toBe('/institution-picker');
    expect(
      destinationAfterAuth({
        institutionId: '223e4567-e89b-12d3-a456-426614174000',
        primaryTrack: null,
        onboardingCompleted: false,
      }),
    ).toBe('/enroll');
    expect(
      destinationAfterAuth({
        institutionId: '223e4567-e89b-12d3-a456-426614174000',
        primaryTrack: 'MBA_FINANCE',
        onboardingCompleted: false,
      }),
    ).toBe('/onboarding');
    expect(
      destinationAfterAuth({
        institutionId: '223e4567-e89b-12d3-a456-426614174000',
        primaryTrack: 'MBA_FINANCE',
        onboardingCompleted: true,
      }),
    ).toBe('/dashboard');
  });
});

describe('destinationAfterEnrollment', () => {
  it('sends completed students to the dashboard instead of reopening onboarding', () => {
    expect(destinationAfterEnrollment({ onboardingCompleted: true })).toBe('/dashboard');
  });

  it('sends incomplete students to onboarding', () => {
    expect(destinationAfterEnrollment({ onboardingCompleted: false })).toBe('/onboarding');
  });
});
