import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SmartApiError } from '@smart/api-client';
import type {
  ApplicationDto,
  BatchDto,
  InstitutionStudentDto,
  JobOpeningDto,
  SkillClaimDto,
} from '@smart/contracts';
import { api, applicationsApi, openingsApi } from '../lib/api';
import { AcademiaDashboard } from './academia-dashboard';

vi.mock('../lib/api', () => ({
  api: {
    onboarding: {
      listTpoStudents: vi.fn(),
      listBatches: vi.fn(),
    },
    assessment: {
      listSkillClaims: vi.fn(),
    },
  },
  openingsApi: {
    list: vi.fn(),
  },
  applicationsApi: {
    listForOpening: vi.fn(),
  },
}));

const createdAt = '2026-09-02T06:00:00.000Z';

const opening: JobOpeningDto = {
  openingId: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Infinitica Labs',
  roleTitle: 'Backend Engineer',
  domain: 'SOFTWARE_IT',
  requiredSkills: [],
  minYearsExperience: 1,
  maxYearsExperience: 3,
  location: 'Coimbatore',
  employmentType: 'FULL_TIME',
  headcount: 2,
  status: 'OPEN',
  createdAt,
};

const students: InstitutionStudentDto[] = [
  {
    userId: '55555555-5555-4555-8555-555555555551',
    email: 'aarav@example.com',
    fullName: 'Aarav Sharma',
    batchId: null,
    batchName: null,
    inviteStatus: 'ACCEPTED',
    lastSentAt: createdAt,
    acceptedAt: createdAt,
    heldAt: null,
  },
  {
    userId: '55555555-5555-4555-8555-555555555552',
    email: 'bhavna@example.com',
    fullName: 'Bhavna Patel',
    batchId: null,
    batchName: null,
    inviteStatus: 'PENDING',
    lastSentAt: createdAt,
    acceptedAt: null,
    heldAt: null,
  },
];

const batches: BatchDto[] = [
  {
    batchId: '77777777-7777-4777-8777-777777777771',
    institutionId: opening.institutionId,
    name: 'CSE 2026',
    code: 'CSE26',
    memberCount: 12,
    pendingInviteCount: 3,
    createdAt,
  },
];

const claims: SkillClaimDto[] = [
  {
    claimId: '66666666-6666-4666-8666-666666666661',
    studentId: '55555555-5555-4555-8555-555555555551',
    skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
    proficiency: 'ADVANCED',
    status: 'VERIFIED',
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: null,
  },
  {
    claimId: '66666666-6666-4666-8666-666666666662',
    studentId: '55555555-5555-4555-8555-555555555552',
    skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
    proficiency: 'BEGINNER',
    status: 'DECLARED',
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: null,
  },
];

const applications: ApplicationDto[] = [
  {
    applicationId: '33333333-3333-4333-8333-333333333331',
    openingId: opening.openingId,
    studentId: '55555555-5555-4555-8555-555555555551',
    studentName: 'Aarav Sharma',
    stage: 'SHORTLISTED',
    matchScore: 0.9,
    createdAt,
    updatedAt: createdAt,
  },
  {
    applicationId: '33333333-3333-4333-8333-333333333332',
    openingId: opening.openingId,
    studentId: '55555555-5555-4555-8555-555555555552',
    studentName: 'Bhavna Patel',
    stage: 'INTERVIEW',
    matchScore: 0.8,
    createdAt,
    updatedAt: createdAt,
  },
];

