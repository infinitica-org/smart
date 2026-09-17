import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SmartApiError } from '@smart/api-client';
import { SEND_TO_COMPANY_STAGE } from '@smart/contracts';
import type { ApplicationConfidenceDto, ApplicationDto } from '@smart/contracts';
import { applicationsApi, openingsApi } from '../lib/api';
import { ConfidenceReviewWorkspace } from './confidence-review-workspace';

vi.mock('../lib/api', () => ({
  openingsApi: {
    list: vi.fn(),
  },
  applicationsApi: {
    listForOpening: vi.fn(),
    getConfidence: vi.fn(),
    sendToCompany: vi.fn(),
  },
}));

const mockOpening = {
  openingId: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Infinitica Labs',
  roleTitle: 'Backend Engineer',
  domain: 'SOFTWARE_IT' as const,
  requiredSkills: [],
  minYearsExperience: 1,
  maxYearsExperience: 3,
  location: 'Coimbatore',
  employmentType: 'FULL_TIME' as const,
  headcount: 2,
  status: 'OPEN' as const,
  createdAt: '2026-09-02T05:30:00.000Z',
};

const shortlisted: ApplicationDto = {
  applicationId: '33333333-3333-4333-8333-333333333333',
  openingId: mockOpening.openingId,
  studentId: '44444444-4444-4444-8444-444444444444',
  studentName: 'Aarav Sharma',
  studentEmail: 'aarav@example.com',
  primaryTrackCode: 'FULLSTACK',
  stage: 'SHORTLISTED',
  matchScore: 0.88,
  createdAt: '2026-09-02T06:00:00.000Z',
  updatedAt: '2026-09-02T06:00:00.000Z',
};

const completeConfidence: ApplicationConfidenceDto = {
  applicationId: shortlisted.applicationId,
  studentId: shortlisted.studentId,
  available: true,
  complete: true,
  passed: true,
  explanation: 'Named Redis and explained stampede and TTL trade-offs.',
  promptRef: null,
  sendBlockedReason: null,
};

const missingConfidence: ApplicationConfidenceDto = {
  ...completeConfidence,
  available: false,
  complete: false,
  passed: null,
  explanation: null,
  sendBlockedReason: 'No SE-T02 confidence result is on file for this candidate.',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AC-T06 confidence review workspace', () => {
  it('displays the authoritative passed + explanation result', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({ applications: [shortlisted] });
    vi.mocked(applicationsApi.getConfidence).mockResolvedValue(completeConfidence);

    render(<ConfidenceReviewWorkspace />);

    expect(await screen.findByText('Aarav Sharma')).toBeDefined();
    expect(screen.getByText('Passed')).toBeDefined();
    expect(
      screen.getByText('Named Redis and explained stampede and TTL trade-offs.'),
    ).toBeDefined();
    expect(screen.queryByText(/% confidence/i)).toBeNull();
  });

  it('disables Send when the confidence result is missing and explains why', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({ applications: [shortlisted] });
    vi.mocked(applicationsApi.getConfidence).mockResolvedValue(missingConfidence);

    render(<ConfidenceReviewWorkspace />);

    expect(
      await screen.findByText('No SE-T02 confidence result is on file for this candidate.'),
    ).toBeDefined();
    const send = screen.getByRole('button', { name: 'Send Aarav Sharma to company' });
    expect(send).toHaveProperty('disabled', true);
  });

  it('sends a complete result to the company and shows success', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({ applications: [shortlisted] });
    vi.mocked(applicationsApi.getConfidence).mockResolvedValue(completeConfidence);
    vi.mocked(applicationsApi.sendToCompany).mockResolvedValue({
      ...shortlisted,
      stage: SEND_TO_COMPANY_STAGE,
    });

    render(<ConfidenceReviewWorkspace />);
    await screen.findByText('Aarav Sharma');

    fireEvent.click(screen.getByRole('button', { name: 'Send Aarav Sharma to company' }));

    await waitFor(() => {
      expect(applicationsApi.sendToCompany).toHaveBeenCalledWith(shortlisted.applicationId);
    });
    expect((await screen.findAllByText('Sent to company')).length).toBeGreaterThan(0);
    expect(screen.getByText(/AI-Verified ATS column/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Send Aarav Sharma to company' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  /**
   * `sendToCompany` lands on AI_VERIFIED, not INTERVIEW. Hard-coding the wrong
   * stage here hid a live bug: the row stayed enabled and claimed the candidate
   * was in the Interviewing column.
   */
  it('keeps the sent candidate visible with the already-sent state', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({ applications: [shortlisted] });
    vi.mocked(applicationsApi.getConfidence).mockResolvedValue(completeConfidence);
    vi.mocked(applicationsApi.sendToCompany).mockResolvedValue({
      ...shortlisted,
      stage: SEND_TO_COMPANY_STAGE,
    });

    render(<ConfidenceReviewWorkspace />);
    await screen.findByText('Aarav Sharma');

    fireEvent.click(screen.getByRole('button', { name: 'Send Aarav Sharma to company' }));

    expect(await screen.findByText('Already sent')).toBeDefined();
    expect(screen.getByText('Aarav Sharma')).toBeDefined();
    expect(screen.getByText(SEND_TO_COMPANY_STAGE)).toBeDefined();
    expect(screen.queryByText('Send to Company')).toBeNull();
  });

  it('shows failure feedback when send is rejected', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({ applications: [shortlisted] });
    vi.mocked(applicationsApi.getConfidence).mockResolvedValue(completeConfidence);
    vi.mocked(applicationsApi.sendToCompany).mockRejectedValue(
      new SmartApiError({
        statusCode: 422,
        error: 'validation_failed',
        message: 'A complete SE-T02 confidence result is required before sending to the company.',
      }),
    );

    render(<ConfidenceReviewWorkspace />);
    await screen.findByText('Aarav Sharma');
    fireEvent.click(screen.getByRole('button', { name: 'Send Aarav Sharma to company' }));

    expect(await screen.findByText('Could not send to company')).toBeDefined();
    expect(
      screen.getByText(
        'A complete SE-T02 confidence result is required before sending to the company.',
      ),
    ).toBeDefined();
  });

  it('shows an explicit missing-result load error without inventing a pass', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({ applications: [shortlisted] });
    vi.mocked(applicationsApi.getConfidence).mockRejectedValue(
      new SmartApiError({
        statusCode: 500,
        error: 'internal_error',
        message: 'Confidence lookup failed.',
      }),
    );

    render(<ConfidenceReviewWorkspace />);

    expect(await screen.findByText('Could not load confidence result')).toBeDefined();
    expect(screen.getAllByText('Confidence lookup failed.').length).toBeGreaterThan(0);
    expect(screen.queryByText('Passed')).toBeNull();
  });
});
