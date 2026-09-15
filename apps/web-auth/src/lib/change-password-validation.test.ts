import { describe, expect, it } from 'vitest';
import { validateChangePasswordInput } from './change-password-validation';

describe('validateChangePasswordInput', () => {
  it('accepts a valid change', () => {
    expect(
      validateChangePasswordInput({
        currentPassword: 'old-password1',
        newPassword: 'new-password2',
        confirmPassword: 'new-password2',
      }),
    ).toBeNull();
  });

  it('rejects mismatched confirmation', () => {
    expect(
      validateChangePasswordInput({
        currentPassword: 'old-password1',
        newPassword: 'new-password2',
        confirmPassword: 'other-password',
      }),
    ).toMatch(/do not match/i);
  });

  it('rejects when new password equals current', () => {
    expect(
      validateChangePasswordInput({
        currentPassword: 'same-password',
        newPassword: 'same-password',
        confirmPassword: 'same-password',
      }),
    ).toMatch(/different/i);
  });
});
