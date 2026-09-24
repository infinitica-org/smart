import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InstitutionStudentDto } from '@smart/contracts';
import { CandidateDetailDrawer } from './candidate-detail-drawer';

const candidate: InstitutionStudentDto = {
  userId: '11111111-1111-4111-8111-111111111111',
  email: 'ada@campus.edu',
  fullName: 'Ada Lovelace',
  batchId: null,
  batchName: 'Batch 2026',
  inviteStatus: 'ACCEPTED',
  lastSentAt: null,
  acceptedAt: null,
  heldAt: null,
  linkedinUrl: null,
  githubUrl: null,
};

vi.mock('../lib/api', () => ({
  api: {
    assessment: {
      listSkillClaims: vi.fn().mockResolvedValue([]),
    },
  },
}));

afterEach(() => {
  cleanup();
});

describe('CandidateDetailDrawer', () => {
  it('uses bento profile view without legacy dark placeholder copy', async () => {
    render(<CandidateDetailDrawer candidate={candidate} isOpen onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Ada Lovelace' })).toBeDefined();
    expect(screen.queryByText('Candidate Profile View')).toBeNull();
    expect(screen.queryByText(/Observational Data Only/)).toBeNull();

    await waitFor(() => {
      expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
    });
  });

  it('calls onClose when close button is pressed', async () => {
    const onClose = vi.fn();
    render(<CandidateDetailDrawer candidate={candidate} isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close profile' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
