'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import type { BatchMemberDto, BatchDto } from '@smart/contracts';
import { TpoBentoPageHeader } from '../../../../../components/tpo-bento/TpoBentoPageHeader';
import { BatchImportWizard } from '../../../../../components/batch-import-wizard';
import { api } from '../../../../../lib/api';
import { validateDomain } from '../../../../../lib/domain-validation';
import {
  bentoCardClass,
  bentoChipClass,
  bentoCompactCardClass,
  candidatesPageStackClass,
  bentoTableBodyRowClass,
  bentoTableCellClass,
  bentoTableClass,
  bentoTableHeadCellClass,
  bentoTableHeadRowClass,
  bentoTableShellClass,
  dashboardErrorNoticeClass,
  dashboardMintBadgeClass,
  dashboardPendingBadgeClass,
  dashboardPrimaryButtonClass,
  dashboardRoseBadgeClass,
  dashboardSuccessNoticeClass,
} from '../../../../../lib/tpo-dashboard-ui';
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
  secondaryButtonSmClass,
} from '../../../../../lib/tpo-ui';
import {
  ArrowLeft,
  Edit3,
  UserPlus,
  Users,
  X,
  ShieldCheck,
  Ban,
  Clock,
  CheckCircle,
  Loader2,
  RefreshCw,
  RotateCcw,
  Copy,
} from 'lucide-react';

