'use client';

import { useState } from 'react';
import {
  INSTITUTION_STAFF_ROLES,
  type InstitutionAdminDto,
  type InstitutionStaffRole,
} from '@smart/contracts';
import { describeApiError } from '@smart/api-client';
import { Button } from '@smart/ui/button';
import {
  AdminInput,
  DataTable,
  Field,
  NativeSelect,
  StatusBadge,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

const ROLE_LABELS: Record<InstitutionStaffRole, string> = {
  INSTITUTION_ADMIN: 'TPO admin',
  PLACEMENT_STAFF: 'Placement staff',
};

function isStaffRole(role: string | undefined): role is InstitutionStaffRole {
  return (INSTITUTION_STAFF_ROLES as readonly string[]).includes(role ?? '');
}

/** Institution staff with role changes (#169) and access hold / release (#171). */
export function StaffTable({
  staff,
  onChanged,
  onMessage,
  onError,
}: {
  staff: InstitutionAdminDto[];
  onChanged: () => Promise<void>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function run(
    userId: string,
    action: () => Promise<unknown>,
    done: string,
  ): Promise<boolean> {
    setBusyUserId(userId);
    try {
      await action();
      onMessage(done);
      await onChanged();
      return true;
    } catch (err) {
      onError(describeApiError(err, 'Could not update this staff member.'));
      return false;
    } finally {
      setBusyUserId(null);
    }
  }

  function changeRole(member: InstitutionAdminDto, role: InstitutionStaffRole) {
    const label = ROLE_LABELS[role];
    if (!window.confirm(`Make ${member.fullName} ${label}? They will be signed out everywhere.`)) {
      return;
    }
    void run(
      member.userId,
      () => api.onboarding.assignUserRole(member.userId, { role }),
      `${member.fullName} is now ${label}.`,
    );
  }

  function toggleHold(member: InstitutionAdminDto) {
    if (reason.trim().length < 8) {
      onError('Enter a reason of at least 8 characters to hold or release a staff member.');
      return;
    }
    const body = { reason: reason.trim() };
    void run(
      member.userId,
      () =>
        member.heldAt
          ? api.onboarding.releaseUserHold(member.userId, body)
          : api.onboarding.holdUser(member.userId, body),
      member.heldAt
        ? `${member.fullName} can sign in again.`
        : `${member.fullName} is on hold and has been signed out.`,
    ).then((ok) => {
      if (ok) setReason('');
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Reason for hold / release (required, 8+ characters)">
        <AdminInput
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Left the placement cell"
        />
      </Field>
      <DataTable headers={['Staff member', 'Email', 'Role', 'Access', '']}>
        {staff.map((member) => {
          const busy = busyUserId === member.userId;
          return (
            <TableRow key={member.userId}>
              <TableCell className="font-medium">{member.fullName}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                {isStaffRole(member.role) ? (
                  <NativeSelect
                    aria-label={`Role for ${member.fullName}`}
                    value={member.role}
                    disabled={busy}
                    onChange={(e) => changeRole(member, e.target.value as InstitutionStaffRole)}
                  >
                    {INSTITUTION_STAFF_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                {member.heldAt ? (
                  <>
                    <StatusBadge status="On hold" />
                    {member.heldReason ? (
                      <div className="mt-1 text-xs text-muted-foreground">{member.heldReason}</div>
                    ) : null}
                  </>
                ) : member.emailVerified ? (
                  <StatusBadge status="Active" />
                ) : (
                  (member.invitation?.status ?? '—')
                )}
              </TableCell>
              <TableCell className="space-x-2 text-right">
                {member.invitation?.status === 'PENDING' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      const invitationId = member.invitation?.invitationId;
                      if (invitationId) {
                        void run(
                          member.userId,
                          () => api.onboarding.resendAdminInvitation(invitationId),
                          'Invitation resent.',
                        );
                      }
                    }}
                  >
                    Resend
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => toggleHold(member)}
                >
                  {member.heldAt ? 'Release' : 'Hold'}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>
    </div>
  );
}
