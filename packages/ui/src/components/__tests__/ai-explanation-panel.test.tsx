import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AiExplanationPanel } from '../ai-explanation-panel';

describe('AiExplanationPanel', () => {
  it('renders explanation narrative correctly', () => {
    render(<AiExplanationPanel explanation="This matches because track thresholds are met." />);
    expect(screen.getByText('This matches because track thresholds are met.')).toBeDefined();
    expect(screen.getByText('AI INSIGHT')).toBeDefined(); // default title
  });

  it('renders optional custom title', () => {
    render(<AiExplanationPanel explanation="Insight explanation" title="Custom Title Label" />);
    expect(screen.getByText('Custom Title Label')).toBeDefined();
  });

  it('renders optional match score when provided', () => {
    render(<AiExplanationPanel explanation="Insight explanation" score={87} />);
    expect(screen.getByText('87%')).toBeDefined();
    expect(screen.getByText('Match Score')).toBeDefined();
  });

  it('applies correct tone styling', () => {
    const { rerender } = render(
      <AiExplanationPanel explanation="Insight explanation" tone="warning" />,
    );
    let panel = screen.getByRole('region');
    expect(panel.className).toContain('border-warning');

    rerender(<AiExplanationPanel explanation="Insight explanation" tone="danger" />);
    panel = screen.getByRole('region');
    expect(panel.className).toContain('border-danger');
  });

  it('is accessible and contains semantic tags', () => {
    render(<AiExplanationPanel explanation="Insight explanation" />);
    const panel = screen.getByRole('region');
    expect(panel.getAttribute('aria-label')).toBe('AI Explanation Panel');
  });
});
