'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import type {
  InstitutionAdminDto,
  InstitutionDto,
  InstitutionStudentDto,
  PlanCode,
  StudentInviteFilter,
} from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { api } from '../../../../lib/api';
import { useRequireAuth } from '../../../../lib/auth';

function formatApiError(error: unknown, fallback: string): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((detail) => `${detail.path}: ${detail.message}`).join(' ');
  }
  if (isSmartApiError(error)) return error.message;
  return fallback;
}

export default function InstitutionDetailPage() {
  useRequireAuth();
  const params = useParams<{ institutionId: string }>();
  const institutionId = params.institutionId;
  const [institution, setInstitution] = useState<InstitutionDto | null>(null);
  const [admins, setAdmins] = useState<InstitutionAdminDto[]>([]);
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editPlan, setEditPlan] = useState<PlanCode>('FREE');
  const [studentQ, setStudentQ] = useState('');
  const [inviteStatus, setInviteStatus] = useState<StudentInviteFilter | ''>('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStudents() {
    const list = await api.onboarding.listInstitutionStudents(institutionId, {
      q: studentQ.trim() || undefined,
      inviteStatus: inviteStatus || undefined,
    });
    setStudents(list);
  }

  async function load() {
    const [inst, adminList] = await Promise.all([
      api.onboarding.getInstitution(institutionId),
      api.onboarding.listInstitutionAdmins(institutionId),
    ]);
    setInstitution(inst);
    setAdmins(adminList);
    setEditName(inst.name);
    setEditDomain(inst.domain);
    setEditPlan(inst.planCode);
    await loadStudents();
  }

  useEffect(() => {
    load().catch((err) => setError(formatApiError(err, 'Failed to load institution.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (err) {
      setError(formatApiError(err, 'Could not send invitation.'));
    }
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const updated = await api.onboarding.updateInstitution(institutionId, {
        name: editName.trim(),
        domain: editDomain.trim(),
        planCode: editPlan,
      });
      setInstitution(updated);
      setMessage('Institution updated.');
    } catch (err) {
      setError(formatApiError(err, 'Could not update institution.'));
    }
  }

  async function runAction(
    fn: (id: string, body: { reason: string }) => Promise<InstitutionDto>,
    success: string,
  ) {
    setError(null);
    setMessage(null);
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters.');
      return;
    }
    try {
      const updated = await fn(institutionId, { reason: reason.trim() });
      setInstitution(updated);
      setReason('');
      setMessage(success);
    } catch (err) {
      setError(formatApiError(err, 'Action failed.'));
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <Link href="/admin/institutions" className="text-sm underline">
        Back to institutions
      </Link>
      {institution?.heldAt ? (
        <Alert tone="danger" title="This institution is on hold. Associated users cannot log in." />
      ) : null}
      {institution?.deactivatedAt ? (
        <Alert
          tone="danger"
          title="This institution is deactivated (soft-deleted). Associated users cannot log in."
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{institution?.name ?? 'Institution'}</CardTitle>
          <CardDescription>
            {institution?.domain} · Plan {institution?.planCode}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSave} className="px-6 pb-6 grid gap-3 max-w-lg">
          {error ? <Alert tone="danger" title={error} /> : null}
          {message ? <Alert tone="info" title={message} /> : null}
          <Input
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            label="Domain"
            value={editDomain}
            onChange={(e) => setEditDomain(e.target.value)}
            required
          />
          <label className="grid gap-1 text-sm">
            <span className="text-[var(--text-muted)]">Plan</span>
            <select
              className="h-10 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3"
              value={editPlan}
              onChange={(e) => setEditPlan(e.target.value as PlanCode)}
            >
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">Pro</option>
            </select>
          </label>
          <Button type="submit">Save changes</Button>
        </form>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        {[
          ['Students', institution?.studentCount],
          ['TPO admins', institution?.adminCount],
          ['Batches', institution?.batchCount],
          ['Invites pending', institution?.invitePendingCount],
          ['Invites accepted', institution?.inviteAcceptedCount],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle>{value ?? '—'}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite institution admin</CardTitle>
        </CardHeader>
        <form onSubmit={onInvite} className="px-6 pb-6 grid gap-3 max-w-lg">
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
            <th className="py-2">Admin</th>
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
                      if (invitationId) {
                        void api.onboarding.resendAdminInvitation(invitationId).then(async () => {
                          setMessage('Invitation resent.');
                          await load();
                        });
                      }
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

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Filter by invite sent or accepted.</CardDescription>
        </CardHeader>
        <div className="px-6 pb-4 flex flex-wrap gap-3 items-end">
          <div className="min-w-48 flex-1">
            <Input
              label="Search students"
              value={studentQ}
              onChange={(e) => setStudentQ(e.target.value)}
            />
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-[var(--text-muted)]">Invite status</span>
            <select
              className="h-10 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3"
              value={inviteStatus}
              onChange={(e) => setInviteStatus(e.target.value as StudentInviteFilter | '')}
            >
              <option value="">All</option>
              <option value="PENDING">Invite sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
              <option value="NONE">No invite</option>
            </select>
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              loadStudents().catch((err) =>
                setError(formatApiError(err, 'Failed to load students.')),
              );
            }}
          >
            Filter
          </Button>
        </div>
        {students.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-[var(--text-muted)]">
            No students match these filters.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse px-6">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-6">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Batch</th>
                <th className="py-2">Invite</th>
                <th className="py-2">Access</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.userId} className="border-b">
                  <td className="py-2 px-6">{student.fullName}</td>
                  <td className="py-2">{student.email}</td>
                  <td className="py-2">{student.batchName ?? '—'}</td>
                  <td className="py-2">{student.inviteStatus ?? 'NONE'}</td>
                  <td className="py-2">
                    {student.heldAt ? 'On hold' : 'Active'}{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        void (async () => {
                          if (reason.trim().length < 8) {
                            setError(
                              'Enter a reason of at least 8 characters to hold or release a student.',
                            );
                            return;
                          }
                          try {
                            if (student.heldAt) {
                              await api.onboarding.releaseStudentHold(student.userId, {
                                reason: reason.trim(),
                              });
                              setMessage('Student hold released.');
                            } else {
                              await api.onboarding.holdStudent(student.userId, {
                                reason: reason.trim(),
                              });
                              setMessage('Student account is on hold.');
                            }
                            await loadStudents();
                          } catch (err) {
                            setError(formatApiError(err, 'Could not update student hold.'));
                          }
                        })();
                      }}
                    >
                      {student.heldAt ? 'Release' : 'Hold'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access controls</CardTitle>
          <CardDescription>
            Hold blocks logins without hiding the tenant. Soft-delete hides it from the default list
            and also blocks logins. A reason is required.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 grid gap-3 max-w-lg">
          <Input
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="At least 8 characters"
          />
          <div className="flex flex-wrap gap-2">
            {institution?.heldAt ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void runAction(api.onboarding.releaseHold, 'Hold released.')}
              >
                Release hold
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void runAction(api.onboarding.holdInstitution, 'Institution on hold.')
                }
              >
                Put on hold
              </Button>
            )}
            {institution?.deactivatedAt ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void runAction(api.onboarding.restoreInstitution, 'Institution restored.')
                }
              >
                Restore
              </Button>
            ) : (
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  void runAction(api.onboarding.deactivateInstitution, 'Institution deactivated.')
                }
              >
                Soft-delete
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
