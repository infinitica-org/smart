import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { StaffManagementWorkspace } from './StaffManagementWorkspace';
import { staffApi } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  staffApi: {
    list: vi.fn(),
    invite: vi.fn(),
    updateRole: vi.fn(),
    deactivateAccess: vi.fn(),
    updateCampus: vi.fn(),
  },
}));

describe('StaffManagementWorkspace', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders staff list after loading', async () => {
    vi.mocked(staffApi.list).mockResolvedValue([
      {
        userId: 'usr_1',
        fullName: 'Dr. Sarah Connor',
        email: 'sarah@university.edu',
        role: 'INSTITUTION_ADMIN',
        groupLabel: 'Administration',
        inviteStatus: 'ACCEPTED',
        lastSentAt: null,
        acceptedAt: '2026-01-15T00:00:00.000Z',
        createdAt: '2026-01-15T00:00:00.000Z',
      },
    ]);

    render(<StaffManagementWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Dr. Sarah Connor')).toBeDefined();
    });

    expect(screen.getByText('sarah@university.edu')).toBeDefined();
  });

  it('renders empty state when no staff members exist', async () => {
    vi.mocked(staffApi.list).mockResolvedValue([]);

    render(<StaffManagementWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('No staff members found')).toBeDefined();
    });
  });

  it('opens invite modal and submits new invitation', async () => {
    vi.mocked(staffApi.list).mockResolvedValue([]);
    vi.mocked(staffApi.invite).mockResolvedValue({
      userId: 'usr_2',
      fullName: 'Alex Vance',
      email: 'alex@university.edu',
      role: 'PLACEMENT_STAFF',
      groupLabel: 'CS Dept',
      inviteStatus: 'PENDING',
      lastSentAt: null,
      acceptedAt: null,
      createdAt: new Date().toISOString(),
    });

    render(<StaffManagementWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('No staff members found')).toBeDefined();
    });

    const inviteButtons = screen.getAllByRole('button', { name: /Invite/i });
    if (inviteButtons[0]) fireEvent.click(inviteButtons[0]);

    expect(screen.getByText('Invite Staff Member')).toBeDefined();

    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: 'Vance' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'alex@university.edu' },
    });
    fireEvent.change(screen.getByLabelText(/Department/i), {
      target: { value: 'CS Dept' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Invitation/i }));

    await waitFor(() => {
      expect(staffApi.invite).toHaveBeenCalledWith({
        firstName: 'Alex',
        lastName: 'Vance',
        email: 'alex@university.edu',
        role: 'PLACEMENT_STAFF',
        department: 'CS Dept',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Invitation sent successfully to alex@university.edu/i),
      ).toBeDefined();
    });
  });

  it('updates staff role when selection changes', async () => {
    const member = {
      userId: 'usr_101',
      fullName: 'Dr. Sarah Connor',
      email: 'sarah@university.edu',
      role: 'PLACEMENT_STAFF' as const,
      groupLabel: 'Administration',
      inviteStatus: 'ACCEPTED' as const,
      lastSentAt: null,
      acceptedAt: '2026-01-15T00:00:00.000Z',
      createdAt: '2026-01-15T00:00:00.000Z',
    };
    vi.mocked(staffApi.list).mockResolvedValue([member]);
    vi.mocked(staffApi.updateRole).mockResolvedValue({
      ...member,
      role: 'INSTITUTION_ADMIN',
    });

    render(<StaffManagementWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Dr. Sarah Connor')).toBeDefined();
    });

    const roleSelect = screen.getByRole('combobox', { name: /Role for Dr. Sarah Connor/i });
    fireEvent.change(roleSelect, { target: { value: 'INSTITUTION_ADMIN' } });

    await waitFor(() => {
      expect(staffApi.updateRole).toHaveBeenCalledWith('usr_101', 'INSTITUTION_ADMIN');
    });

    await waitFor(() => {
      expect(screen.getByText(/Role for Dr. Sarah Connor updated to Administrator/i)).toBeDefined();
    });
  });

  it('handles role update error gracefully without losing UI state', async () => {
    const member = {
      userId: 'usr_102',
      fullName: 'Officer Bob',
      email: 'bob@university.edu',
      role: 'PLACEMENT_STAFF' as const,
      groupLabel: 'Administration',
      inviteStatus: 'ACCEPTED' as const,
      lastSentAt: null,
      acceptedAt: '2026-01-15T00:00:00.000Z',
      createdAt: '2026-01-15T00:00:00.000Z',
    };
    vi.mocked(staffApi.list).mockResolvedValue([member]);
    vi.mocked(staffApi.updateRole).mockRejectedValue(new Error('Network failure'));

    render(<StaffManagementWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Officer Bob')).toBeDefined();
    });

    const roleSelect = screen.getByRole('combobox', { name: /Role for Officer Bob/i });
    fireEvent.change(roleSelect, { target: { value: 'INSTITUTION_ADMIN' } });

    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeDefined();
    });
  });

  it('opens confirmation modal and deactivates staff access', async () => {
    const member = {
      userId: 'usr_201',
      fullName: 'Officer Dave',
      email: 'dave@university.edu',
      role: 'PLACEMENT_STAFF' as const,
      groupLabel: 'Placement Cell',
      inviteStatus: 'ACCEPTED' as const,
      lastSentAt: null,
      acceptedAt: '2026-01-15T00:00:00.000Z',
      heldAt: null,
      createdAt: '2026-01-15T00:00:00.000Z',
    };
    vi.mocked(staffApi.list).mockResolvedValue([member]);
    vi.mocked(staffApi.deactivateAccess).mockResolvedValue({
      ...member,
      heldAt: new Date().toISOString(),
    });

    render(<StaffManagementWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Officer Dave')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Deactivate Access/i }));

    expect(screen.getByText(/Deactivate Staff Access\?/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Confirm Deactivate Access/i }));

    await waitFor(() => {
      expect(staffApi.deactivateAccess).toHaveBeenCalledWith('usr_201');
    });

    await waitFor(() => {
      expect(screen.getByText(/Staff access deactivated for Officer Dave/i)).toBeDefined();
    });
  });

  it('opens campus modal and updates campus restriction', async () => {
    const member = {
      userId: 'usr_301',
      fullName: 'Officer Amy',
      email: 'amy@university.edu',
      role: 'PLACEMENT_STAFF' as const,
      groupLabel: null,
      inviteStatus: 'ACCEPTED' as const,
      lastSentAt: null,
      acceptedAt: '2026-01-15T00:00:00.000Z',
      heldAt: null,
      createdAt: '2026-01-15T00:00:00.000Z',
    };
    vi.mocked(staffApi.list).mockResolvedValue([member]);
    vi.mocked(staffApi.updateCampus).mockResolvedValue({
      ...member,
      groupLabel: 'North Campus',
    });

    render(<StaffManagementWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Officer Amy')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Edit Campus/i }));

    expect(screen.getByText(/Edit Staff Campus Restriction/i)).toBeDefined();

    const input = screen.getByLabelText(/Campus \/ Department Scope/i);
    fireEvent.change(input, { target: { value: 'North Campus' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Campus Restriction/i }));

    await waitFor(() => {
      expect(staffApi.updateCampus).toHaveBeenCalledWith('usr_301', 'North Campus');
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Campus access for Officer Amy restricted to North Campus/i),
      ).toBeDefined();
    });
  });

  it('clears campus restriction when Clear button is clicked', async () => {
    const member = {
      userId: 'usr_302',
      fullName: 'Officer Bob',
      email: 'bob@university.edu',
      role: 'PLACEMENT_STAFF' as const,
      groupLabel: 'Main Campus',
      inviteStatus: 'ACCEPTED' as const,
      lastSentAt: null,
      acceptedAt: '2026-01-15T00:00:00.000Z',
      heldAt: null,
      createdAt: '2026-01-15T00:00:00.000Z',
    };
    vi.mocked(staffApi.list).mockResolvedValue([member]);
    vi.mocked(staffApi.updateCampus).mockResolvedValue({
      ...member,
      groupLabel: null,
    });

    render(<StaffManagementWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Officer Bob')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Edit Campus/i }));

    fireEvent.click(screen.getByRole('button', { name: /Clear \(All Campuses\)/i }));

    await waitFor(() => {
      expect(staffApi.updateCampus).toHaveBeenCalledWith('usr_302', null);
    });
  });
});
