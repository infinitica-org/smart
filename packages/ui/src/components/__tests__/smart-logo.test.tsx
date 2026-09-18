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
    expect(diamond?.getAttribute('fill')).toBe('#14b8a6');
  });

  it('renders a black mark on light backgrounds when tone is on-light', () => {
    const { container } = render(<SmartLogo kind="mark" tone="on-light" />);
    const diamond = container.querySelector('path');
    expect(diamond?.getAttribute('fill')).toBe('#131313');
  });

  it('renders a monochrome black wordmark on light backgrounds when tone is on-light', () => {
    const { container } = render(<SmartLogo tone="on-light" />);
    const group = container.querySelector('g');
    const mark = container.querySelector('path[d*="120.42"]');
    expect(group?.getAttribute('fill')).toBe('#131313');
    expect(mark?.getAttribute('fill')).toBe('#131313');
  });
});
