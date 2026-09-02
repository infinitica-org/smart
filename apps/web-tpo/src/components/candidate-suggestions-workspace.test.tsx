import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CandidateMatchDto, ShortlistDto } from '@smart/contracts';
import { SmartApiError } from '@smart/api-client';
import { applicationsApi, matchingApi, openingsApi } from '../lib/api';
import { CandidateSuggestionsWorkspace } from './candidate-suggestions-workspace';

vi.mock('../lib/api', () => ({
  openingsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
  matchingApi: {
    match: vi.fn(),
  },
  applicationsApi: {
    create: vi.fn(),
  },
}));

const mockOpening = {
  openingId: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Acme Tech Solutions',
  roleTitle: 'Frontend Engineer',
  domain: 'SOFTWARE_IT' as const,
  requiredSkills: [
    {
      skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
      minProficiency: 'ADVANCED' as const,
    },
  ],
  minYearsExperience: 1,
  maxYearsExperience: 3,
  location: 'Bengaluru',
  employmentType: 'FULL_TIME' as const,
  headcount: 5,
  status: 'OPEN' as const,
  createdAt: '2026-09-02T00:00:00.000Z',
};

const candidateA: CandidateMatchDto = {
  studentId: 'aaaaaaa1-1111-4111-8111-111111111111',
  studentName: 'Aarav Sharma',
  trackCode: 'TECH_FULLSTACK',
  certificateId: 'cert-1111',
  highestLevelCleared: 3,
  headlineTier: 'GOLD',
  similarityScore: 0.92,
  matchScore: 0.92,
  method: 'RULES',
  explanation: {
    thresholdsMet: [{ level: 3, required: 'GOLD', actual: 'GOLD' }],
    thresholdsMissed: [],
    strongCompetencies: ['Algorithms', 'System Design'],
    gapCompetencies: [],
    why: 'Demonstrated Gold tier mastery in Fullstack level 3 with strong algorithmic competencies.',
  },
};

const candidateB: CandidateMatchDto = {
  studentId: 'bbbbbbb2-2222-4222-8222-222222222222',
  studentName: 'Bhavna Patel',
  trackCode: 'TECH_FULLSTACK',
  certificateId: 'cert-2222',
  highestLevelCleared: 2,
  headlineTier: 'SILVER',
  similarityScore: 0.75,
  matchScore: 0.75,
  method: 'RULES',
  explanation: {
    thresholdsMet: [{ level: 2, required: 'SILVER', actual: 'SILVER' }],
    thresholdsMissed: [],
    strongCompetencies: ['Frontend Logic'],
    gapCompetencies: ['System Design'],
    why: 'Cleared Silver tier level 2 with core frontend competencies present.',
  },
};

const mockShortlist: ShortlistDto = {
  shortlistId: '99999999-9999-4999-8999-999999999999',
  jdId: mockOpening.openingId,
  companyName: mockOpening.companyName,
  roleTitle: mockOpening.roleTitle,
  generatedAt: '2026-09-02T08:00:00.000Z',
  candidates: [candidateB, candidateA], // Deliberately out of order (0.75 then 0.92)
  totalCandidatesConsidered: 15,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AC-T04 CandidateSuggestionsWorkspace', () => {
  it('shows loading and empty states when no openings exist', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });

    render(<CandidateSuggestionsWorkspace />);

    expect(screen.getByRole('status').textContent).toContain(
      'Fetching ranked candidate suggestions',
    );
    expect(await screen.findByText(/No openings found/)).toBeDefined();
    expect(
      screen.getByText(/Select a job opening to view ranked candidate suggestions/),
    ).toBeDefined();
  });

  it('renders ranked candidate list with score percentage, headline tier, level and explanation.why', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(matchingApi.match).mockResolvedValue(mockShortlist);

    render(<CandidateSuggestionsWorkspace initialOpeningId={mockOpening.openingId} />);

    expect(await screen.findByText('Aarav Sharma')).toBeDefined();
    expect(screen.getByText('Bhavna Patel')).toBeDefined();

    // Percentage match scores
    expect(screen.getByText('92% Match')).toBeDefined();
    expect(screen.getByText('75% Match')).toBeDefined();

    // Plain-language match explanations
    expect(
      screen.getByText(
        'Demonstrated Gold tier mastery in Fullstack level 3 with strong algorithmic competencies.',
      ),
    ).toBeDefined();
    expect(
      screen.getByText('Cleared Silver tier level 2 with core frontend competencies present.'),
    ).toBeDefined();

    // Headline tier labels
    expect(screen.getByText(/GOLD \(Ready Now\)/)).toBeDefined();
    expect(screen.getByText(/SILVER \(Needs Supervised Onboarding\)/)).toBeDefined();

    // Level clearance
    expect(screen.getByText(/Level 3 Cleared/)).toBeDefined();
    expect(screen.getByText(/Level 2 Cleared/)).toBeDefined();
  });

  it('orders candidates in descending matchScore order', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(matchingApi.match).mockResolvedValue(mockShortlist);

    render(<CandidateSuggestionsWorkspace initialOpeningId={mockOpening.openingId} />);

    await screen.findByText('Aarav Sharma');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

    // Aarav (0.92) must come before Bhavna (0.75)
    expect(headings).toEqual(['Aarav Sharma', 'Bhavna Patel']);
  });

  it('shows safe API error message and allows refresh', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(matchingApi.match)
      .mockRejectedValueOnce(new Error('Matching service unavailable'))
      .mockResolvedValueOnce(mockShortlist);

    render(<CandidateSuggestionsWorkspace initialOpeningId={mockOpening.openingId} />);

    expect(await screen.findByText('Matching service unavailable')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByText('Aarav Sharma')).toBeDefined();
    expect(matchingApi.match).toHaveBeenCalledTimes(2);
  });

  it('fetches candidate suggestions when opening selection changes', async () => {
    const secondOpening = {
      ...mockOpening,
      openingId: '22222222-2222-4222-8222-222222222222',
      roleTitle: 'Backend Engineer',
    };

    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening, secondOpening] });
    vi.mocked(matchingApi.match).mockResolvedValue(mockShortlist);

    render(<CandidateSuggestionsWorkspace />);

    await waitFor(() => {
      expect(matchingApi.match).toHaveBeenCalledWith({ jdId: mockOpening.openingId, limit: 50 });
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'Select Job Opening' }), {
      target: { value: secondOpening.openingId },
    });

    await waitFor(() => {
      expect(matchingApi.match).toHaveBeenCalledWith({ jdId: secondOpening.openingId, limit: 50 });
    });
  });
});

