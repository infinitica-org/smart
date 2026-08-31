'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import type { BatchMemberDto, BatchDto } from '@smart/contracts';
import { API_PREFIX, BatchImportResultDtoSchema } from '@smart/contracts';
import { getAccessToken } from '@smart/api-client';
import { api } from '../../../lib/api';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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

  async function onImport(file: File) {
    const form = new FormData();
    form.append('file', file);
    const token = getAccessToken();
    // Multipart roster import is not on the typed JSON client (body is JSON.stringify).
    // eslint-disable-next-line no-restricted-globals -- FormData upload until api-client supports multipart
    const response = await fetch(`${baseUrl}${API_PREFIX}/tpo/batches/${batchId}/members/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const json: unknown = await response.json();
    const result = BatchImportResultDtoSchema.parse(json);
    setMessage(`Imported ${result.imported}, skipped ${result.skipped}.`);
    await load();
  }

  async function onSendInvites() {
    const result = await api.onboarding.sendBatchInvites(batchId);
    setMessage(`Enqueued ${result.enqueued} invitation emails.`);
    await load();
  }

  async function onResend(invitationId: string) {
    await api.onboarding.resendStudentInvitation(invitationId);
    setMessage('Invitation resent.');
    await load();
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      {batch ? (
        <div className="flex justify-between items-center bg-[var(--surface-muted)] p-6 rounded-xl border border-[var(--surface-border)] shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{batch.name}</h1>
            <p className="text-sm text-ink-muted mt-1">
              Code:{' '}
              <span className="font-mono text-xs bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--surface-border)]">
                {batch.code ?? '—'}
              </span>{' '}
              • {batch.memberCount} members • {batch.pendingInviteCount} pending invites
            </p>
          </div>
          <div>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit Details
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Batch members</CardTitle>
          <CardDescription>Add students individually or import Excel.</CardDescription>
        </CardHeader>
        <form onSubmit={onAdd} className="px-6 pb-4 grid gap-3 max-w-lg">
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
        <div className="px-6 pb-6 flex flex-wrap gap-3 items-center">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImport(file);
            }}
          />
          <a
            className="underline text-sm"
            href={`${baseUrl}${API_PREFIX}/tpo/batches/${batchId}/import-template`}
          >
            Download template
          </a>
          <Button type="button" onClick={onSendInvites}>
            Send invitations
          </Button>
        </div>
      </Card>
      <table className="w-full text-sm border-collapse">
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
                    className="underline"
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

      {isEditing && batch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle>Edit Batch Details</CardTitle>
              <CardDescription>Update the name and code for this batch.</CardDescription>
            </CardHeader>
            <form onSubmit={onSaveEdit} className="px-6 pb-6 space-y-4">
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
