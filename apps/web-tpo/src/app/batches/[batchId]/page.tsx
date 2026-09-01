'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import type { BatchMemberDto, BatchDto } from '@smart/contracts';
import { api } from '../../../lib/api';
import { BatchImportWizard } from '../../../components/batch-import-wizard';

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
    <main className="mx-auto min-w-0 max-w-4xl space-y-6 p-4 sm:p-8">
      {batch ? (
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{batch.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Code:{' '}
              <span className="font-mono text-xs rounded border border-[var(--surface-border)] bg-[var(--surface-muted)] px-1.5 py-0.5">
                {batch.code ?? '—'}
              </span>{' '}
              • {batch.memberCount} members • {batch.pendingInviteCount} pending invites
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Edit Details
          </Button>
        </div>
      ) : null}

      <div className="min-w-0 overflow-x-auto">
        <BatchImportWizard batchId={batchId} onComplete={() => void load()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batch members</CardTitle>
          <CardDescription>
            Add a student individually. Bulk CSV/XLSX import is above.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onAdd} className="grid max-w-lg gap-3 px-6 pb-6">
          {error ? <Alert tone="danger" title={error} /> : null}
          {message ? <Alert tone="info" title={message} /> : null}
          <Input
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Group (optional)"
            value={groupLabel}
            onChange={(e) => setGroupLabel(e.target.value)}
          />
          <Button type="submit">Add member</Button>
        </form>
      </Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Group</th>
              <th className="py-2">Invite</th>
              <th className="py-2">Access</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-b">
                <td className="py-2">{member.fullName}</td>
                <td className="py-2">{member.email}</td>
                <td className="py-2">{member.groupLabel ?? '—'}</td>
                <td className="py-2">
                  {member.emailVerified ? 'Accepted' : (member.invitation?.status ?? '—')}
                </td>
                <td className="py-2">{member.heldAt ? 'On hold' : 'Active'}</td>
                <td className="py-2">
                  {member.invitation?.status === 'PENDING' ? (
                    <button
                      type="button"
                      className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      onClick={() => {
                        const invitationId = member.invitation?.invitationId;
                        if (invitationId) void onResend(invitationId);
                      }}
                    >
                      Resend
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditing && batch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle>Edit Batch Details</CardTitle>
              <CardDescription>Update the name and code for this batch.</CardDescription>
            </CardHeader>
            <form onSubmit={onSaveEdit} className="space-y-4 px-6 pb-6">
              <Input
                label="Batch name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <Input
                label="Batch code (optional)"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
}