describe('AC-T05 send opportunity', () => {
  function renderSuggestions() {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(matchingApi.match).mockResolvedValue(mockShortlist);
    return render(<CandidateSuggestionsWorkspace initialOpeningId={mockOpening.openingId} />);
  }

  it('does not POST when no candidate is selected', async () => {
    renderSuggestions();
    await screen.findByText('Aarav Sharma');

    fireEvent.click(screen.getByRole('button', { name: 'Send opportunity' }));

    expect(await screen.findByText(/Select at least one candidate/)).toBeDefined();
    expect(applicationsApi.create).not.toHaveBeenCalled();
  });

  it('posts openingId, studentId and the AC-T04 matchScore for each selected candidate', async () => {
    vi.mocked(applicationsApi.create).mockResolvedValue({
      applicationId: '33333333-3333-4333-8333-333333333333',
      openingId: mockOpening.openingId,
      studentId: candidateA.studentId,
      stage: 'SHORTLISTED',
      matchScore: candidateA.matchScore,
      createdAt: '2026-09-02T09:00:00.000Z',
      updatedAt: '2026-09-02T09:00:00.000Z',
    });
    renderSuggestions();
    await screen.findByText('Aarav Sharma');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Aarav Sharma' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send opportunity' }));

    await waitFor(() => {
      expect(applicationsApi.create).toHaveBeenCalledWith({
        openingId: mockOpening.openingId,
        studentId: candidateA.studentId,
        matchScore: 0.92,
      });
    });
    expect(await screen.findByText(/1 shortlisted/)).toBeDefined();
    expect(screen.getAllByText('Opportunity sent').length).toBeGreaterThan(0);
    expect(applicationsApi.create).toHaveBeenCalledTimes(1);
  });

  it('sends one request per selected candidate and reports a partial failure', async () => {
    vi.mocked(applicationsApi.create)
      .mockResolvedValueOnce({
        applicationId: '33333333-3333-4333-8333-333333333333',
        openingId: mockOpening.openingId,
        studentId: candidateA.studentId,
        stage: 'SHORTLISTED',
        matchScore: candidateA.matchScore,
        createdAt: '2026-09-02T09:00:00.000Z',
        updatedAt: '2026-09-02T09:00:00.000Z',
      })
      .mockRejectedValueOnce(new Error('Placement API unavailable'));
    renderSuggestions();
    await screen.findByText('Aarav Sharma');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Aarav Sharma' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Bhavna Patel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send opportunity' }));

    await waitFor(() => {
      expect(applicationsApi.create).toHaveBeenCalledTimes(2);
    });
    expect(applicationsApi.create).toHaveBeenNthCalledWith(1, {
      openingId: mockOpening.openingId,
      studentId: candidateA.studentId,
      matchScore: 0.92,
    });
    expect(applicationsApi.create).toHaveBeenNthCalledWith(2, {
      openingId: mockOpening.openingId,
      studentId: candidateB.studentId,
      matchScore: 0.75,
    });
    expect(await screen.findByText(/1 shortlisted. 1 failed/)).toBeDefined();
  });

  it('treats a 409 as already shortlisted rather than a hard failure', async () => {
    vi.mocked(applicationsApi.create).mockRejectedValue(
      new SmartApiError({
        error: 'conflict',
        message: 'This candidate has already been shortlisted for this opening.',
        statusCode: 409,
      }),
    );
    renderSuggestions();
    await screen.findByText('Aarav Sharma');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Aarav Sharma' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send opportunity' }));

    expect(await screen.findByText(/1 already shortlisted/)).toBeDefined();
    expect(screen.getAllByText('Opportunity sent').length).toBeGreaterThan(0);
  });
});
