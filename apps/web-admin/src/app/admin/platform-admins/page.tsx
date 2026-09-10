'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { PlatformAdminDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { ShieldPlus, UserCog } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  InlineAlert,
  PageStack,
  TableCell,
  TableRow,
  controlButtonClassName,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

function formatApiError(error: unknown, fallback: string): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((detail) => `${detail.path}: ${detail.message}`).join(' ');
  }
  if (isSmartApiError(error)) return error.message;
  return fallback;
}

export default function PlatformAdminsPage() {
  const [admins, setAdmins] = useState<PlatformAdminDto[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setAdmins(await api.onboarding.listPlatformAdmins());
  }

  useEffect(() => {
    load().catch((err) => setError(formatApiError(err, 'Failed to load platform admins.')));
  }, []);

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (reason.trim().length < 8) {
      setError(
        'Enter a reason of at least 8 characters — granting platform-admin access is audit-logged.',
      );
      return;
    }
    try {
      await api.onboarding.invitePlatformAdmin({
        fullName: fullName.trim(),
        email: email.trim(),
        reason: reason.trim(),
      });
      setFullName('');
      setEmail('');
      setReason('');
      setMessage('Invitation queued. Check Mailpit for the email.');
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Could not send invitation.'));
    }
  }

  async function onResend(invitationId: string) {
    try {
      await api.onboarding.resendAdminInvitation(invitationId);
      setMessage('Invitation resent.');
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Could not resend invitation.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={UserCog}
        title="Platform admins"
        description="Superadmin accounts with full platform access. Granting access is audit-logged and requires a reason."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      {message ? <InlineAlert title={message} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Invite platform admin</CardTitle>
          <CardDescription>
            They get full SUPER_ADMIN access across every tenant on this platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onInvite}>
            <FormGrid>
              <Field label="Full name">
                <AdminInput
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Email">
                <AdminInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Reason" className="md:col-span-2">
                <AdminInput
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="At least 8 characters — why does this person need platform-admin access?"
                  required
                />
              </Field>
              <FormActions>
                <Button type="submit" className={controlButtonClassName}>
                  <ShieldPlus data-icon="inline-start" />
                  Invite platform admin
                </Button>
              </FormActions>
            </FormGrid>
          </form>
        </CardContent>
      </Card>
      {admins.length === 0 ? (
        <EmptyState icon={UserCog}>No platform admins yet.</EmptyState>
      ) : (
        <DataTable headers={['Name', 'Email', 'Status', '']}>
          {admins.map((admin) => (
            <TableRow key={admin.userId}>
              <TableCell className="font-medium">{admin.fullName}</TableCell>
              <TableCell>{admin.email}</TableCell>
              <TableCell>
                {admin.emailVerified ? 'Active' : (admin.invitation?.status ?? '—')}
              </TableCell>
              <TableCell>
                {admin.invitation?.status === 'PENDING' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const invitationId = admin.invitation?.invitationId;
                      if (invitationId) void onResend(invitationId);
                    }}
                  >
                    Resend
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
