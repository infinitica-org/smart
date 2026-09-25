'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flag, GraduationCap, ScrollText, Shield, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import type {
  AuditLogDto,
  InstitutionAdminDto,
  InstitutionDto,
  InstitutionStudentDto,
  PlanCode,
  StudentInviteFilter,
  TenantEntitlementsDto,
} from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { Badge } from '@smart/ui/badge';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { Switch } from '@smart/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smart/ui/tabs';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  Field,
  FilterBar,
  FormActions,
  FormGrid,
  InlineAlert,
  NativeSelect,
  PageStack,
  StatusBadge,
  TableCell,
  TableRow,
  VerificationBadge,
  controlButtonClassName,
} from '@/components/admin-ui';
import { api } from '@/lib/api';
import { StaffTable } from './staff-table';

function formatApiError(error: unknown, fallback: string): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((detail) => `${detail.path}: ${detail.message}`).join(' ');
  }
  if (isSmartApiError(error)) return error.message;
  return fallback;
}

export default function InstitutionDetailPage() {
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
  const [activity, setActivity] = useState<AuditLogDto[]>([]);
  const [entitlements, setEntitlements] = useState<TenantEntitlementsDto | null>(null);
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
    const [inst, adminList, logs, flags] = await Promise.all([
      api.onboarding.getInstitution(institutionId),
      api.onboarding.listInstitutionAdmins(institutionId),
      api.onboarding.listAuditLogs({ resourceId: institutionId }),
      api.onboarding.institutionEntitlements(institutionId),
    ]);
    setInstitution(inst);
    setAdmins(adminList);
    setActivity(logs);
    setEntitlements(flags);
    setEditName(inst.name);
    setEditDomain(inst.domain);
    setEditPlan(inst.planCode);
    await loadStudents();
  }

  useEffect(() => {
    load().catch((err) => setError(formatApiError(err, 'Failed to load institution.')));
  }, [institutionId]);

  async function onInvite(event: FormEvent) {
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

  async function onSave(event: FormEvent) {
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

  const status = institution?.deactivatedAt
    ? 'Deactivated'
    : institution?.heldAt
      ? 'On hold'
      : 'Active';

  return (
    <PageStack>
      <PageHeader
        icon={GraduationCap}
        title={institution?.name ?? 'Institution'}
        description={`${institution?.domain ?? ''} · Plan ${institution?.planCode ?? ''}`}
      >
        <Button variant="outline" className="rounded-md" asChild>
          <Link href="/admin/institutions">
            <ArrowLeft data-icon="inline-start" />
            Back to institutions
          </Link>
        </Button>
      </PageHeader>
      {institution?.heldAt ? (
        <InlineAlert
          tone="danger"
          title="This institution is on hold. Associated users cannot log in."
        />
      ) : null}
      {institution?.deactivatedAt ? (
        <InlineAlert
          tone="danger"
          title="This institution is deactivated (soft-deleted). Associated users cannot log in."
        />
      ) : null}
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      {message ? <InlineAlert title={message} /> : null}

      {/* Control-center summary: status, verification, and plan at a glance — no tab click needed. */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            {institution ? <StatusBadge status={status} /> : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Verification</span>
            {institution ? <VerificationBadge status={institution.verificationStatus} /> : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Plan</span>
            <Badge variant="outline">{institution?.planCode ?? '—'}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-3 lg:grid-cols-6">
        {[
          ['Students', institution?.studentCount],
          ['TPO admins', institution?.adminCount],
          ['Active students (30d)', institution?.activeStudents30d],
          ['Batches', institution?.batchCount],
          ['Invites pending', institution?.invitePendingCount],
          ['Invites accepted', institution?.inviteAcceptedCount],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value ?? '—'}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <GraduationCap />
            Profile
          </TabsTrigger>
          <TabsTrigger value="people">
            <Users />
            People
          </TabsTrigger>
          <TabsTrigger value="access">
            <Shield />
            Access
          </TabsTrigger>
          <TabsTrigger value="flags">
            <Flag />
            Flags
          </TabsTrigger>
          <TabsTrigger value="activity">
            <ScrollText />
            Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant profile</CardTitle>
              <CardDescription>Name, domain, and subscription plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSave}>
                <FormGrid>
                  <Field label="Name">
                    <AdminInput
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Domain">
                    <AdminInput
                      value={editDomain}
                      onChange={(e) => setEditDomain(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Plan">
                    <NativeSelect
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value as PlanCode)}
                    >
                      <option value="FREE">Free</option>
                      <option value="BASIC">Basic</option>
                      <option value="PRO">Pro</option>
                    </NativeSelect>
                  </Field>
                  <FormActions>
                    <Button type="submit" className={controlButtonClassName}>
                      Save changes
                    </Button>
                  </FormActions>
                </FormGrid>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="people" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invite institution admin</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onInvite}>
                <FormGrid>
                  <Field label="Admin name">
                    <AdminInput
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Admin email">
                    <AdminInput
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </Field>
                  <FormActions>
                    <Button type="submit" className={controlButtonClassName}>
                      Invite institution admin
                    </Button>
                  </FormActions>
                </FormGrid>
              </form>
            </CardContent>
          </Card>
          <StaffTable staff={admins} onChanged={load} onMessage={setMessage} onError={setError} />
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>Filter by invite sent or accepted.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterBar>
                <Field label="Search students">
                  <AdminInput value={studentQ} onChange={(e) => setStudentQ(e.target.value)} />
                </Field>
                <Field label="Invite status">
                  <NativeSelect
                    value={inviteStatus}
                    onChange={(e) => setInviteStatus(e.target.value as StudentInviteFilter | '')}
                  >
                    <option value="">All</option>
                    <option value="PENDING">Invite sent</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="REVOKED">Revoked</option>
                    <option value="NONE">No invite</option>
                  </NativeSelect>
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  className={controlButtonClassName}
                  onClick={() => {
                    loadStudents().catch((err) =>
                      setError(formatApiError(err, 'Failed to load students.')),
                    );
                  }}
                >
                  Filter
                </Button>
              </FilterBar>
            </CardContent>
          </Card>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students match these filters.</p>
          ) : (
            <DataTable headers={['Name', 'Email', 'Batch', 'Invite', 'Access']}>
              {students.map((student) => (
                <TableRow key={student.userId}>
                  <TableCell className="font-medium">{student.fullName}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.batchName ?? '—'}</TableCell>
                  <TableCell>{student.inviteStatus ?? 'NONE'}</TableCell>
                  <TableCell className="space-x-2">
                    <StatusBadge status={student.heldAt ? 'On hold' : 'Active'} />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
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
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
          )}
        </TabsContent>
        <TabsContent value="access" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Access controls</CardTitle>
              <CardDescription>
                Hold blocks logins without hiding the tenant. Soft-delete hides it from the default
                list and also blocks logins. A reason is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid max-w-lg gap-4">
              <Field label="Reason">
                <AdminInput
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </Field>
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
                    variant="destructive"
                    onClick={() =>
                      void runAction(
                        api.onboarding.deactivateInstitution,
                        'Institution deactivated.',
                      )
                    }
                  >
                    Soft-delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="flags" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature flags</CardTitle>
              <CardDescription>
                Plan defaults plus per-tenant overrides. Toggling here only affects this
                institution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {entitlements?.flags.map((flag) => (
                  <li key={flag.key} className="flex items-center justify-between gap-2">
                    <span>
                      {flag.name} ({entitlements.planCode})
                    </span>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(checked) => {
                        void (async () => {
                          try {
                            setEntitlements(
                              await api.onboarding.setInstitutionFlag(institutionId, {
                                key: flag.key,
                                enabled: checked,
                              }),
                            );
                          } catch (err) {
                            setError(formatApiError(err, 'Could not update flag.'));
                          }
                        })();
                      }}
                      aria-label={flag.name}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <DataTable headers={['Action', 'Actor', 'When', 'Reason']}>
              {activity.map((row) => (
                <TableRow key={row.auditLogId}>
                  <TableCell className="font-medium">{row.action}</TableCell>
                  <TableCell>{row.actorEmail ?? '—'}</TableCell>
                  <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{row.reasonCode ?? '—'}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          )}
        </TabsContent>
      </Tabs>
    </PageStack>
  );
}
