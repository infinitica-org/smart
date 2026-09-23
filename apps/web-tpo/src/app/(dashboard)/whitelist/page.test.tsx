import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../lib/api';
import WhitelistPage from './page';

vi.mock('../../../lib/api', () => ({
  api: {
    auth: {
      me: vi.fn().mockResolvedValue({ inst: '11111111-1111-4111-8111-111111111111' }),
    },
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
        invitation: { invitationId: 'inv-1' },
      }),
      resendStudentInvitation: vi.fn().mockResolvedValue({ success: true }),
      sendBatchInvites: vi.fn().mockResolvedValue({ enqueued: 1 }),
    },
  },
}));

describe('WhitelistPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders upload workspace without candidates sub-nav items', async () => {
    render(<WhitelistPage />);
    expect(await screen.findByRole('heading', { name: /^Whitelist$/i })).toBeDefined();
    expect(screen.queryByRole('link', { name: /^Candidates Repository$/i })).toBeNull();
  });

  it('bulk paste validates and provisions valid emails', async () => {
    render(<WhitelistPage />);
    await screen.findByRole('heading', { name: /^Whitelist$/i });
    fireEvent.click(screen.getByRole('button', { name: /Bulk whitelist upload/i }));
    fireEvent.change(screen.getByPlaceholderText(/student1@psgtech/i), {
      target: { value: 'good@psgtech.ac.in\nbad@other.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Validate Emails/i }));
    expect(await screen.findByText('Valid Domain')).toBeDefined();
    expect(screen.getByText('Invalid Domain')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Onboard 1 Valid Candidate/i }));
    await waitFor(() => {
      expect(api.onboarding.addBatchMember).toHaveBeenCalledWith(
        'batch-1',
        expect.objectContaining({ email: 'good@psgtech.ac.in' }),
      );
    });
  });

  it('submits single candidate upload', async () => {
    render(<WhitelistPage />);
    await screen.findByRole('heading', { name: /^Whitelist$/i });
    fireEvent.change(screen.getByPlaceholderText('e.g. Aarav Sharma'), {
      target: { value: 'Aarav Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText('student@psgtech.ac.in'), {
      target: { value: 'aarav@cs.psgtech.ac.in' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Onboard Candidate & Send Invitation/i }));
    await waitFor(() => {
      expect(api.onboarding.addBatchMember).toHaveBeenCalled();
    });
  });
});
