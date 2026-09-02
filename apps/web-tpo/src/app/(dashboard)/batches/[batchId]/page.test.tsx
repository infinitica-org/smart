import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../../lib/api';
import BatchDetailPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ batchId: 'batch-1' }),
}));

vi.mock('../../../../lib/api', () => ({
  api: {
    onboarding: {
      getBatch: vi.fn(),
      listBatchMembers: vi.fn(),
      updateBatch: vi.fn(),
      addBatchMember: vi.fn(),
      resendStudentInvitation: vi.fn(),
    },
  },
}));

vi.mock('../../../../components/batch-import-wizard', () => ({
  BatchImportWizard: ({ batchId, onComplete }: { batchId: string; onComplete?: () => void }) => (
    <div>
      <h2>Bulk candidate provisioning</h2>
      <p>wizard-batch:{batchId}</p>
      <button type="button" onClick={() => onComplete?.()}>
        Complete provisioning
      </button>
    </div>
  ),
}));

const batch = {
  batchId: 'batch-1',
  institutionId: 'inst-1',
  name: 'Fall 2026',
  code: 'F26',
  memberCount: 1,
  pendingInviteCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const member = {
  userId: 'user-1',
  fullName: 'Ada Lovelace',
  email: 'ada@example.test',
  groupLabel: 'A',
  emailVerified: false,
  invitation: {
    invitationId: 'inv-1',
    email: 'ada@example.test',
    fullName: 'Ada Lovelace',
    role: 'STUDENT' as const,
    status: 'PENDING' as const,
    batchId: 'batch-1',
    groupLabel: 'A',
    expiresAt: '2026-12-01T00:00:00.000Z',
    acceptedAt: null,
    lastSentAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  heldAt: null,
};

describe('BatchDetailPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders batch details, members, and the wizard with the route batchId', async () => {
    vi.mocked(api.onboarding.getBatch).mockResolvedValue(batch);
    vi.mocked(api.onboarding.listBatchMembers).mockResolvedValue([member]);
    render(<BatchDetailPage />);

    expect(await screen.findByText('Fall 2026')).toBeDefined();
    expect(screen.getByText(/1 members/)).toBeDefined();
    expect(screen.getByText(/1 pending invites/)).toBeDefined();
    expect(screen.getByText('Ada Lovelace')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Resend' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Edit Details' })).toBeDefined();
    expect(screen.getByText('Bulk candidate provisioning')).toBeDefined();
    expect(screen.getByText('wizard-batch:batch-1')).toBeDefined();
    expect(document.querySelector('input[accept=".xlsx"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send invitations' })).toBeNull();
    expect(screen.queryByText('Download template')).toBeNull();
  });

  it('refreshes batch and member data after the wizard completes', async () => {
    vi.mocked(api.onboarding.getBatch).mockResolvedValue(batch);
    vi.mocked(api.onboarding.listBatchMembers).mockResolvedValue([member]);
    render(<BatchDetailPage />);
    await screen.findByText('Fall 2026');
    expect(api.onboarding.getBatch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Complete provisioning' }));

    await waitFor(() => expect(api.onboarding.getBatch).toHaveBeenCalledTimes(2));
    expect(api.onboarding.listBatchMembers).toHaveBeenCalledTimes(2);
  });
});
