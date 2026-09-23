import { useState, useEffect } from 'react';
import { UserPlus, Users, RefreshCw, MailCheck, AlertCircle, UserX, Building } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  ErrorState,
  FormItem,
  FormLabel,
  Input,
  LoadingState,
  Modal,
  StatusBadge,
} from '@smart/ui';
import type { InviteStaffRequest, StaffMemberDto, StaffRole } from '@smart/contracts';
import { staffApi } from '../../lib/api';
import { InviteStaffModal } from './InviteStaffModal';

export function StaffManagementWorkspace() {
  const [staffList, setStaffList] = useState<StaffMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [roleUpdateError, setRoleUpdateError] = useState<{
    userId: string;
    message: string;
  } | null>(null);

  const [deactivatingMember, setDeactivatingMember] = useState<StaffMemberDto | null>(null);
  const [deactivatingSubmitting, setDeactivatingSubmitting] = useState(false);

  const [campusMember, setCampusMember] = useState<StaffMemberDto | null>(null);
  const [campusInput, setCampusInput] = useState('');
  const [campusSubmitting, setCampusSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    setLoading(true);
    setError(null);
    try {
      const res = await staffApi.list();
      setStaffList(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load university staff members.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteStaff(payload: InviteStaffRequest) {
    const created = await staffApi.invite(payload);
    setStaffList((prev) => [created, ...prev.filter((item) => item.userId !== created.userId)]);
    setSuccessToast(`Invitation sent successfully to ${payload.email}`);
    setTimeout(() => setSuccessToast(null), 5000);
  }

  async function handleRoleChange(member: StaffMemberDto, newRole: StaffRole) {
    if (member.role === newRole) return;
    setUpdatingUserId(member.userId);
    setRoleUpdateError(null);
    try {
      const updated = await staffApi.updateRole(member.userId, newRole);
      setStaffList((prev) => prev.map((item) => (item.userId === updated.userId ? updated : item)));
      const roleTitle = newRole === 'INSTITUTION_ADMIN' ? 'Administrator' : 'Advisor';
      setSuccessToast(`Role for ${member.fullName} updated to ${roleTitle}`);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update staff role. Please try again.';
      setRoleUpdateError({ userId: member.userId, message: msg });
    } finally {
      setUpdatingUserId(null);
    }
  }

  function openCampusModal(member: StaffMemberDto) {
    setCampusMember(member);
    setCampusInput(member.groupLabel ?? '');
  }

  async function handleSaveCampus(campusValue: string | null) {
    if (!campusMember) return;
    setCampusSubmitting(true);
    setRoleUpdateError(null);
    try {
      const updated = await staffApi.updateCampus(campusMember.userId, campusValue);
      setStaffList((prev) => prev.map((item) => (item.userId === updated.userId ? updated : item)));
      const label = updated.groupLabel
        ? `restricted to ${updated.groupLabel}`
        : 'set to All Campuses / Not restricted';
      setSuccessToast(`Campus access for ${campusMember.fullName} ${label}`);
      setCampusMember(null);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update campus access. Please try again.';
      setRoleUpdateError({ userId: campusMember.userId, message: msg });
    } finally {
      setCampusSubmitting(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingMember) return;
    setDeactivatingSubmitting(true);
    setRoleUpdateError(null);
    try {
      const updated = await staffApi.deactivateAccess(deactivatingMember.userId);
      setStaffList((prev) => prev.map((item) => (item.userId === updated.userId ? updated : item)));
      setSuccessToast(`Staff access deactivated for ${deactivatingMember.fullName}`);
      setDeactivatingMember(null);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to deactivate staff access. Please try again.';
      setRoleUpdateError({ userId: deactivatingMember.userId, message: msg });
    } finally {
      setDeactivatingSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successToast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <MailCheck className="size-4 shrink-0 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-100"
          >
            &times;
          </button>
        </div>
      ) : null}

      {/* Role Update / Action Error Banner */}
      {roleUpdateError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-red-600" />
            <span>{roleUpdateError.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setRoleUpdateError(null)}
            className="text-red-600 hover:text-red-900 dark:hover:text-red-100"
          >
            &times;
          </button>
        </div>
      ) : null}

      {/* Header Section */}
      <Card variant="bordered">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="size-5 text-[var(--ds-primary)]" />
              <h2 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">
                University Staff Management
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
              Invite staff members, assign roles, and manage access permissions for your university.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 !bg-zinc-900 !text-white hover:!bg-black font-semibold shadow-xs"
          >
            <UserPlus className="size-4" />
            Invite Staff
          </Button>
        </CardHeader>
      </Card>

      {/* Roster & Content Area */}
      {loading ? (
        <LoadingState message="Loading university staff roster..." />
      ) : error ? (
        <ErrorState title="Unable to load staff members" message={error} onRetry={fetchStaff} />
      ) : staffList.length === 0 ? (
        <Card variant="bordered" className="p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]">
            <Users className="size-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-[var(--ds-text)]">
            No staff members found
          </h3>
          <p className="mt-1 text-xs text-[var(--ds-text-muted)] max-w-sm mx-auto">
            You haven't invited any placement officers or administrators yet. Click below to send
            your first invitation.
          </p>
          <div className="mt-5">
            <Button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 !bg-zinc-900 !text-white hover:!bg-black font-semibold shadow-xs"
            >
              <UserPlus className="size-4" />
              Invite First Staff Member
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="bordered">
          <CardHeader className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-3">
            <h3 className="text-xs font-semibold text-[var(--ds-text)]">
              Staff Members & Pending Invites ({staffList.length})
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={fetchStaff}>
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] font-semibold">
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Assigned Role</th>
                  <th className="px-4 py-3">Campus Access</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date Added</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                {staffList.map((member) => {
                  const isUpdating = updatingUserId === member.userId;
                  const isDeactivated = Boolean(member.heldAt);
                  return (
                    <tr
                      key={member.userId}
                      className="hover:bg-[var(--ds-surface-hover)] transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--ds-text)]">
                        {member.fullName}
                      </td>
                      <td className="px-4 py-3 text-[var(--ds-text-muted)]">{member.email}</td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Role for ${member.fullName}`}
                          value={member.role}
                          disabled={isUpdating || isDeactivated}
                          onChange={(e) => handleRoleChange(member, e.target.value as StaffRole)}
                          className="rounded-lg border border-[var(--ds-border,var(--surface-border))] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 focus:border-[var(--brand)] disabled:opacity-50"
                        >
                          <option value="PLACEMENT_STAFF">Placement Officer (Advisor)</option>
                          <option value="INSTITUTION_ADMIN">
                            Institution Admin (Administrator)
                          </option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-[var(--ds-text-muted)]">
                        {member.groupLabel ? (
                          <span className="inline-flex items-center gap-1 font-medium text-[var(--ds-text)]">
                            <Building className="size-3 text-[var(--ds-primary)] shrink-0" />
                            {member.groupLabel}
                          </span>
                        ) : (
                          <span className="text-[var(--ds-text-muted)] italic">All Campuses</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isDeactivated ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
                            <UserX className="size-3" /> Deactivated
                          </span>
                        ) : (
                          <StatusBadge
                            status={member.inviteStatus === 'ACCEPTED' ? 'active' : 'pending'}
                            label={member.inviteStatus ?? 'ACCEPTED'}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--ds-text-muted)]">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isDeactivated ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => openCampusModal(member)}
                            >
                              Edit Campus
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => setDeactivatingMember(member)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                              Deactivate Access
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--ds-text-muted)] italic">
                            Access Revoked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Edit Campus Access Modal */}
      <Modal
        open={Boolean(campusMember)}
        onClose={() => setCampusMember(null)}
        title="Edit Staff Campus Restriction"
        description={
          campusMember
            ? `Restrict ${campusMember.fullName} (${campusMember.email}) to a specific campus or department scope.`
            : ''
        }
        size="md"
      >
        <div className="space-y-4 pt-2">
          <FormItem>
            <FormLabel htmlFor="campusInput">Campus / Department Scope</FormLabel>
            <Input
              id="campusInput"
              type="text"
              value={campusInput}
              onChange={(e) => setCampusInput(e.target.value)}
              placeholder="e.g. Main Campus, North Branch, CS Dept"
              disabled={campusSubmitting}
            />
            <p className="text-[11px] text-[var(--ds-text-muted)] mt-1">
              Leave blank or click Clear to allow access across all university campuses.
            </p>
          </FormItem>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--ds-border-subtle)] mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={campusSubmitting}
              onClick={() => handleSaveCampus(null)}
              className="text-amber-700 hover:text-amber-800 dark:text-amber-400"
            >
              Clear (All Campuses)
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCampusMember(null)}
                disabled={campusSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                isLoading={campusSubmitting}
                onClick={() => handleSaveCampus(campusInput.trim() || null)}
                className="!bg-zinc-900 !text-white hover:!bg-black font-semibold shadow-xs"
              >
                Save Campus Restriction
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Deactivate Access Confirmation Modal */}
      <Modal
        open={Boolean(deactivatingMember)}
        onClose={() => setDeactivatingMember(null)}
        title="Deactivate Staff Access?"
        description={
          deactivatingMember
            ? `Are you sure you want to deactivate portal access for ${deactivatingMember.fullName} (${deactivatingMember.email})? They will no longer be able to sign in. The staff record and historical data will be retained.`
            : ''
        }
        size="md"
      >
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--ds-border-subtle)] mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeactivatingMember(null)}
            disabled={deactivatingSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={deactivatingSubmitting}
            onClick={handleConfirmDeactivate}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
          >
            Confirm Deactivate Access
          </Button>
        </div>
      </Modal>

      {/* Invite Modal */}
      <InviteStaffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onInvite={handleInviteStaff}
      />
    </div>
  );
}
