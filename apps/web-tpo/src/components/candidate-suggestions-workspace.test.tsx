import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CandidateMatchDto, MatchRunDto, ShortlistDto } from '@smart/contracts';
import { SmartApiError } from '@smart/api-client';
import { api, applicationsApi, matchingApi, openingsApi } from '../lib/api';
import { CandidateSuggestionsWorkspace } from './candidate-suggestions-workspace';

vi.mock('../lib/api', () => ({
  api: {
    onboarding: {
      listBatches: vi.fn(),
    },
  },
  openingsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
  matchingApi: {
    match: vi.fn(),
    createRun: vi.fn(),
    getRun: vi.fn(),
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
      skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
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
  certificateId: null,
  highestLevelCleared: 1,
  headlineTier: 'BRONZE',
  similarityScore: 0,
  matchScore: 0.92,
  method: 'SKILL_CAPABILITY',
  explanation: {
    thresholdsMet: [],
    thresholdsMissed: [],
    strongCompetencies: [],
    gapCompetencies: [],
    why: 'Met Deep Learning; capability training pipeline.',
    skillCoveragePct: 1,
    capabilityCoveragePct: 0.8,
    potentialFit: 'STRONG',
    skillFit: [
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        skillName: 'Deep Learning',
        status: 'MET',
        requiredProficiency: 'BEGINNER',
        actualProficiency: 'INTERMEDIATE',
      },
    ],
    capabilityFit: [],
    recruiterSummary: 'Strong verified deep learning fit for this role.',
    verifiedSkills: [
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        skillName: 'Deep Learning',
        proficiency: 'INTERMEDIATE',
      },
      {
        skillCode: 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
        skillName: 'Large Language Model Application Engineering',
        proficiency: 'BEGINNER',
      },
    ],
  },
};

const candidateB: CandidateMatchDto = {
  studentId: 'bbbbbbb2-2222-4222-8222-222222222222',
  studentName: 'Bhavna Patel',
  trackCode: 'TECH_FULLSTACK',
  certificateId: null,
  highestLevelCleared: 1,
  headlineTier: 'BRONZE',
  similarityScore: 0,
  matchScore: 0.75,
  method: 'SKILL_CAPABILITY',
  explanation: {
    thresholdsMet: [],
    thresholdsMissed: [],
    strongCompetencies: [],
    gapCompetencies: [],
    why: 'Partial skill coverage on required stack.',
    skillCoveragePct: 0.75,
    capabilityCoveragePct: 0.6,
    potentialFit: 'STRETCH',
    skillFit: [
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        skillName: 'Deep Learning',
        status: 'PARTIAL',
        requiredProficiency: 'INTERMEDIATE',
        actualProficiency: 'BEGINNER',
      },
    ],
    capabilityFit: [],
    verifiedSkills: [
      {
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        skillName: 'Deep Learning',
        proficiency: 'BEGINNER',
      },
    ],
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
  eligiblePoolCount: 15,
  matchMethod: 'SKILL_CAPABILITY',
  minSkillCoverageApplied: 0.6,
};

const runId = '55555555-5555-4555-8555-555555555555';

function succeededRun(overrides: Partial<MatchRunDto> = {}): MatchRunDto {
  return {
    runId,
    jdId: mockOpening.openingId,
    status: 'SUCCEEDED',
    eligiblePoolCount: 15,
    suggestedCount: 2,
    errorMessage: null,
    createdAt: '2026-09-02T08:00:00.000Z',
    completedAt: '2026-09-02T08:00:05.000Z',
    shortlist: mockShortlist,
    ...overrides,
  };
}

// A tiny real poll interval keeps these tests fast without faking timers, which breaks
// testing-library's own findBy/waitFor polling.
const TEST_POLL_INTERVAL_MS = 15;

function renderWorkspace(props: { initialOpeningId?: string } = {}) {
  return render(
    <CandidateSuggestionsWorkspace {...props} matchRunPollIntervalMs={TEST_POLL_INTERVAL_MS} />,
  );
}

/** Clicks "Run matching" and waits for the poll to resolve the run to a terminal status. */
async function runMatchingToSuccess() {
  fireEvent.click(screen.getByRole('button', { name: /run matching/i }));
  await waitFor(() => expect(matchingApi.getRun).toHaveBeenCalled());
}

beforeEach(() => {
  vi.mocked(api.onboarding.listBatches).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AC-T04 CandidateSuggestionsWorkspace', () => {
  it('shows loading and empty states when no openings exist', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });

    renderWorkspace();

    expect(screen.getByRole('status').textContent).toContain('Loading job openings');
    expect(
      await screen.findByText(/Select a job opening to view ranked candidate suggestions/),
    ).toBeDefined();
    expect(screen.getByText(/No openings found/)).toBeDefined();
  });

  it('prompts for a match run before any candidates are fetched', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });

    renderWorkspace({ initialOpeningId: mockOpening.openingId });

    expect(await screen.findByText(/No match run yet/)).toBeDefined();
    expect(matchingApi.createRun).not.toHaveBeenCalled();
  });

  it('renders ranked candidates with match score and skill-capability explanation', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(matchingApi.createRun).mockResolvedValue({ runId, status: 'PENDING' });
    vi.mocked(matchingApi.getRun).mockResolvedValue(succeededRun());

    renderWorkspace({ initialOpeningId: mockOpening.openingId });
    await screen.findByRole('button', { name: /run matching/i });
    await runMatchingToSuccess();

    expect(await screen.findByText('Aarav Sharma')).toBeDefined();
    expect(screen.getByText('Bhavna Patel')).toBeDefined();

    // Percentage match scores
    expect(screen.getByText('92% match')).toBeDefined();
    expect(screen.getByText('75% match')).toBeDefined();

    expect(screen.getByText('Strong verified deep learning fit for this role.')).toBeDefined();
    expect(screen.getByText(/Skill \+ capability match/)).toBeDefined();
    expect(screen.getAllByText(/Verified on profile/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Large Language Model Application Engineering/)).toBeDefined();
    expect(screen.getByText('Partial fit — upskilling likely')).toBeDefined();
    expect(screen.getAllByText(/Deep Learning/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Meets opening')).toBeDefined();
    expect(screen.queryByText(/GOLD \(Ready Now\)/)).toBeNull();

    // KPI strip
    expect(screen.getByText('15 students')).toBeDefined();
    expect(screen.getByText('2 candidates')).toBeDefined();
  });

  it('opens the skill gap sidebar when View skill gap is clicked', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(matchingApi.createRun).mockResolvedValue({ runId, status: 'PENDING' });
    vi.mocked(matchingApi.getRun).mockResolvedValue(succeededRun());

    renderWorkspace({ initialOpeningId: mockOpening.openingId });
    await runMatchingToSuccess();

    const bhavnaHeading = await screen.findByRole('heading', { name: 'Bhavna Patel' });
    const card = bhavnaHeading.closest('article');
    if (!card) throw new Error('Expected candidate card');
    fireEvent.click(within(card).getByRole('button', { name: 'View skill gap' }));
    expect(await screen.findByRole('dialog', { name: /skill gap — bhavna patel/i })).toBeDefined();
    expect(screen.getByText(/Skills required by this opening/i)).toBeDefined();
  });

  it('orders candidates in descending matchScore order', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(matchingApi.createRun).mockResolvedValue({ runId, status: 'PENDING' });
    vi.mocked(matchingApi.getRun).mockResolvedValue(succeededRun());

    renderWorkspace({ initialOpeningId: mockOpening.openingId });
    await screen.findByRole('button', { name: /run matching/i });
    await runMatchingToSuccess();

    await screen.findByText('Aarav Sharma');
    const names = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim());

    // Aarav (0.92) must come before Bhavna (0.75)
    expect(names).toEqual(['Aarav Sharma', 'Bhavna Patel']);
  });

  it('shows a safe error message when triggering a run fails, and allows retrying', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(matchingApi.createRun)
      .mockRejectedValueOnce(new Error('Matching service unavailable'))
      .mockResolvedValueOnce({ runId, status: 'PENDING' });
    vi.mocked(matchingApi.getRun).mockResolvedValue(succeededRun());

    renderWorkspace({ initialOpeningId: mockOpening.openingId });
    fireEvent.click(await screen.findByRole('button', { name: /run matching/i }));

    expect(await screen.findByText('Matching service unavailable')).toBeDefined();

    await runMatchingToSuccess();

    expect(await screen.findByText('Aarav Sharma')).toBeDefined();
    expect(matchingApi.createRun).toHaveBeenCalledTimes(2);
  });

  it('resets the prior run when the selected opening changes', async () => {
    const secondOpening = {
      ...mockOpening,
      openingId: '22222222-2222-4222-8222-222222222222',
      roleTitle: 'Backend Engineer',
    };

    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening, secondOpening] });
    vi.mocked(matchingApi.createRun).mockResolvedValue({ runId, status: 'PENDING' });
    vi.mocked(matchingApi.getRun).mockResolvedValue(succeededRun());

    renderWorkspace({ initialOpeningId: mockOpening.openingId });
    await screen.findByRole('button', { name: /run matching/i });
    await runMatchingToSuccess();
    await screen.findByText('Aarav Sharma');

    fireEvent.change(screen.getByRole('combobox', { name: 'Select Job Opening' }), {
      target: { value: secondOpening.openingId },
    });

    expect(await screen.findByText(/No match run yet/)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /run matching/i }));
    await waitFor(() =>
      expect(matchingApi.createRun).toHaveBeenLastCalledWith(
        expect.objectContaining({ jdId: secondOpening.openingId }),
      ),
    );
  });
});

describe('AC-T05 send opportunity', () => {
  async function renderSuggestions() {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(matchingApi.createRun).mockResolvedValue({ runId, status: 'PENDING' });
    vi.mocked(matchingApi.getRun).mockResolvedValue(succeededRun());
    const view = renderWorkspace({ initialOpeningId: mockOpening.openingId });
    await screen.findByRole('button', { name: /run matching/i });
    await runMatchingToSuccess();
    await screen.findByText('Aarav Sharma');
    return view;
  }

  it('does not POST when no candidate is selected', async () => {
    await renderSuggestions();

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
    await renderSuggestions();

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
    await renderSuggestions();

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
    await renderSuggestions();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Aarav Sharma' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send opportunity' }));

    expect(await screen.findByText(/1 already shortlisted/)).toBeDefined();
    expect(screen.getAllByText('Opportunity sent').length).toBeGreaterThan(0);
  });
});
