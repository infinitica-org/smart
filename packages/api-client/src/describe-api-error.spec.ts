import { describe, expect, it } from 'vitest';
import { describeApiError, GENERIC_VALIDATION_MESSAGE, SmartApiError } from './errors.js';

function apiError(message: string, details: { path: string; message: string }[] = []) {
  return new SmartApiError({
    error: 'validation_failed',
    message,
    statusCode: 422,
    details,
  });
}

describe('describeApiError', () => {
  it('shows a specific server message as it is', () => {
    const error = apiError('Verify your corporate email before submitting.', [
      { path: 'verification.legalName', message: 'This field is required.' },
    ]);
    expect(describeApiError(error)).toBe('Verify your corporate email before submitting.');
  });

  it('replaces the generic validation message with the actual field problems', () => {
    const error = apiError(GENERIC_VALIDATION_MESSAGE, [
      { path: 'verification.registrationCountry', message: 'This field is required.' },
      { path: 'representative.phone', message: 'Enter a valid phone number.' },
    ]);
    expect(describeApiError(error)).toBe(
      'Registration country: This field is required. Phone: Enter a valid phone number.',
    );
    expect(describeApiError(error)).not.toContain(GENERIC_VALIDATION_MESSAGE);
  });

  it('turns camelCase and snake_case field paths into readable labels', () => {
    const error = apiError(GENERIC_VALIDATION_MESSAGE, [
      { path: 'profile.address.postalCode', message: 'Too long.' },
      { path: 'tax_id', message: 'Required.' },
    ]);
    expect(describeApiError(error)).toBe('Postal code: Too long. Tax id: Required.');
  });

  it('skips array indexes and shows just the message when there is no field name', () => {
    const error = apiError(GENERIC_VALIDATION_MESSAGE, [
      { path: 'requiredSkills.0.skillCode', message: 'Unknown taxonomy skill code' },
      { path: '', message: 'Body is invalid.' },
    ]);
    expect(describeApiError(error)).toBe(
      'Skill code: Unknown taxonomy skill code Body is invalid.',
    );
  });

  it('lists each distinct problem once and caps the list', () => {
    const details = [
      ...Array.from({ length: 3 }, () => ({
        path: 'phone',
        message: 'Enter a valid phone number.',
      })),
      ...['a', 'b', 'c', 'd', 'e'].map((field) => ({ path: field, message: 'Required.' })),
    ];
    const text = describeApiError(apiError(GENERIC_VALIDATION_MESSAGE, details));
    expect(text.match(/Phone: Enter a valid phone number\./g)).toHaveLength(1);
    expect(text).toContain('(+');
  });

  it('falls back to the error message when there are no details', () => {
    expect(describeApiError(apiError(GENERIC_VALIDATION_MESSAGE))).toBe(GENERIC_VALIDATION_MESSAGE);
  });

  it('handles plain errors, unknown values and empty messages', () => {
    expect(describeApiError(new Error('network down'))).toBe('network down');
    expect(describeApiError('boom', 'Could not save.')).toBe('Could not save.');
    expect(describeApiError(undefined)).toBe('Something went wrong. Please try again.');
    expect(describeApiError(new Error(''), 'Could not save.')).toBe('Could not save.');
  });
});
