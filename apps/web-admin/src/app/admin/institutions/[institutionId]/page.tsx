'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import type { InstitutionAdminDto, InstitutionDto } from '@smart/contracts';
import { api } from '../../../../lib/api';

export default function InstitutionDetailPage() {
  const params = useParams<{ institutionId: string }>();
  const institutionId = params.institutionId;
  const [institution, setInstitution] = useState<InstitutionDto | null>(null);
  const [admins, setAdmins] = useState<InstitutionAdminDto[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [inst, adminList] = await Promise.all([
      api.onboarding.getInstitution(institutionId),
      api.onboarding.listInstitutionAdmins(institutionId),
    ]);
    setInstitution(inst);
    setAdmins(adminList);
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load institution.'));
  }, [institutionId]);

  async function onInvite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api.onboarding.inviteInstitutionAdmin(institutionId, { fullName, email });
      setFullName('');
      setEmail('');
      setMessage('Invitation queued. Check Mailpit for the email.');
      await load();
    } catch {
      setError('Could not send invitation.');
    }
  }

  async function onResend(invitationId: string) {
    await api.onboarding.resendAdminInvitation(invitationId);
    setMessage('Invitation resent.');
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{institution?.name ?? 'Institution'}</CardTitle>
          <CardDescription>{institution?.domain}</CardDescription>
        </CardHeader>
        <form onSubmit={onInvite} className="px-6 pb-6 grid gap-3 max-w-lg">
          {error ? <Alert tone="danger" title={error} /> : null}
          {message ? <Alert tone="info" title={message} /> : null}
          <Input
            label="Admin name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Admin email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit">Invite institution admin</Button>
        </form>
      </Card>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Name</th>
            <th className="py-2">Email</th>
            <th className="py-2">Status</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.userId} className="border-b">
              <td className="py-2">{admin.fullName}</td>
              <td className="py-2">{admin.email}</td>
              <td className="py-2">
                {admin.emailVerified ? 'Active' : (admin.invitation?.status ?? '—')}
              </td>
              <td className="py-2">
                {admin.invitation?.status === 'PENDING' ? (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      const invitationId = admin.invitation?.invitationId;
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
  );
}
