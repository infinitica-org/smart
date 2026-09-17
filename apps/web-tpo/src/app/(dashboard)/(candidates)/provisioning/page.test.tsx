import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../../lib/api';
import ProvisioningPage from './page';

vi.mock('../../../../lib/api', () => ({
  api: {
    onboarding: {
      tpoEntitlements: vi.fn().mockResolvedValue({
        domain: 'psgtech.ac.in',
        planCode: 'INSTITUTION_PRO',
        flags: [],
      }),
      listBatches: vi.fn().mockResolvedValue([
        {
          batchId: 'batch-1',
          name: 'CSE 2026',
          code: 'CSE26',
          memberCount: 5,
          pendingInviteCount: 2,
        },
      ]),
      listBatchMembers: vi.fn().mockResolvedValue([
        {
          userId: 'active-1',
          fullName: 'Active Student',
          email: 'active@psgtech.ac.in',
          groupLabel: 'CSE-A',
          emailVerified: true,
          invitation: null,
        },
        {
          userId: 'pending-1',
          fullName: 'Pending Student',
          email: 'pending@psgtech.ac.in',
          groupLabel: 'CSE-A',
          emailVerified: false,
          invitation: { invitationId: 'inv-pending', status: 'PENDING' },
        },
      ]),
      getStudentInviteLink: vi
        .fn()
        .mockResolvedValue({ inviteUrl: 'https://auth.example/invite/x' }),
      addBatchMember: vi.fn().mockResolvedValue({
        userId: 'u1',
        fullName: 'Aarav Sharma',
        email: 'aarav@cs.psgtech.ac.in',
        groupLabel: 'CSE-A',
        invitation: { invitationId: 'inv-1' },
      }),
      resendStudentInvitation: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('ProvisioningPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders provisioning workspace and allows single candidate onboarding with group label and subdomain email', async () => {
    render(<ProvisioningPage />);

    expect(await screen.findByRole('heading', { name: /Candidate Onboarding/i })).toBeDefined();
    expect(await screen.findByText('@psgtech.ac.in')).toBeDefined();
    expect(screen.queryByText(/Create new batch/i)).toBeNull();

    const nameInput = screen.getByPlaceholderText('e.g. Aarav Sharma');
    const emailInput = screen.getByPlaceholderText('student@psgtech.ac.in');
    const groupInput = screen.getByPlaceholderText('e.g. CSE-A, Batch 2026, Section 1');

    fireEvent.change(nameInput, { target: { value: 'Aarav Sharma' } });
    fireEvent.change(emailInput, { target: { value: 'aarav@cs.psgtech.ac.in' } });
    fireEvent.change(groupInput, { target: { value: 'CSE-A' } });

    const submitBtn = screen.getByRole('button', { name: /Onboard Candidate & Send Invitation/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.onboarding.addBatchMember).toHaveBeenCalledWith('batch-1', {
        fullName: 'Aarav Sharma',
        email: 'aarav@cs.psgtech.ac.in',
        groupLabel: 'CSE-A',
      });
    });
  });

  it('shows Copy Link only for pending members, not active members', async () => {
    render(<ProvisioningPage />);

    expect(await screen.findByText('Active Student')).toBeDefined();
    expect(screen.getByText('Pending Student')).toBeDefined();

    const copyButtons = screen.getAllByRole('button', { name: /Copy Link/i });
    expect(copyButtons).toHaveLength(1);
    expect(copyButtons[0]?.closest('tr')?.textContent).toContain('Pending Student');
    expect(screen.getByText('Active Student').closest('tr')?.textContent).not.toMatch(/Copy Link/);
  });
});
