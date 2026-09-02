'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, Card, Input } from '@smart/ui';
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
      <div className="flex items-center gap-4 text-gray-400 text-sm mb-2">
        <Link
          href="/batches"
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          All Batches
        </Link>
        <span>/</span>
        <span className="text-white">{batch?.name || 'Loading...'}</span>
      </div>

      {batch ? (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white">{batch.name}</h1>
              <span className="bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded text-xs font-mono">
                {batch.code ?? 'NO-CODE'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> {batch.memberCount} Members
              </span>
              <span className="flex items-center gap-1.5 text-amber-400/80">
                <Clock className="w-4 h-4" /> {batch.pendingInviteCount} Pending Invites
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsEditing(true)}
              className="bg-[#1a1a1a] border-white/10 text-white hover:bg-white/5 flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Edit Batch
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsAddingMember(true)}
              className="bg-[#00fad0] hover:bg-[#00fad0]/90 text-white flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Add Member
            </Button>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <Ban className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{message}</p>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Import */}
      <div className="bg-[#131313] border border-white/5 rounded-2xl overflow-hidden mb-6">
        <BatchImportWizard batchId={batchId} onComplete={() => void load()} />
      </div>

      <Card className="bg-[#131313] border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[#161616] border-b border-white/5 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Group</th>
                <th className="px-6 py-4 font-medium">Invite Status</th>
                <th className="px-6 py-4 font-medium">Access</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No members in this batch yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.userId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{member.fullName}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className="bg-white/5 text-gray-300 px-2 py-1 rounded text-xs">
                        {member.groupLabel ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.emailVerified ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Accepted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5" /> {member.invitation?.status ?? 'Pending'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {member.heldAt ? (
                        <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                          <Ban className="w-3.5 h-3.5" /> On Hold
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.invitation?.status === 'PENDING' && !member.emailVerified ? (
                        <button
                          type="button"
                          className="text-xs text-gray-400 hover:text-white underline transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl bg-[#131313] border-white/10">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Edit Batch</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onSaveEdit} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Batch Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 px-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Batch Code (Optional)
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 px-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-[#00fad0] hover:bg-[#00fad0]/90 text-white"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl bg-[#131313] border-white/10">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add Individual Member</h3>
              <button
                onClick={() => setIsAddingMember(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onAdd} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 px-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 px-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Group (Optional)
                </label>
                <input
                  type="text"
                  value={groupLabel}
                  onChange={(e) => setGroupLabel(e.target.value)}
                  className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 px-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-[#00fad0] hover:bg-[#00fad0]/90 text-white"
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
