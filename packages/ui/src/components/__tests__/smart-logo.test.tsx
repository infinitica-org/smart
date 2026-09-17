import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SmartLogo } from '../smart-logo';

describe('SmartLogo', () => {
  it('renders the SMART wordmark', () => {
    render(<SmartLogo />);
    expect(screen.getAllByRole('img', { name: 'SMART' }).length).toBeGreaterThan(0);
  });

  it('renders the compact mark', () => {
    render(<SmartLogo kind="mark" title="SMART mark" />);
    expect(screen.getByRole('img', { name: 'SMART mark' })).toBeDefined();
  });

  it('uses the coloured teal mark so it stays visible on light and dark chrome', () => {
    const { container } = render(<SmartLogo kind="mark" />);
    const diamond = container.querySelector('path');
    expect(diamond?.getAttribute('fill')).toBe('#00fad0');
  });

  it('renders a black mark on light backgrounds when tone is on-light', () => {
    const { container } = render(<SmartLogo kind="mark" tone="on-light" />);
    const diamond = container.querySelector('path');
    expect(diamond?.getAttribute('fill')).toBe('#131313');
  });
});