function mockLiveData() {
  vi.mocked(api.onboarding.listTpoStudents).mockResolvedValue(students);
  vi.mocked(api.onboarding.listBatches).mockResolvedValue(batches);
  vi.mocked(api.assessment.listSkillClaims).mockResolvedValue(claims);
  vi.mocked(openingsApi.list).mockResolvedValue({ openings: [opening] });
  vi.mocked(applicationsApi.listForOpening).mockResolvedValue({ applications });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AC-T07 academia dashboard', () => {
  it('shows a loading state before live data arrives', () => {
    vi.mocked(api.onboarding.listTpoStudents).mockReturnValue(new Promise(() => undefined));
    vi.mocked(api.onboarding.listBatches).mockReturnValue(new Promise(() => undefined));
    vi.mocked(api.assessment.listSkillClaims).mockReturnValue(new Promise(() => undefined));
    vi.mocked(openingsApi.list).mockReturnValue(new Promise(() => undefined));

    render(<AcademiaDashboard />);

    expect(screen.getByText('Loading academia dashboard…')).toBeDefined();
  });

  it('maps live student, claim, batch, and ATS counts', async () => {
    mockLiveData();
    render(<AcademiaDashboard />);

    expect(await screen.findByText('Academia dashboard')).toBeDefined();
    expect(screen.getByText('Students')).toBeDefined();
    expect(screen.getByText('Accepted')).toBeDefined();
    expect(screen.getByText('VERIFIED'.replaceAll('_', ' '))).toBeDefined();
    expect(screen.getByText('DECLARED')).toBeDefined();
    expect(screen.getByText('CSE 2026')).toBeDefined();
    expect(screen.getByText(/12 members · 3 pending invites/)).toBeDefined();
    expect(screen.getByText('Placement pipeline')).toBeDefined();
    expect(screen.getByText('Shortlisted')).toBeDefined();
    expect(screen.getByText('Interviewing')).toBeDefined();
    expect(screen.queryByText('AI-Verified')).toBeNull();
    expect(screen.queryByText('SENT_TO_COMPANY')).toBeNull();
  });

  it('does not invent a profile-completion percent', async () => {
    mockLiveData();
    render(<AcademiaDashboard />);

    expect(await screen.findByText('Metric not available')).toBeDefined();
    expect(screen.queryByText(/% complete/i)).toBeNull();
    expect(screen.queryByText('68%')).toBeNull();
  });

  it('shows empty states when the institution has no live rows', async () => {
    vi.mocked(api.onboarding.listTpoStudents).mockResolvedValue([]);
    vi.mocked(api.onboarding.listBatches).mockResolvedValue([]);
    vi.mocked(api.assessment.listSkillClaims).mockResolvedValue([]);
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });

    render(<AcademiaDashboard />);

    expect(await screen.findByText('No students in this institution yet.')).toBeDefined();
    expect(screen.getByText('No skill claims on file yet.')).toBeDefined();
    expect(screen.getByText('No batches created yet.')).toBeDefined();
    expect(screen.getByText(/No applications yet/)).toBeDefined();
  });

  it('shows section errors without fabricating fallback metrics', async () => {
    vi.mocked(api.onboarding.listTpoStudents).mockRejectedValue(
      new SmartApiError({
        statusCode: 403,
        error: 'forbidden',
        message: 'Placement staff must belong to an institution.',
      }),
    );
    vi.mocked(api.onboarding.listBatches).mockRejectedValue(
      new SmartApiError({
        statusCode: 403,
        error: 'forbidden',
        message: 'Could not load batches.',
      }),
    );
    vi.mocked(api.assessment.listSkillClaims).mockRejectedValue(
      new SmartApiError({
        statusCode: 403,
        error: 'forbidden',
        message: 'You do not have permission to list skill claims.',
      }),
    );
    vi.mocked(openingsApi.list).mockRejectedValue(
      new SmartApiError({
        statusCode: 404,
        error: 'not_found',
        message: 'Job opening not found.',
      }),
    );

    render(<AcademiaDashboard />);

    expect(await screen.findByText('Could not load students')).toBeDefined();
    expect(screen.getByText('Placement staff must belong to an institution.')).toBeDefined();
    expect(screen.getByText('Could not load skill claims')).toBeDefined();
    expect(screen.getByText('Could not load placement pipeline')).toBeDefined();
    expect(screen.queryByText('78')).toBeNull();
  });

  it('explains that the skill-gap report is not an available backend source', async () => {
    mockLiveData();
    render(<AcademiaDashboard />);

    expect(await screen.findByText('Skill-gap report not available')).toBeDefined();
    expect(screen.getByText(/analytics gap-report API/)).toBeDefined();
    await waitFor(() => {
      expect(applicationsApi.listForOpening).toHaveBeenCalledWith(opening.openingId);
    });
  });
});
