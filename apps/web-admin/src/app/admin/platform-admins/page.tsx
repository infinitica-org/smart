'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { PlatformAdminDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import {
  CheckCircle2,
  Mail,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShieldPlus,
  UserCog,
  X,
} from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
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

export default function PlatformAdminsPage() {
  const [admins, setAdmins] = useState<PlatformAdminDto[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAdmins() {
    setLoading(true);
    try {
      const data = await api.onboarding.listPlatformAdmins();
      setAdmins(data);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load platform admins from database.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins().catch(() => {});
  }, []);

  async function onInviteSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (reason.trim().length < 8) {
      setError('Enter a justification reason of at least 8 characters for the audit log.');
      return;
    }

    try {
      await api.onboarding.invitePlatformAdmin({
        fullName: fullName.trim(),
        email: email.trim(),
        reason: reason.trim(),
      });
      setMessage(`Invitation created in database and queued for ${email.trim()}.`);
      setFullName('');
      setEmail('');
      setReason('');
      setInviteModalOpen(false);
      await loadAdmins();
    } catch (err) {
      setError(formatApiError(err, 'Could not invite platform admin.'));
    }
  }

  async function onResend(invitationId: string) {
    try {
      await api.onboarding.resendAdminInvitation(invitationId);
      setMessage('Invitation token refreshed and resent.');
      await loadAdmins();
    } catch (err) {
      setError(formatApiError(err, 'Could not resend invitation.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={UserCog}
        title="Admin User Management"
        description="Superadmin accounts with full platform access. Every invitation and access delegation is recorded in the PostgreSQL audit log."
      />

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {message ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
              Platform Super Administrators
            </h3>
            <p className="text-xs text-zinc-500">
              Live personnel with SUPER_ADMIN privileges across all platform tenants.
            </p>
          </div>
          <Button
            className="h-8 rounded-md bg-zinc-900 text-white hover:bg-black font-semibold gap-1.5 text-xs shadow-2xs"
            onClick={() => setInviteModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Invite admin
          </Button>
        </div>

        <DataTable
          headers={['Administrator', 'Email Address', 'Role & Scope', 'Status', 'Actions']}
          empty={admins.length === 0}
          emptyIcon={UserCog}
        >
          {admins.map((admin) => {
            const isPending = admin.invitation?.status === 'PENDING';
            const initials =
              admin.fullName
                .split(' ')
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'AD';

            return (
              <TableRow key={admin.userId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 text-xs">{admin.fullName}</div>
                      <div className="truncate text-[11px] text-zinc-500">{admin.email}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="font-mono text-xs text-zinc-600">{admin.email}</span>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-900">
                      SUPER_ADMIN
                    </span>
                    <span className="text-[11px] text-zinc-400">(Global)</span>
                  </div>
                </TableCell>

                <TableCell>
                  {admin.emailVerified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
                      <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                      <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse" />
                      {admin.invitation?.status ?? 'Pending Invite'}
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  {isPending && admin.invitation?.invitationId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs gap-1"
                      onClick={() => void onResend(admin.invitation!.invitationId)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Resend
                    </Button>
                  ) : (
                    <span className="text-[11px] font-medium text-zinc-400">Verified</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </div>

      {/* Invite Admin Modal */}
      {inviteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-md border border-zinc-200/90 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
              <div>
                <h3 className="font-heading text-lg font-bold text-zinc-950 dark:text-zinc-100">
                  Invite Platform Administrator
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Creates a new administrative account in PostgreSQL with SUPER_ADMIN privileges.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onInviteSubmit} className="mt-4 space-y-4">
              <Field label="Full Name">
                <AdminInput
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </Field>

              <Field label="Official Email">
                <AdminInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@smart.edu"
                  required
                />
              </Field>

              <Field label="Audit Rationale / Justification">
                <AdminInput
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="At least 8 characters — why is superadmin access required?"
                  required
                />
              </Field>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  onClick={() => setInviteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-zinc-900 text-white hover:bg-black font-bold rounded-md dark:bg-zinc-100 dark:text-zinc-950"
                >
                  <ShieldPlus className="h-4 w-4 mr-1" />
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageStack>
  );
}
