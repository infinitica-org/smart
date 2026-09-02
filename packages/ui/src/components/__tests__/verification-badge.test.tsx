import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VerificationBadge } from '../verification-badge';

describe('VerificationBadge', () => {
  it('renders VERIFIED state correctly', () => {
    render(<VerificationBadge status="VERIFIED" />);
    const badge = screen.getByRole('status');
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('Verified');
    expect(badge.getAttribute('aria-label')).toBe('Verification status: Verified');
    // Check it contains solid type class
    expect(badge.className).toContain('bg-success');
  });

  it('renders IN_PROGRESS / DECLARED state correctly', () => {
    // Test IN_PROGRESS status
    const { rerender } = render(<VerificationBadge status="IN_PROGRESS" />);
    let badge = screen.getByRole('status');
    expect(badge.textContent).toBe('In Progress');
    expect(badge.className).toContain('bg-info');

    // Test DECLARED alias status
    rerender(<VerificationBadge status="DECLARED" />);
    badge = screen.getByRole('status');
    expect(badge.textContent).toBe('Declared');
    expect(badge.className).toContain('bg-info');
  });

  it('renders IN_VERIFICATION state correctly', () => {
    render(<VerificationBadge status="IN_VERIFICATION" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toBe('In verification');
    expect(badge.className).toContain('bg-warning');
  });

  it('renders PENDING_REVIEW state correctly', () => {
    render(<VerificationBadge status="PENDING_REVIEW" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toBe('Pending Review');
    expect(badge.className).toContain('bg-warning');
  });

  it('renders LOCKED state correctly', () => {
    render(<VerificationBadge status="LOCKED" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toBe('Locked');
    expect(badge.className).toContain('bg-danger');
  });

  it('renders EXPIRING state correctly', () => {
    render(<VerificationBadge status="EXPIRING" variant="outline" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toBe('Expiring Soon');
    expect(badge.className).toContain('text-warning');
    expect(badge.className).toContain('border-warning');
  });

  it('falls back gracefully to default for unknown states', () => {
    render(<VerificationBadge status="UNKNOWN_STATE" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toBe('UNKNOWN_STATE');
  });
});
