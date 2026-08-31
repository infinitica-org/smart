import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PipelineStageBar, type PipelineStage } from '../pipeline-stage-bar';

const mockStages: PipelineStage[] = [
  { id: '1', label: 'Matches', status: 'complete' },
  { id: '2', label: 'Shortlist', status: 'active' },
  { id: '3', label: 'Interview', status: 'upcoming' },
  { id: '4', label: 'Offer', status: 'failed' },
];

describe('PipelineStageBar', () => {
  it('renders all stage labels correctly', () => {
    render(<PipelineStageBar stages={mockStages} />);
    expect(screen.getByText('Matches')).toBeDefined();
    expect(screen.getByText('Shortlist')).toBeDefined();
    expect(screen.getByText('Interview')).toBeDefined();
    expect(screen.getByText('Offer')).toBeDefined();
  });

  it('renders complete/active/upcoming/failed indicator states correctly', () => {
    render(<PipelineStageBar stages={mockStages} />);
    const activeLabel = screen.getByText('Shortlist');
    expect(activeLabel.className).toContain('text-[var(--accent)]');

    const completeLabel = screen.getByText('Matches');
    expect(completeLabel.className).toContain('text-success');

    const upcomingLabel = screen.getByText('Interview');
    expect(upcomingLabel.className).toContain('text-[var(--text-muted)]');

    const failedLabel = screen.getByText('Offer');
    expect(failedLabel.className).toContain('text-danger');
  });

  it('renders non-interactive stage wrappers by default', () => {
    render(<PipelineStageBar stages={mockStages} interactive={false} />);
    // There should be no buttons rendered
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  it('renders button elements when interactive=true', () => {
    const handleStageSelect = vi.fn();
    render(
      <PipelineStageBar stages={mockStages} interactive={true} onStageSelect={handleStageSelect} />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);

    const firstButton = buttons[0];
    if (!firstButton) {
      throw new Error('No buttons found');
    }
    fireEvent.click(firstButton);
    expect(handleStageSelect).toHaveBeenCalledWith('1');
  });
});
