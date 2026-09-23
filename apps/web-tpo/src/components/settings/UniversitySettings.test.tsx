import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UniversitySettings } from './UniversitySettings';

vi.mock('../../lib/api', () => ({
  api: {
    auth: {
      me: vi.fn().mockResolvedValue({ inst: '11111111-1111-4111-8111-111111111111' }),
    },
    onboarding: {
      tpoEntitlements: vi.fn().mockResolvedValue({
        domain: 'riverdale.edu',
        institutionName: 'Riverdale State University',
        verificationStatus: 'APPROVED',
        planCode: 'INSTITUTION_PRO',
        candidateUsage: 12,
        candidateCapacity: 500,
      }),
      listBatches: vi.fn().mockResolvedValue([
        {
          batchId: '22222222-2222-4222-8222-222222222222',
          institutionId: '11111111-1111-4111-8111-111111111111',
          name: 'Main Campus',
          code: null,
          memberCount: 100,
          pendingInviteCount: 2,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
      createBatch: vi.fn(),
    },
  },
  employersApi: {
    list: vi.fn().mockResolvedValue({
      employers: [
        {
          employerId: '33333333-3333-4333-8333-333333333333',
          institutionId: '11111111-1111-4111-8111-111111111111',
          name: 'Northline Corp',
          openingCount: 0,
          activeOpeningCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }),
  },
}));

describe('UniversitySettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders wireframe sections with live data', async () => {
    render(<UniversitySettings />);
    await waitFor(() => {
      expect(screen.getByText('Verified student email domains')).toBeDefined();
    });
    expect(screen.getByText('@riverdale.edu')).toBeDefined();
    expect(screen.getByText('Multi-campus system')).toBeDefined();
    expect(screen.getByText('Main Campus')).toBeDefined();
    expect(screen.getByText('Employer approval queue')).toBeDefined();
    expect(screen.getByText('Northline Corp')).toBeDefined();
  });
});
