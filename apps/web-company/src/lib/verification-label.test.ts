import { describe, expect, it } from 'vitest';
import { verificationStatusLabel } from './verification-label';

describe('verificationStatusLabel', () => {
  it('maps verification statuses for display', () => {
    expect(verificationStatusLabel('APPROVED')).toBe('Approved');
    expect(verificationStatusLabel('PENDING')).toBe('Pending review');
    expect(verificationStatusLabel('REJECTED')).toBe('Rejected');
  });
});
