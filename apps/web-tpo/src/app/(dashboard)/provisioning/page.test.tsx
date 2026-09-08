import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../lib/api';
import ProvisioningPage from './page';

vi.mock('../../../lib/api', () => ({
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
      listBatchMembers: vi.fn().mockResolvedValue([]),
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

    expect(
      await screen.findByRole('heading', { name: /Candidate Onboarding Workspace/i }),
    ).toBeDefined();
    expect(screen.getByText('@psgtech.ac.in')).toBeDefined();

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
});
