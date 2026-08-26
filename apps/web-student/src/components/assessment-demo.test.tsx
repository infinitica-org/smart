import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConfidenceNote } from '@smart/ui';
import type { ConfidenceNoteDto } from '@smart/contracts';

const mockNote: ConfidenceNoteDto = {
  trackCode: 'MBA_FINANCE',
  levelNumber: 1,
  calibrationStatus: 'NOT_CALIBRATED',
  sampleSize: 50,
  reliabilityCoefficient: 0.85,
  panelistCount: 3,
  calibrationEmployers: ['Google'],
  noteText: 'Valid test note.',
  downgraded: false,
  downgradeReason: null,
  placementCyclesObserved: 1,
  generatedAt: new Date().toISOString(),
};

describe('ConfidenceNote Component', () => {
  it('renders successfully with a positive note', () => {
    render(<ConfidenceNote note={mockNote} />);
    expect(screen.getByText('Confidence Note')).toBeDefined();
    expect(screen.getByText('Valid test note.')).toBeDefined();
  });

  it('renders correctly when downgraded', () => {
    const downgradedNote = {
      ...mockNote,
      downgraded: true,
      noteText: 'Caution required.',
      downgradeReason: 'Low sample size.',
    };
    render(<ConfidenceNote note={downgradedNote} />);

    expect(screen.getByText('Confidence Note Downgraded')).toBeDefined();
    expect(screen.getByText('Reason: Low sample size.')).toBeDefined();
  });
});
