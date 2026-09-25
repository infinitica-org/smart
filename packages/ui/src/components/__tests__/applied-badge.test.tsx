import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppliedBadge } from '../applied-badge';

describe('AppliedBadge', () => {
  it('shows for a job the student applied to', () => {
    render(<AppliedBadge applied />);
    expect(screen.getByTestId('applied-badge').textContent).toContain('Applied');
  });

  it('renders nothing otherwise', () => {
    const { container } = render(<AppliedBadge applied={false} />);
    expect(container.firstChild).toBeNull();
  });
});
