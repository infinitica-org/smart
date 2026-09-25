'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { CompanyMember, CompanyMemberRole } from '@smart/contracts';
import { Alert, ConfirmDialog, EmptyState, ErrorState, FormMessage, LoadingState } from '@smart/ui';
import { api } from '@/lib/api';
import { createKeyTracker, fieldErrorsFromError } from '@/lib/company-profile-form';
import { useCompanyAccount } from '@/lib/use-company-account';
import { Badge, Modal, PageHeader } from '../../../components/ui';
import {
  input,
  label,
  pageStack,
  primaryButton,
  secondaryButton,
  table,
  tableCell,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableShell,
} from '../../../lib/ui';

export const COMPANY_MEMBERS_QUERY_KEY = ['employer', 'members'] as const;

const ROLE_LABEL: Record<CompanyMemberRole, string> = { OWNER: 'Owner', RECRUITER: 'Recruiter' };
const STATUS_TONE = { ACTIVE: 'green', INVITED: 'amber', DEACTIVATED: 'red' } as const;

/** Server error → one readable line (last-owner, domain mismatch, etc. all carry a message). */
function messageFrom(error: unknown, fallback: string): string {
  return isSmartApiError(error) && error.message ? error.message : fallback;
}

export default function TeammatesPage() {
  const queryClient = useQueryClient();
  const { data: account } = useCompanyAccount();
  const members = useQuery({
    queryKey: COMPANY_MEMBERS_QUERY_KEY,
    queryFn: () => api.employer.listMembers(),
    retry: false,
  });

  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: '', fullName: '', allowExternalDomain: false });
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [toDeactivate, setToDeactivate] = useState<CompanyMember | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const keys = useRef(createKeyTracker());

  const list = members.data?.members ?? [];
  const self = list.find((m) => m.id === account?.userId);
  const isOwner = self?.role === 'OWNER';
  const refresh = () => queryClient.invalidateQueries({ queryKey: COMPANY_MEMBERS_QUERY_KEY });

  const inviteMutation = useMutation({
    mutationFn: () =>
      api.employer.inviteRecruiter(invite, keys.current.keyFor(`invite:${JSON.stringify(invite)}`)),
    onSuccess: async (result) => {
      keys.current.reset();
      setInviteOpen(false);
      setInvite({ email: '', fullName: '', allowExternalDomain: false });
      setInviteErrors({});
      setNotice({ tone: 'success', text: `Invitation sent to ${result.email}.` });
      await refresh();
    },
    onError: (error) => {
      const fieldErrors = fieldErrorsFromError(error);
      setInviteErrors(
        fieldErrors ?? { form: messageFrom(error, 'Could not send the invitation.') },
      );
    },
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { member: CompanyMember; role: CompanyMemberRole }) =>
      api.employer.changeMemberRole(
        vars.member.id,
        { role: vars.role },
        keys.current.keyFor(`role:${vars.member.id}:${vars.role}`),
      ),
    onSuccess: async () => {
      keys.current.reset();
      setNotice({ tone: 'success', text: 'Role updated.' });
      await refresh();
    },
    onError: (error) =>
      setNotice({ tone: 'danger', text: messageFrom(error, 'Could not update the role.') }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (member: CompanyMember) =>
      api.employer.deactivateMember(
        member.id,
        reassignTo ? { reassignToMemberId: reassignTo } : {},
        keys.current.keyFor(`deactivate:${member.id}:${reassignTo}`),
      ),
    onSuccess: async () => {
      keys.current.reset();
      setToDeactivate(null);
      setReassignTo('');
      setNotice({ tone: 'success', text: 'Teammate deactivated and signed out.' });
      await refresh();
    },
    onError: (error) =>
      setNotice({
        tone: 'danger',
        text: messageFrom(error, 'Could not deactivate this teammate.'),
      }),
  });

  const reactivateMutation = useMutation({
    mutationFn: (member: CompanyMember) =>
      api.employer.reactivateMember(member.id, keys.current.keyFor(`reactivate:${member.id}`)),
    onSuccess: async () => {
      keys.current.reset();
      setNotice({ tone: 'success', text: 'Teammate reactivated.' });
      await refresh();
    },
    onError: (error) =>
      setNotice({
        tone: 'danger',
        text: messageFrom(error, 'Could not reactivate this teammate.'),
      }),
  });

  const reassignCandidates = list.filter(
    (m) => m.status !== 'DEACTIVATED' && m.id !== toDeactivate?.id,
  );

  return (
    <div className={pageStack}>
      <PageHeader
        title="Teammates"
        description="Manage the recruiters and owners who can post jobs and review student candidates."
        actions={
          isOwner ? (
            <button type="button" onClick={() => setInviteOpen(true)} className={primaryButton}>
              <Plus className="size-4" aria-hidden />
              Invite recruiter
            </button>
          ) : null
        }
      />

      {notice ? (
        <Alert tone={notice.tone} role={notice.tone === 'danger' ? 'alert' : 'status'}>
          {notice.text}
        </Alert>
      ) : null}

      {members.isPending ? (
        <LoadingState message="Loading team members…" />
      ) : members.isError ? (
        <ErrorState
          title="Could not load your team"
          message="Check your connection and try again."
          onRetry={() => void members.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teammates yet"
          description="Invite recruiters to collaborate on job postings and candidate reviews."
          action={
            isOwner ? (
              <button type="button" onClick={() => setInviteOpen(true)} className={primaryButton}>
                Invite your first recruiter
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className={tableShell}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Name</th>
                <th className={tableHeadCell}>Role</th>
                <th className={tableHeadCell}>Status</th>
                {isOwner ? <th className={tableHeadCell}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {list.map((member) => {
                const isSelf = member.id === account?.userId;
                return (
                  <tr key={member.id} className={tableRow}>
                    <td className={tableCell}>
                      <p className="font-semibold text-[var(--ds-text)]">
                        {member.fullName}
                        {isSelf ? ' (you)' : ''}
                      </p>
                      <p className="text-[12px] text-[var(--ds-text-muted)]">{member.email}</p>
                    </td>
                    <td className={tableCell}>
                      {isOwner && member.status !== 'DEACTIVATED' ? (
                        <select
                          aria-label={`Role for ${member.fullName}`}
                          className={input}
                          value={member.role}
                          disabled={roleMutation.isPending}
                          onChange={(e) =>
                            roleMutation.mutate({
                              member,
                              role: e.target.value as CompanyMemberRole,
                            })
                          }
                        >
                          <option value="OWNER">{ROLE_LABEL.OWNER}</option>
                          <option value="RECRUITER">{ROLE_LABEL.RECRUITER}</option>
                        </select>
                      ) : (
                        ROLE_LABEL[member.role]
                      )}
                    </td>
                    <td className={tableCell}>
                      <Badge tone={STATUS_TONE[member.status]}>{member.status.toLowerCase()}</Badge>
                    </td>
                    {isOwner ? (
                      <td className={tableCell}>
                        {isSelf ? null : member.status === 'DEACTIVATED' ? (
                          <button
                            type="button"
                            className={secondaryButton}
                            disabled={reactivateMutation.isPending}
                            onClick={() => reactivateMutation.mutate(member)}
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={secondaryButton}
                            onClick={() => {
                              setReassignTo('');
                              deactivateMutation.reset();
                              setToDeactivate(member);
                            }}
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={inviteOpen} title="Invite recruiter" onClose={() => setInviteOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setInviteErrors({});
            inviteMutation.mutate();
          }}
          className="space-y-4"
          noValidate
        >
          <FormMessage error={inviteErrors.form} />
          <div>
            <label htmlFor="invite-name" className={label}>
              Full name
            </label>
            <input
              id="invite-name"
              className={input}
              value={invite.fullName}
              onChange={(e) => setInvite({ ...invite, fullName: e.target.value })}
            />
            <FormMessage error={inviteErrors.fullName} />
          </div>
          <div>
            <label htmlFor="invite-email" className={label}>
              Work email
            </label>
            <input
              id="invite-email"
              type="email"
              className={input}
              placeholder="colleague@yourcompany.com"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            />
            <FormMessage error={inviteErrors.email} />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={invite.allowExternalDomain}
              onChange={(e) => setInvite({ ...invite, allowExternalDomain: e.target.checked })}
            />
            Allow an email outside our company domain
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setInviteOpen(false)} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" className={primaryButton} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDeactivate !== null}
        onClose={() => setToDeactivate(null)}
        onConfirm={() => {
          if (toDeactivate) deactivateMutation.mutate(toDeactivate);
        }}
        title={`Deactivate ${toDeactivate?.fullName ?? 'teammate'}?`}
        variant="danger"
        confirmText="Deactivate"
        isLoading={deactivateMutation.isPending}
        error={
          deactivateMutation.isError
            ? messageFrom(deactivateMutation.error, 'Could not deactivate this teammate.')
            : null
        }
        description={
          <div className="space-y-3">
            <p>
              They will be signed out everywhere and lose access to your company right away. You can
              reactivate them later.
            </p>
            {reassignCandidates.length > 0 ? (
              <div>
                <label htmlFor="reassign" className={label}>
                  Hand over their open candidates and conversations to
                </label>
                <select
                  id="reassign"
                  className={input}
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                >
                  <option value="">Choose a teammate (optional)</option>
                  {reassignCandidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
