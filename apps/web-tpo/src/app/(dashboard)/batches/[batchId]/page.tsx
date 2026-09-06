'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import type { BatchMemberDto, BatchDto } from '@smart/contracts';
import { api } from '../../../../lib/api';
import { BatchImportWizard } from '../../../../components/batch-import-wizard';
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
      const domain = entitlements?.domain;
      const trimmedEmail = email.trim().toLowerCase();
      if (domain && !trimmedEmail.endsWith(`@${domain.toLowerCase()}`)) {
        setError(`Email address must belong to domain @${domain}`);
        setMemberSubmitting(false);
        return;
      }

      await api.onboarding.addBatchMember(batchId, {
        fullName: fullName.trim(),
        email: trimmedEmail,
        groupLabel: groupLabel.trim() || undefined,
      });
      await api.onboarding.sendBatchInvites(batchId);
      setFullName('');
      setEmail('');
      setGroupLabel('');
      setIsAddingMember(false);
      setMessage('Member added and invitation sent.');
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
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-sans text-zinc-100">
      <div className="flex items-center gap-4 text-zinc-400 text-sm mb-2 font-medium">
        <Link
          href="/batches"
          className="hover:text-emerald-400 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          All Batches
        </Link>
        <span>/</span>
        <span className="text-white font-semibold">
          {loading ? 'Loading…' : (batch?.name ?? 'Batch')}
        </span>
      </div>

      {batch && !loading ? (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">{batch.name}</h1>
              <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded text-xs font-mono font-medium">
                {batch.code ?? 'NO-CODE'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-zinc-500" /> {batch.memberCount} Members
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <Clock className="w-4 h-4 text-amber-500" /> {batch.pendingInviteCount} Pending
                Invites
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsEditing(true)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 flex items-center gap-2 font-medium rounded-xl"
            >
              <Edit3 className="w-4 h-4 text-zinc-400" /> Edit Batch
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsAddingMember(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 font-semibold shadow-xs rounded-xl px-4 py-2 border border-emerald-500/50"
            >
              <UserPlus className="w-4 h-4" /> Add Member
            </Button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-zinc-400 py-4">
          <Loader2 className="size-4 animate-spin" /> Loading batch…
        </div>
      ) : null}

      {error && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-center gap-3">
          <Ban className="w-5 h-5 shrink-0 text-rose-400" />
          <p className="text-xs font-bold">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {message && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-200 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          <p className="text-xs font-bold">{message}</p>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-emerald-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Import Wizard */}
      <div className="bg-zinc-900/80 border border-zinc-800 shadow-xs rounded-xl overflow-hidden mb-6">
        <div className="p-5 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-white">Bulk Import via CSV / XLSX</h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-medium">
            Upload a roster file to add multiple candidates at once.
          </p>
        </div>
        <div className="p-5">
          <BatchImportWizard batchId={batchId} onComplete={() => void load()} />
        </div>
      </div>

      {/* Member Table */}
      <Card className="bg-zinc-950 border-zinc-800 shadow-xs overflow-hidden rounded-xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Enrolled Members</h2>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="p-1.5 rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-semibold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Group</th>
                <th className="px-6 py-3.5">Invite Status</th>
                <th className="px-6 py-3.5">Access</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-zinc-500 font-medium">
                    <Loader2 className="size-4 animate-spin inline" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-medium">
                    No members in this batch yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.userId} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{member.fullName}</div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 font-medium">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono px-2.5 py-1 rounded text-[11px]">
                        {member.groupLabel ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" /> Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" /> {member.invitation?.status ?? 'Pending'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {member.heldAt ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Ban className="w-3.5 h-3.5" /> On Hold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.invitation?.status === 'PENDING' && !member.emailVerified ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={!!actionLoadingId}
                            className="text-[11px] text-zinc-400 hover:text-white font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                            onClick={() => void onCopyLink(member.userId)}
                          >
                            {actionLoadingId === `copy-${member.userId}` ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                            Copy Link
                          </button>
                          <button
                            type="button"
                            disabled={!!actionLoadingId}
                            className="text-[11px] text-zinc-400 hover:text-emerald-400 font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
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
                            disabled={!!actionLoadingId}
                            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
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
      </Card>

      {/* Edit Modal */}
      {isEditing && batch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl bg-zinc-900 border-zinc-800 rounded-xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Batch</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onSaveEdit} className="space-y-4 p-6">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2 px-3 border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Batch Code{' '}
                  <span className="normal-case font-normal text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2 px-3 border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-zinc-400 hover:text-white font-medium text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs border border-emerald-500/50 px-4 py-2 rounded-xl"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl bg-zinc-900 border-zinc-800 rounded-xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Individual Member</h3>
              <button
                onClick={() => setIsAddingMember(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onAdd} className="space-y-4 p-6">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2 px-3 border border-zinc-800 focus:outline-none focus:border-zinc-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2 px-3 border border-zinc-800 focus:outline-none focus:border-zinc-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Group <span className="normal-case font-normal text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={groupLabel}
                  onChange={(e) => setGroupLabel(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2 px-3 border border-zinc-800 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className="text-zinc-400 hover:text-white font-medium text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={memberSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs border border-emerald-500/50 px-4 py-2 rounded-xl"
                >
                  {memberSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-3 animate-spin" /> Adding…
                    </span>
                  ) : (
                    'Add Member'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
}