function safeMsg(err: unknown, fallback: string): string {
  if (isSmartApiError(err)) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function BatchDetailPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = params.batchId;
  const [batch, setBatch] = useState<BatchDto | null>(null);
  const [members, setMembers] = useState<BatchMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [batchData, membersData] = await Promise.all([
        api.onboarding.getBatch(batchId),
        api.onboarding.listBatchMembers(batchId),
      ]);
      setBatch(batchData);
      setMembers(membersData);
      setEditName(batchData.name);
      setEditCode(batchData.code ?? '');
    } catch (caught) {
      setError(safeMsg(caught, 'Failed to load batch or members.'));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Auto-dismiss notifications after 5s ──
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  async function onSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.onboarding.updateBatch(batchId, {
        name: editName,
        code: editCode || null,
      });
      setIsEditing(false);
      setMessage('Batch updated successfully.');
      await load();
    } catch (caught) {
      setError(safeMsg(caught, 'Could not update batch.'));
    }
  }

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMemberSubmitting(true);
    try {
      const entitlements = await api.onboarding.tpoEntitlements().catch(() => null);
      const domain = entitlements?.domain?.trim().toLowerCase();
      const trimmedEmail = email.trim().toLowerCase();
      if (!domain || !validateDomain(trimmedEmail, domain)) {
        setError(
          `Email address must belong to domain @${domain ?? '(unavailable)'} or one of its subdomains.`,
        );
        setMemberSubmitting(false);
        return;
      }

      const newMember = await api.onboarding.addBatchMember(batchId, {
        fullName: fullName.trim(),
        email: trimmedEmail,
        groupLabel: groupLabel.trim() || undefined,
      });
      let sendError: string | null = null;
      if (newMember.invitation?.invitationId) {
        try {
          await api.onboarding.resendStudentInvitation(newMember.invitation.invitationId);
        } catch (caught: unknown) {
          sendError = safeMsg(caught, 'Email delivery failed');
        }
      }
      setFullName('');
      setEmail('');
      setGroupLabel('');
      setIsAddingMember(false);
      if (sendError) {
        setError(
          `Member added to batch, but invitation email delivery failed: ${sendError}. You can retry using "Resend" or use "Copy Link" in the member list.`,
        );
      } else {
        setMessage('Member added and invitation sent.');
      }
      await load();
    } catch (caught) {
      setError(safeMsg(caught, 'Could not add member.'));
    } finally {
      setMemberSubmitting(false);
    }
  }

  async function onCopyLink(userId: string) {
    setActionLoadingId(`copy-${userId}`);
    setError(null);
    try {
      const { inviteUrl } = await api.onboarding.getStudentInviteLink(userId);
      await navigator.clipboard.writeText(inviteUrl);
      setMessage('Candidate invite link copied to clipboard.');
    } catch (caught) {
      setError(safeMsg(caught, 'Could not generate invite link.'));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function onResend(invitationId: string) {
    setActionLoadingId(`resend-${invitationId}`);
    setError(null);
    try {
      await api.onboarding.resendStudentInvitation(invitationId);
      setMessage('Invitation resent.');
      await load();
    } catch (caught) {
      setError(safeMsg(caught, 'Could not resend invitation.'));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function onRevoke(invitationId: string) {
    setActionLoadingId(`revoke-${invitationId}`);
    setError(null);
    try {
      await api.onboarding.revokeStudentInvitation(invitationId);
      setMessage('Invitation revoked.');
      await load();
    } catch (caught) {
      setError(safeMsg(caught, 'Could not revoke invitation.'));
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className={candidatesPageStackClass}>
      <Link
        href="/batches"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ds-text-muted)] transition-colors hover:text-[var(--ds-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All batches
      </Link>

      {loading && !batch ? (
        <div className="flex items-center gap-2 py-6 text-[var(--ds-text-muted)]">
          <Loader2 className="size-4 animate-spin" /> Loading batch…
        </div>
      ) : batch ? (
        <TpoBentoPageHeader
          compact
          title={batch.name}
          description={`${batch.memberCount} members · ${batch.pendingInviteCount} pending invites`}
          icon={Users}
          accent="blue"
          badge={<span className={bentoChipClass}>{batch.code ?? 'No code'}</span>}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={secondaryButtonClass}
              >
                <Edit3 className="size-4" aria-hidden /> Edit batch
              </button>
              <button
                type="button"
                onClick={() => setIsAddingMember(true)}
                className={dashboardPrimaryButtonClass}
              >
                <UserPlus className="size-4" aria-hidden /> Add member
              </button>
            </div>
          }
        />
      ) : null}

      {error ? (
        <div className={`${dashboardErrorNoticeClass} flex items-start gap-3`} role="alert">
          <Ban className="size-5 shrink-0" aria-hidden />
          <p className="flex-1 text-sm">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-[#9f1239]">
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      {message ? (
        <div className={`${dashboardSuccessNoticeClass} flex items-start gap-3`}>
          <CheckCircle className="size-5 shrink-0" aria-hidden />
          <p className="flex-1 text-sm">{message}</p>
          <button type="button" onClick={() => setMessage(null)} className="text-[#047857]">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className={`${bentoCompactCardClass} [&_.min-h-56]:min-h-40 [&_.p-8]:p-5`}>
        <h2 className="text-sm font-semibold text-[var(--ds-text)]">Bulk import (CSV / XLSX)</h2>
        <p className="mt-1 text-[12px] text-[var(--ds-text-muted)]">
          Upload a roster to add multiple candidates to this batch at once.
        </p>
        <div className="mt-3">
          <BatchImportWizard batchId={batchId} onComplete={() => void load()} />
        </div>
      </div>

      <div className={bentoTableShellClass}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--ds-text)]">Batch members</h2>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={`${secondaryButtonSmClass} !px-2 !py-2`}
            title="Refresh"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className={bentoTableClass}>
            <thead>
              <tr className={bentoTableHeadRowClass}>
                <th className={bentoTableHeadCellClass}>Name</th>
                <th className={bentoTableHeadCellClass}>Email</th>
                <th className={bentoTableHeadCellClass}>Group</th>
                <th className={bentoTableHeadCellClass}>Invite status</th>
                <th className={bentoTableHeadCellClass}>Access</th>
                <th className={`${bentoTableHeadCellClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`${bentoTableCellClass} py-10 text-center`}>
                    <Loader2 className="inline size-4 animate-spin" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${bentoTableCellClass} py-10 text-center`}>
                    No members in this batch yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.userId} className={bentoTableBodyRowClass}>
                    <td className={bentoTableCellClass}>
                      <div className="font-semibold text-[var(--ds-text)]">{member.fullName}</div>
                    </td>
                    <td className={bentoTableCellClass}>{member.email}</td>
                    <td className={bentoTableCellClass}>
                      <span className={bentoChipClass}>{member.groupLabel ?? '—'}</span>
                    </td>
                    <td className={bentoTableCellClass}>
                      {member.emailVerified ? (
                        <span className={dashboardMintBadgeClass}>
                          <CheckCircle className="size-3" /> Accepted
                        </span>
                      ) : (
                        <span className={dashboardPendingBadgeClass}>
                          <Clock className="size-3" /> {member.invitation?.status ?? 'Pending'}
                        </span>
                      )}
                    </td>
                    <td className={bentoTableCellClass}>
                      {member.heldAt ? (
                        <span className={dashboardRoseBadgeClass}>
                          <Ban className="size-3" /> On hold
                        </span>
                      ) : (
                        <span className={dashboardMintBadgeClass}>
                          <ShieldCheck className="size-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className={`${bentoTableCellClass} text-right`}>
                      {member.invitation?.status === 'PENDING' && !member.emailVerified ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={actionLoadingId === `copy-${member.userId}`}
                            className={secondaryButtonSmClass}
                            onClick={() => void onCopyLink(member.userId)}
                          >
                            {actionLoadingId === `copy-${member.userId}` ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                            Copy link
                          </button>
                          <button
                            type="button"
                            disabled={
                              actionLoadingId === `resend-${member.invitation?.invitationId}`
                            }
                            className={secondaryButtonSmClass}
                            onClick={() => {
                              const invitationId = member.invitation?.invitationId;
                              if (invitationId) void onResend(invitationId);
                            }}
                          >
                            {actionLoadingId === `resend-${member.invitation?.invitationId}` ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <RotateCcw className="size-3" />
                            )}
                            Resend
                          </button>
                          <button
                            type="button"
                            disabled={
                              actionLoadingId === `revoke-${member.invitation?.invitationId}`
                            }
                            className={`${secondaryButtonSmClass} text-[#9f1239] hover:bg-[var(--tpo-dash-accent-rose-soft)]`}
                            onClick={() => {
                              const invitationId = member.invitation?.invitationId;
                              if (invitationId) void onRevoke(invitationId);
                            }}
                          >
                            {actionLoadingId === `revoke-${member.invitation?.invitationId}` ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <X className="size-3" />
                            )}
                            Revoke
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditing && batch ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${bentoCardClass} w-full max-w-md`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[var(--ds-text)]">Edit batch</h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg p-1.5 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={onSaveEdit} className="space-y-4">
              <div>
                <label className={`${labelClass} mb-2 block`} htmlFor="edit-batch-name">
                  Batch name
                </label>
                <input
                  id="edit-batch-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={`${labelClass} mb-2 block`} htmlFor="edit-batch-code">
                  Short code{' '}
                  <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
                </label>
                <input
                  id="edit-batch-code"
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
                <button type="submit" className={dashboardPrimaryButtonClass}>
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAddingMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${bentoCardClass} w-full max-w-md`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[var(--ds-text)]">Add member</h3>
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="rounded-lg p-1.5 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={onAdd} className="space-y-4">
              <div>
                <label className={`${labelClass} mb-2 block`} htmlFor="member-name">
                  Full name
                </label>
                <input
                  id="member-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={`${labelClass} mb-2 block`} htmlFor="member-email">
                  Email
                </label>
                <input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={`${labelClass} mb-2 block`} htmlFor="member-group">
                  Group <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
                </label>
                <input
                  id="member-group"
                  type="text"
                  value={groupLabel}
                  onChange={(e) => setGroupLabel(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberSubmitting}
                  className={dashboardPrimaryButtonClass}
                >
                  {memberSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-3 animate-spin" /> Adding…
                    </span>
                  ) : (
                    'Add member'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
