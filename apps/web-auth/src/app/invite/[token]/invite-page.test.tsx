import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import InvitePage from './page';
import { api, storeSession } from '../../../lib/api';

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'mock_token_123' }),
}));

vi.mock('../../../lib/api', () => ({
  api: {
    auth: {
      previewInvitation: vi.fn(),
      acceptInvitation: vi.fn(),
    },
  },
  storeSession: vi.fn(),
  redirectForRole: vi.fn(),
}));

describe('InvitePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.auth.previewInvitation).mockReturnValue(new Promise(() => {})); // Never resolves

    render(<InvitePage />);

    expect(screen.getByText(/Verifying your invitation link/i)).toBeDefined();
  });

  it('renders activation form for valid invitation', async () => {
    vi.mocked(api.auth.previewInvitation).mockResolvedValue({
      fullName: 'Dr. Sarah Connor',
      email: 'sarah@university.edu',
      role: 'INSTITUTION_ADMIN',
      institutionName: 'State University',
      batchName: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: 'PENDING',
    });

    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByText(/Activate Your Account/i)).toBeDefined();
    });

    expect(screen.getByText(/Dr. Sarah Connor/i)).toBeDefined();
    expect(screen.getByText(/sarah@university.edu/i)).toBeDefined();
  });

  it('handles password mismatch and submits activation successfully', async () => {
    vi.mocked(api.auth.previewInvitation).mockResolvedValue({
      fullName: 'Alex Vance',
      email: 'alex@university.edu',
      role: 'PLACEMENT_STAFF',
      institutionName: 'City Tech',
      batchName: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: 'PENDING',
    });

    vi.mocked(api.auth.acceptInvitation).mockResolvedValue({
      accessToken: 'acc_token_xyz',
      tokenType: 'Bearer',
      expiresInSeconds: 3600,
      user: {
        userId: 'usr_123',
        email: 'alex@university.edu',
        fullName: 'Alex Vance',
        role: 'PLACEMENT_STAFF',
      } as never,
    });

    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByText(/Activate Your Account/i)).toBeDefined();
    });

    const passInput = screen.getByLabelText(/Create Password/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);

    // Enter mismatching passwords
    fireEvent.change(passInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Activate Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeDefined();
    });

    // Enter matching passwords
    fireEvent.change(confirmInput, { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Activate Account/i }));

    await waitFor(() => {
      expect(api.auth.acceptInvitation).toHaveBeenCalledWith('mock_token_123', {
        password: 'Password123!',
      });
    });

    expect(storeSession).toHaveBeenCalledWith('acc_token_xyz');
  });

  it('displays "Already Activated" state when status is ACCEPTED', async () => {
    vi.mocked(api.auth.previewInvitation).mockResolvedValue({
      fullName: 'John Smith',
      email: 'john@university.edu',
      role: 'PLACEMENT_STAFF',
      institutionName: 'State University',
      batchName: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: 'ACCEPTED',
    });

    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByText(/Account Already Activated/i)).toBeDefined();
    });

    expect(screen.getByRole('link', { name: /Sign In to SMART/i })).toBeDefined();
  });

  it('displays expired error message when link is invalid/expired', async () => {
    vi.mocked(api.auth.previewInvitation).mockRejectedValue(
      new Error('This invitation has expired.'),
    );

    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByText(/Invitation Invalid or Expired/i)).toBeDefined();
    });
  });
});
