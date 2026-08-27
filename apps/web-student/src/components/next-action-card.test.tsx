import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NextActionCard } from './next-action-card';

describe('NextActionCard', () => {
  it('shows Welcome state when not enrolled', () => {
    render(<NextActionCard enrolled={false} completedLevels={0} />);
    expect(screen.getByText('Welcome to SMART')).toBeDefined();
    expect(screen.getByText('Complete enrollment')).toBeDefined();
  });

  it('shows Start Level 1 when newly enrolled', () => {
    render(<NextActionCard enrolled={true} completedLevels={0} />);
    expect(screen.getByText('Next Action')).toBeDefined();
    expect(screen.getByText('Start Level 1')).toBeDefined();
  });

  it('shows Start Level 2 when Level 1 is completed', () => {
    render(<NextActionCard enrolled={true} completedLevels={1} />);
    expect(screen.getByText('Start Level 2')).toBeDefined();
    expect(screen.getByText(/You have cleared Level 1/)).toBeDefined();
  });

  it('shows Completion state when 5 levels are completed', () => {
    render(<NextActionCard enrolled={true} completedLevels={5} />);
    expect(screen.getByText('Congratulations!')).toBeDefined();
    expect(screen.getByText('View Certificates')).toBeDefined();
  });
});
