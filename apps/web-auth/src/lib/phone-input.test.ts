import { describe, expect, it } from 'vitest';
import { isValidPhone, sanitizePhoneInput } from './phone-input';

describe('sanitizePhoneInput', () => {
  it('keeps digits and drops letters, spaces, dashes and brackets', () => {
    expect(sanitizePhoneInput('98765-43210')).toBe('9876543210');
    expect(sanitizePhoneInput('(987) 654 3210')).toBe('9876543210');
    expect(sanitizePhoneInput('call 9876543210 now')).toBe('9876543210');
  });

  it('keeps one leading plus and removes any others', () => {
    expect(sanitizePhoneInput('+91 98765 43210')).toBe('+919876543210');
    expect(sanitizePhoneInput('++9198')).toBe('+9198');
    expect(sanitizePhoneInput('91+98')).toBe('9198');
  });

  it('keeps leading zeros, which a number input would lose', () => {
    expect(sanitizePhoneInput('0044123456789')).toBe('0044123456789');
  });

  it('limits the length to 15 digits', () => {
    expect(sanitizePhoneInput('1'.repeat(30))).toHaveLength(15);
    expect(sanitizePhoneInput(`+${'1'.repeat(30)}`)).toHaveLength(16);
  });

  it('turns empty or non-numeric input into an empty string', () => {
    expect(sanitizePhoneInput('')).toBe('');
    expect(sanitizePhoneInput('abc')).toBe('');
  });
});

describe('isValidPhone', () => {
  it('accepts 8 to 15 digits with an optional leading plus', () => {
    for (const phone of ['12345678', '+919876543210', '123456789012345']) {
      expect(isValidPhone(phone)).toBe(true);
    }
  });

  it('rejects too short, too long and malformed numbers', () => {
    for (const phone of ['', '1234567', '1234567890123456', '+', '12 34', 'abcdefgh']) {
      expect(isValidPhone(phone)).toBe(false);
    }
  });
});
