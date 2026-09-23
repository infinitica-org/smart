import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsPage from './page';

const apiMock = vi.hoisted(() => ({
  listTpoStudents: vi.fn(),
  listSkillClaims: vi.fn(),
}));

vi.mock('../../../lib/api', () => ({
  api: {
    onboarding: { listTpoStudents: apiMock.listTpoStudents },
    assessment: { listSkillClaims: apiMock.listSkillClaims },
  },
  openingsApi: { list: vi.fn().mockResolvedValue({ openings: [] }) },
  employersApi: { list: vi.fn().mockResolvedValue({ employers: [] }) },
  countInstitutionPlacementApplications: vi.fn().mockResolvedValue({ count: 0 }),
}));

beforeEach(() => {
  apiMock.listTpoStudents.mockResolvedValue([
    {
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'ada@school.edu',
      fullName: 'Ada Lovelace',
      batchId: null,
      batchName: 'Comp. Sci',
      inviteStatus: 'ACCEPTED',
      lastSentAt: null,
      acceptedAt: null,
      heldAt: null,
      linkedinUrl: null,
      githubUrl: null,
    },
    {
      userId: '00000000-0000-4000-8000-000000000002',
      email: 'grace@school.edu',
      fullName: 'Grace Hopper',
      batchId: null,
      batchName: null,
      inviteStatus: 'PENDING',
      lastSentAt: null,
      acceptedAt: null,
      heldAt: null,
      linkedinUrl: null,
      githubUrl: null,
    },
  ]);
  apiMock.listSkillClaims.mockResolvedValue([
    {
      claimId: '00000000-0000-4000-8000-000000000099',
      studentId: '00000000-0000-4000-8000-000000000001',
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      proficiency: 'INTERMEDIATE',
      status: 'VERIFIED',
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
    },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReportsPage', () => {
  it('renders report sections and data', async () => {
    render(<ReportsPage />);

    expect(await screen.findByText('Verification completion by major')).toBeDefined();
    expect(screen.getByText('Placement & opportunities matched')).toBeDefined();
    expect(screen.getByText('Employer engagement by school')).toBeDefined();
    expect(screen.getByText('Comp. Sci')).toBeDefined();
  });

  it('renders zero state when no data exists', async () => {
    apiMock.listTpoStudents.mockResolvedValueOnce([]);
    apiMock.listSkillClaims.mockResolvedValueOnce([]);
    render(<ReportsPage />);

    expect(await screen.findByText('No students on the whitelist yet.')).toBeDefined();
  });
});
