import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CandidateEvidenceReviewPanel } from './CandidateEvidenceReviewPanel';

vi.mock('../../lib/api', () => ({
  api: {
    placement: {
      getCandidateEvidenceProvenance: vi.fn(),
      reviewCandidateEvidence: vi.fn(),
    },
  },
}));

import { api } from '../../lib/api';

const STUDENT_ID = '44444444-4444-4444-8444-444444444444';
const EVIDENCE_ID = '22222222-2222-4222-8222-222222222222';

describe('CandidateEvidenceReviewPanel', () => {
  beforeEach(() => {
    vi.mocked(api.placement.getCandidateEvidenceProvenance).mockResolvedValue({
      studentId: STUDENT_ID,
      total: 1,
      summary: { SELF_DECLARED: 1, SOURCE_VERIFIED: 0, ASSESSED: 0, HUMAN_REVIEWED: 0 },
      items: [
        {
          evidenceId: EVIDENCE_ID,
          evidenceType: 'SELF_REPORT',
          source: 'CANDIDATE',
          verificationStatus: 'PENDING',
          categories: ['SELF_DECLARED'],
          claim: 'TypeScript mastery',
          relatedSkillIds: [],
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('24. reviewer can see evidence list', async () => {
    render(<CandidateEvidenceReviewPanel studentId={STUDENT_ID} />);
    expect(await screen.findByTestId('evidence-review-panel')).toBeTruthy();
    expect(screen.getByTestId('evidence-select')).toBeTruthy();
  });

  it('25. renders decision controls', async () => {
    render(<CandidateEvidenceReviewPanel studentId={STUDENT_ID} />);
    await screen.findByTestId('decision-ACCEPTED');
    expect(screen.getByTestId('decision-REJECTED')).toBeTruthy();
    expect(screen.getByTestId('decision-NEEDS_INFORMATION')).toBeTruthy();
  });

  it('26. shows validation error from API', async () => {
    vi.mocked(api.placement.reviewCandidateEvidence).mockRejectedValue(
      new Error('reason must be at least 8 characters when rejecting evidence.'),
    );
    render(<CandidateEvidenceReviewPanel studentId={STUDENT_ID} />);
    await screen.findByTestId('submit-review');
    fireEvent.click(screen.getByTestId('decision-REJECTED'));
    fireEvent.click(screen.getByTestId('submit-review'));
    expect(await screen.findByText(/reason must be at least 8 characters/i)).toBeTruthy();
  });

  it('27. shows processing state while submitting', async () => {
    vi.mocked(api.placement.reviewCandidateEvidence).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                evidence: {
                  evidenceId: EVIDENCE_ID,
                  candidateId: STUDENT_ID,
                  evidenceType: 'SELF_REPORT',
                  source: 'CANDIDATE',
                  relatedSkillIds: [],
                  verificationStatus: 'VERIFIED',
                  accessibility: 'PRIVATE',
                  contradictions: [],
                  artifactIds: [],
                  createdAt: '2026-09-01T00:00:00.000Z',
                  updatedAt: '2026-09-01T00:00:00.000Z',
                },
                decision: 'ACCEPTED',
                idempotent: false,
                reconciliation: { status: 'QUEUED', jobId: 'job-1' },
              }),
            50,
          );
        }),
    );
    render(<CandidateEvidenceReviewPanel studentId={STUDENT_ID} />);
    await screen.findByTestId('submit-review');
    fireEvent.click(screen.getByTestId('submit-review'));
    expect(await screen.findByTestId('review-processing')).toBeTruthy();
  });

  it('28. shows success state after review', async () => {
    vi.mocked(api.placement.reviewCandidateEvidence).mockResolvedValue({
      evidence: {
        evidenceId: EVIDENCE_ID,
        candidateId: STUDENT_ID,
        evidenceType: 'SELF_REPORT',
        source: 'CANDIDATE',
        relatedSkillIds: [],
        verificationStatus: 'VERIFIED',
        accessibility: 'PRIVATE',
        contradictions: [],
        artifactIds: [],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      decision: 'ACCEPTED',
      idempotent: false,
      reconciliation: { status: 'QUEUED', jobId: 'job-1' },
    });
    render(<CandidateEvidenceReviewPanel studentId={STUDENT_ID} />);
    await screen.findByTestId('submit-review');
    fireEvent.click(screen.getByTestId('submit-review'));
    expect(await screen.findByTestId('review-success')).toBeTruthy();
  });

  it('29. shows failure state with retry', async () => {
    vi.mocked(api.placement.reviewCandidateEvidence).mockRejectedValue(
      new Error('Evidence review conflict — another reviewer updated this record.'),
    );
    render(<CandidateEvidenceReviewPanel studentId={STUDENT_ID} />);
    await screen.findByTestId('submit-review');
    fireEvent.click(screen.getByTestId('submit-review'));
    expect(await screen.findByTestId('review-retry')).toBeTruthy();
  });

  it('30. reloads provenance after success so updated status is visible', async () => {
    vi.mocked(api.placement.reviewCandidateEvidence).mockResolvedValue({
      evidence: {
        evidenceId: EVIDENCE_ID,
        candidateId: STUDENT_ID,
        evidenceType: 'SELF_REPORT',
        source: 'CANDIDATE',
        relatedSkillIds: [],
        verificationStatus: 'VERIFIED',
        accessibility: 'PRIVATE',
        contradictions: [],
        artifactIds: [],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      decision: 'ACCEPTED',
      idempotent: false,
      reconciliation: { status: 'NOT_ENQUEUED' },
    });
    render(<CandidateEvidenceReviewPanel studentId={STUDENT_ID} />);
    await screen.findByTestId('submit-review');
    fireEvent.click(screen.getByTestId('submit-review'));
    await waitFor(() =>
      expect(api.placement.getCandidateEvidenceProvenance).toHaveBeenCalledTimes(2),
    );
  });
});
