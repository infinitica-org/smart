'use client';

import { useState } from 'react';
import type { ActiveSessionDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { LogOut, ShieldX } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  InlineAlert,
  PageStack,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

function formatApiError(error: unknown, fallback: string): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((detail) => `${detail.path}: ${detail.message}`).join(' ');
  }
  if (isSmartApiError(error)) return error.message;
  return fallback;
}

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<ActiveSessionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.onboarding.listActiveSessions(
        email.trim() ? { email: email.trim() } : undefined,
      );
      setSessions(rows);
      setLoaded(true);
    } catch (err) {
      setError(formatApiError(err, 'Could not load sessions.'));
    } finally {
      setLoading(false);
    }
  }

  async function revoke(session: ActiveSessionDto) {
    setError(null);
    setMessage(null);
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters before revoking a session.');
      return;
    }
    setRevokingId(session.id);
    try {
      await api.onboarding.revokeSession(session.id, { reason: reason.trim() });
      setSessions((current) => current.filter((row) => row.id !== session.id));
      setMessage(`Session for ${session.userEmail} revoked.`);
    } catch (err) {
      setError(formatApiError(err, 'Could not revoke this session.'));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={LogOut}
        title="Active sessions"
        description="Every live login (refresh-token family) across the platform. Forcefully terminate one if a device or account is compromised."
      />

      <FilterBar>
        <Field label="User email">
          <AdminInput
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@example.com"
          />
        </Field>
        <Field label="Reason (required to revoke, min 8 chars)">
          <AdminInput
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. user reported a stolen device"
          />
        </Field>
        <Button className="rounded-md" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading…' : 'Search'}
        </Button>
      </FilterBar>

      {error ? <InlineAlert tone="danger" title={error} /> : null}
      {message ? <InlineAlert tone="info" title={message} /> : null}

      {!loaded ? (
        <EmptyState icon={ShieldX}>Search to list active sessions.</EmptyState>
      ) : (
        <DataTable
          headers={['User', 'Role', 'Session started', 'Expires', 'Action']}
          empty={sessions.length === 0}
          emptyIcon={ShieldX}
        >
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {session.userFullName}
                </div>
                <div className="text-zinc-500 dark:text-zinc-400">{session.userEmail}</div>
              </TableCell>
              <TableCell>{session.userRole}</TableCell>
              <TableCell>{new Date(session.createdAt).toLocaleString()}</TableCell>
              <TableCell>{new Date(session.expiresAt).toLocaleString()}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  disabled={revokingId === session.id}
                  onClick={() => void revoke(session)}
                >
                  {revokingId === session.id ? 'Revoking…' : 'Revoke'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
