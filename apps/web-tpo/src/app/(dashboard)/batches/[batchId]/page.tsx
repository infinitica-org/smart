'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@smart/ui';
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
} from 'lucide-react';

export default function BatchDetailPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = params.batchId;
  const [batch, setBatch] = useState<BatchDto | null>(null);
  const [members, setMembers] = useState<BatchMemberDto[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const [isAddingMember, setIsAddingMember] = useState(false);

  async function load() {
    const [batchData, membersData] = await Promise.all([
      api.onboarding.getBatch(batchId),
      api.onboarding.listBatchMembers(batchId),
    ]);
    setBatch(batchData);
    setMembers(membersData);
    setEditName(batchData.name);
    setEditCode(batchData.code ?? '');
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load batch or members.'));
  }, [batchId]);

  async function onSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.onboarding.updateBatch(batchId, {
        name: editName,
        code: editCode || null,
      });
      setIsEditing(false);
      await load();
      setMessage('Batch updated successfully.');
    } catch {
      setError('Could not update batch.');
    }
  }

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.onboarding.addBatchMember(batchId, {
        fullName,
        email,
        groupLabel: groupLabel || undefined,
      });
      setFullName('');
      setEmail('');
      setGroupLabel('');
      setIsAddingMember(false);
      await load();
    } catch {
      setError('Could not add member.');
    }
  }

  async function onResend(invitationId: string) {
    await api.onboarding.resendStudentInvitation(invitationId);
    setMessage('Invitation resent.');
    await load();
  }

  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="flex items-center gap-4 text-slate-500 text-sm mb-2 font-medium">
        <Link
          href="/batches"
          className="hover:text-[#004c63] transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          All Batches
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{batch?.name || 'Loading...'}</span>
      </div>

      {batch ? (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{batch.name}</h1>
              <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-mono font-medium">
                {batch.code ?? 'NO-CODE'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" /> {batch.memberCount} Members
              </span>
              <span className="flex items-center gap-1.5 text-amber-600">
                <Clock className="w-4 h-4 text-amber-500" /> {batch.pendingInviteCount} Pending
                Invites
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsEditing(true)}
              className="bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 flex items-center gap-2 font-medium rounded-xl"
            >
              <Edit3 className="w-4 h-4 text-slate-500" /> Edit Batch
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsAddingMember(true)}
              className="bg-[#004c63] hover:bg-[#003a4d] text-white flex items-center gap-2 font-semibold shadow-sm rounded-xl px-4 py-2"
            >
              <UserPlus className="w-4 h-4" /> Add Member
            </Button>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
          <Ban className="w-5 h-5 shrink-0 text-rose-500" />
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium">{message}</p>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Import */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden mb-6">
        <BatchImportWizard batchId={batchId} onComplete={() => void load()} />
      </div>

      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Group</th>
                <th className="px-6 py-3.5">Invite Status</th>
                <th className="px-6 py-3.5">Access</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No members in this batch yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.userId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{member.fullName}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 border border-slate-200 text-slate-700 font-mono px-2.5 py-1 rounded text-xs">
                        {member.groupLabel ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />{' '}
                          {member.invitation?.status ?? 'Pending'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {member.heldAt ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <Ban className="w-3.5 h-3.5 text-rose-600" /> On Hold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.invitation?.status === 'PENDING' && !member.emailVerified ? (
                        <button
                          type="button"
                          className="text-xs text-slate-500 hover:text-[#004c63] underline font-medium transition-colors"
                          onClick={() => {
                            const invitationId = member.invitation?.invitationId;
                            if (invitationId) void onResend(invitationId);
                          }}
                        >
                          Resend Invite
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl bg-white border-slate-200 rounded-xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h3 className="text-lg font-bold text-slate-900">Edit Batch</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onSaveEdit} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-sm rounded-lg py-2 px-3 border border-slate-200 focus:outline-none focus:border-[#004c63] focus:ring-1 focus:ring-[#004c63] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Batch Code (Optional)
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-sm rounded-lg py-2 px-3 border border-slate-200 focus:outline-none focus:border-[#004c63] focus:ring-1 focus:ring-[#004c63] transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-500 hover:text-slate-900 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-[#004c63] hover:bg-[#003a4d] text-white font-semibold shadow-sm px-4 py-2 rounded-xl"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl bg-white border-slate-200 rounded-xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h3 className="text-lg font-bold text-slate-900">Add Individual Member</h3>
              <button
                onClick={() => setIsAddingMember(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onAdd} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-sm rounded-lg py-2 px-3 border border-slate-200 focus:outline-none focus:border-[#004c63] focus:ring-1 focus:ring-[#004c63] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-sm rounded-lg py-2 px-3 border border-slate-200 focus:outline-none focus:border-[#004c63] focus:ring-1 focus:ring-[#004c63] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Group (Optional)
                </label>
                <input
                  type="text"
                  value={groupLabel}
                  onChange={(e) => setGroupLabel(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-sm rounded-lg py-2 px-3 border border-slate-200 focus:outline-none focus:border-[#004c63] focus:ring-1 focus:ring-[#004c63] transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className="text-slate-500 hover:text-slate-900 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-[#004c63] hover:bg-[#003a4d] text-white font-semibold shadow-sm px-4 py-2 rounded-xl"
                >
                  Add Member
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
}
