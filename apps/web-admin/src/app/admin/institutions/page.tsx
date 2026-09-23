'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import type { InstitutionDto, InstitutionListStatus, PlanCode } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import {
  Check,
  CheckCircle2,
  Filter,
  GraduationCap,
  Plus,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
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

export default function InstitutionsPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'directory' | 'create'>('queue');
  const [institutions, setInstitutions] = useState<InstitutionDto[]>([]);
  const [selectedQueueIds, setSelectedQueueIds] = useState<Set<string>>(new Set());
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [_loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [q, setQ] = useState('');
  const [planCode, setPlanCode] = useState<PlanCode | ''>('');
  const [status, setStatus] = useState<InstitutionListStatus | ''>('');
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const allInstitutions = await api.onboarding.listInstitutions({
        q: q.trim() || undefined,
        planCode: planCode || undefined,
        status: status || undefined,
      });
      setInstitutions(allInstitutions);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load institutions from database.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => {});
  }, []);

  // Pending provisioning queue: institutions with verificationStatus === 'PENDING'
  const pendingQueue = institutions.filter((inst) => inst.verificationStatus === 'PENDING');

  const _toggleSelectAll = () => {
    if (selectedQueueIds.size === pendingQueue.length) {
      setSelectedQueueIds(new Set());
    } else {
      setSelectedQueueIds(new Set(pendingQueue.map((r) => r.institutionId)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedQueueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (decision: 'APPROVED' | 'REJECTED') => {
    const ids = Array.from(selectedQueueIds);
    if (ids.length === 0) return;

    try {
      await Promise.all(
        ids.map((institutionId) =>
          api.onboarding.resolveVerification(institutionId, {
            tenantType: 'institution',
            decision,
            reason: `Bulk ${decision.toLowerCase()} by Super Admin`,
          }),
        ),
      );
      setSelectedQueueIds(new Set());
      setQueueNotice(
        decision === 'APPROVED'
          ? `Successfully approved and provisioned ${ids.length} universities.`
          : `Rejected ${ids.length} university requests.`,
      );
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Bulk operation failed.'));
    }
  };

  const handleSingleAction = async (institutionId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await api.onboarding.resolveVerification(institutionId, {
        tenantType: 'institution',
        decision,
        reason: `${decision} via Super Admin portal`,
      });
      setQueueNotice(`Institution status updated to ${decision}.`);
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Action failed.'));
    }
  };

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.onboarding.createInstitution({
        name: name.trim(),
        domain: domain.trim(),
      });
      setName('');
      setDomain('');
      setActiveTab('directory');
      setQueueNotice(`Created and provisioned tenant for ${name.trim()}.`);
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Could not create institution in database.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={GraduationCap}
        title="Universities & Provisioning Queue"
        description="Review university applications, provision campus tenants, and manage whitelist domains directly from the database."
      />

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {queueNotice ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{queueNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setQueueNotice(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`relative rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'queue'
              ? 'bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          Provisioning Queue
          {pendingQueue.length > 0 ? (
            <span
              className={`ml-2 rounded-md px-1.5 py-0.2 text-[10px] ${
                activeTab === 'queue'
                  ? 'bg-white text-zinc-900 font-bold'
                  : 'bg-rose-500 text-white font-bold'
              }`}
            >
              {pendingQueue.length}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'directory'
              ? 'bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          All Universities ({institutions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`inline-flex items-center gap-1 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'create'
              ? 'bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          <Plus className="size-3.5" />
          Provision University
        </button>
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-0.5">
            <div>
              <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
                University Provisioning Queue
              </h3>
              <p className="text-xs text-zinc-500">
                Review pending institution signups, verify official domains, and provision TPO
                workspaces.
              </p>
            </div>

            {selectedQueueIds.size > 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-zinc-200/80 bg-zinc-50 p-1.5 animate-in fade-in">
                <span className="px-2 text-xs font-semibold text-zinc-900">
                  {selectedQueueIds.size} selected
                </span>
                <Button
                  size="sm"
                  className="h-7 bg-zinc-900 hover:bg-black text-white font-semibold text-xs gap-1 rounded-md shadow-2xs"
                  onClick={() => void handleBulkAction('APPROVED')}
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve selected ({selectedQueueIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs gap-1 rounded-md shadow-2xs"
                  onClick={() => void handleBulkAction('REJECTED')}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject selected
                </Button>
              </div>
            ) : null}
          </div>

          <DataTable
            headers={[
              '',
              'School & Domain',
              'Enrolled Students',
              'Pending Invites',
              'Status',
              'Actions',
            ]}
            empty={pendingQueue.length === 0}
            emptyIcon={GraduationCap}
          >
            {pendingQueue.map((inst) => {
              const isSelected = selectedQueueIds.has(inst.institutionId);
              const initials =
                inst.name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'UN';

              return (
                <TableRow key={inst.institutionId} className={isSelected ? 'bg-zinc-100/70' : ''}>
                  <TableCell className="w-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(inst.institutionId)}
                      aria-label={`Select ${inst.name}`}
                      className="rounded border-zinc-300 accent-zinc-900 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 text-xs">{inst.name}</div>
                        <div className="font-mono text-[11px] text-zinc-500">{inst.domain}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium text-zinc-700">
                    {inst.studentCount}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-500">
                    {inst.invitePendingCount}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                      <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse" />
                      Pending Review
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs gap-1"
                        onClick={() => void handleSingleAction(inst.institutionId, 'REJECTED')}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 bg-zinc-900 text-white hover:bg-black px-2.5 text-[11px] font-semibold gap-1 shadow-2xs"
                        onClick={() => void handleSingleAction(inst.institutionId, 'APPROVED')}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Provision
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </DataTable>
        </div>
      )}

      {activeTab === 'directory' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
                University Directory
              </h3>
              <p className="text-xs text-zinc-500">Filter and manage all live campus tenants.</p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              loadData().catch((err) =>
                setError(formatApiError(err, 'Failed to load institutions.')),
              );
            }}
          >
            <FilterBar>
              <Field label="Search">
                <AdminInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name or domain"
                />
              </Field>
              <Field label="Plan">
                <NativeSelect
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value as PlanCode | '')}
                >
                  <option value="">All plans</option>
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                </NativeSelect>
              </Field>
              <Field label="Status">
                <NativeSelect
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InstitutionListStatus | '')}
                >
                  <option value="">Active + on hold</option>
                  <option value="ACTIVE">Active</option>
                  <option value="HELD">On hold</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </NativeSelect>
              </Field>
              <Button type="submit" variant="outline" className={controlButtonClassName}>
                <Filter data-icon="inline-start" />
                Apply filters
              </Button>
            </FilterBar>
          </form>

          <DataTable
            headers={[
              'Institution',
              'Domain Whitelist',
              'Plan Tier',
              'Students',
              'Pending Invites',
              'Status',
              'Actions',
            ]}
            empty={institutions.length === 0}
            emptyIcon={GraduationCap}
          >
            {institutions.map((inst) => {
              const initials =
                inst.name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'UN';

              return (
                <TableRow key={inst.institutionId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/institutions/${inst.institutionId}`}
                          className="font-bold text-zinc-900 hover:underline text-xs"
                        >
                          {inst.name}
                        </Link>
                        <div className="truncate text-[11px] text-zinc-500">{inst.domain}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-600">{inst.domain}</TableCell>
                  <TableCell>
                    <BadgeLike>{inst.planCode}</BadgeLike>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-zinc-900">
                    {inst.studentCount}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-500">
                    {inst.invitePendingCount}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        inst.deactivatedAt ? 'Deactivated' : inst.heldAt ? 'On hold' : 'Active'
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs"
                      asChild
                    >
                      <Link href={`/admin/institutions/${inst.institutionId}`}>Manage</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </DataTable>
        </div>
      )}

      {activeTab === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle>Provision New University Tenant</CardTitle>
            <CardDescription>
              Directly provision a partner university into PostgreSQL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate}>
              <FormGrid>
                <Field label="University / School Name">
                  <AdminInput value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
                <Field label="Domain Whitelist">
                  <AdminInput
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g. psgtech.ac.in or nitt.edu"
                    required
                  />
                </Field>
                <FormActions>
                  <Button type="submit" className={controlButtonClassName}>
                    <Plus data-icon="inline-start" />
                    Provision Institution
                  </Button>
                </FormActions>
              </FormGrid>
            </form>
          </CardContent>
        </Card>
      )}
    </PageStack>
  );
}

function BadgeLike({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-100/80 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}
