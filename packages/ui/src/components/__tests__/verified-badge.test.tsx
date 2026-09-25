import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerifiedBadge, verifiedTooltip } from '../verified-badge';

describe('VerifiedBadge (Th6-354)', () => {
  it('renders nothing for an unverified company', () => {
    const { container } = render(
      <VerifiedBadge verified={false} verifiedAt="2026-09-01T00:00:00Z" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the server verification date in the tooltip', () => {
    render(<VerifiedBadge verified verifiedAt="2026-09-01T10:00:00Z" />);
    expect(screen.getByTestId('verified-badge').getAttribute('aria-label')).toBe(
      'SMART verified this company on 1 Sep 2026',
    );
    expect(screen.getByRole('tooltip', { hidden: true }).textContent).toContain('1 Sep 2026');
  });

  it('falls back to a dateless tooltip when the date is unknown', () => {
    expect(verifiedTooltip(null)).toBe('SMART verified this company');
    expect(verifiedTooltip('not-a-date')).toBe('SMART verified this company');
  });

  it('supports an icon-only variant that stays accessible', () => {
    render(<VerifiedBadge verified variant="icon" />);
    expect(screen.getByText('Verified').className).toContain('sr-only');
  });
});
