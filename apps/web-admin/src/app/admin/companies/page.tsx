'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import type { CompanyDto, InstitutionListStatus } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import {
  Building2,
  CheckCircle2,
  FileQuestion,
  Filter,
  Plus,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { Textarea } from '@smart/ui/textarea';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
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

export default function CompaniesPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'directory' | 'create'>('queue');
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [infoModalCompany, setInfoModalCompany] = useState<CompanyDto | null>(null);
  const [infoText, setInfoText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [sector, setSector] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<InstitutionListStatus | ''>('');
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      const data = await api.onboarding.listCompanies({
        q: q.trim() || undefined,
        status: status || undefined,
      });
      setCompanies(data);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load companies from database.'));
    }
  }

  useEffect(() => {
    loadData().catch(() => {});
  }, []);

  const pendingCompanies = companies.filter((c) => c.verificationStatus === 'PENDING');

  const handleResolve = async (
    companyId: string,
    decision: 'APPROVED' | 'REJECTED',
    reasonMsg?: string,
  ) => {
    try {
      await api.onboarding.resolveVerification(companyId, {
        tenantType: 'company',
        decision,
        reason: reasonMsg || `${decision} by Super Admin`,
      });
      setNotice(`Company status updated to ${decision}.`);
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Action failed.'));
    }
  };

  const handleRequestInfoSubmit = async () => {
    if (!infoModalCompany || !infoText.trim()) return;
    try {
      await api.onboarding.resolveVerification(infoModalCompany.companyId, {
        tenantType: 'company',
        decision: 'REJECTED',
        reason: `More information requested: ${infoText.trim()}`,
      });
      setNotice(`Requested more info from ${infoModalCompany.name}. Status updated.`);
      setInfoModalCompany(null);
      setInfoText('');
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Action failed.'));
    }
  };

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return;
    try {
      await api.onboarding.createCompany({
        name: name.trim(),
        domain: domain.trim() || undefined,
        sector: sector.trim() || undefined,
      });
      setName('');
      setDomain('');
      setSector('');
      setActiveTab('directory');
      setNotice(`Created employer partner ${name.trim()}.`);
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Could not create company.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={Building2}
        title="Employers & Verification Queue"
        description="Verify hiring partners, review legal incorporation records, and manage company workspaces directly in PostgreSQL."
      />

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {notice ? (
        <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
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
          Verification Queue
          {pendingCompanies.length > 0 ? (
            <span
              className={`ml-2 rounded-md px-1.5 py-0.2 text-[10px] ${
                activeTab === 'queue'
                  ? 'bg-white text-zinc-900 font-bold'
                  : 'bg-rose-500 text-white font-bold'
              }`}
            >
              {pendingCompanies.length}
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
          All Employers ({companies.length})
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
          Add Company
        </button>
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
                Employer Verification Queue
              </h3>
              <p className="text-xs text-zinc-500">
                Review registered employer legal status, domain match, and authorize campus
                placement drive access.
              </p>
            </div>
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-zinc-700">
              {pendingCompanies.length} pending
            </span>
          </div>

          <DataTable
            headers={['Company & Domain', 'Plan Tier', 'Status', 'Actions']}
            empty={pendingCompanies.length === 0}
            emptyIcon={Building2}
          >
            {pendingCompanies.map((company) => {
              const initials =
                company.name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'CO';

              return (
                <TableRow key={company.companyId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 text-xs">{company.name}</div>
                        <div className="font-mono text-[11px] text-zinc-500">
                          {company.domain ?? 'No domain attached'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <BadgeLike>{company.planCode}</BadgeLike>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                      <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse" />
                      Pending Verification
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs gap-1"
                        onClick={() => void handleResolve(company.companyId, 'REJECTED')}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs gap-1"
                        onClick={() => setInfoModalCompany(company)}
                      >
                        <FileQuestion className="h-3.5 w-3.5" />
                        Request info
                      </Button>

                      <Button
                        size="sm"
                        className="h-7 bg-zinc-900 text-white hover:bg-black px-2.5 text-[11px] font-semibold gap-1 shadow-2xs"
                        onClick={() => void handleResolve(company.companyId, 'APPROVED')}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </DataTable>
        </div>
      )}

      {/* Request More Info Modal */}
      {infoModalCompany ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-md border border-zinc-200/90 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-heading text-lg font-bold text-zinc-950 dark:text-zinc-100">
              Request Additional Info: {infoModalCompany.name}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Provide instructions to the employer regarding missing documentation or legal
              certificates.
            </p>

            <Textarea
              value={infoText}
              onChange={(e) => setInfoText(e.target.value)}
              placeholder="e.g. Please upload GST-3B certificate and proof of registered office address."
              className="mt-4"
              rows={4}
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                onClick={() => setInfoModalCompany(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-zinc-900 text-white hover:bg-black font-bold rounded-md dark:bg-zinc-100 dark:text-zinc-950"
                onClick={() => void handleRequestInfoSubmit()}
              >
                Send Request & Update Status
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'directory' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
                Employer Directory
              </h3>
              <p className="text-xs text-zinc-500">
                Filter and manage all hiring corporate partners.
              </p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              loadData().catch(() => setError('Filter failed.'));
            }}
          >
            <FilterBar>
              <Field label="Search">
                <AdminInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Company name or domain"
                />
              </Field>
              <Field label="Status">
                <NativeSelect
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InstitutionListStatus | '')}
                  aria-label="Status"
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="HELD">Held</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </NativeSelect>
              </Field>
              <Button type="submit" variant="outline" className={controlButtonClassName}>
                <Filter data-icon="inline-start" />
                Filter
              </Button>
            </FilterBar>
          </form>

          <DataTable
            headers={['Company', 'Domain Whitelist', 'Plan Tier', 'Status', 'Actions']}
            empty={companies.length === 0}
            emptyIcon={Building2}
          >
            {companies.map((company) => {
              const initials =
                company.name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'CO';

              return (
                <TableRow key={company.companyId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/companies/${company.companyId}`}
                          className="font-bold text-zinc-900 hover:underline text-xs"
                        >
                          {company.name}
                        </Link>
                        <div className="truncate text-[11px] text-zinc-500">
                          {company.domain ?? 'No domain attached'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-600">
                    {company.domain ?? '—'}
                  </TableCell>
                  <TableCell>
                    <BadgeLike>{company.planCode}</BadgeLike>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        company.deactivatedAt
                          ? 'Deactivated'
                          : company.heldAt
                            ? 'On hold'
                            : 'Active'
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
                      <Link href={`/admin/companies/${company.companyId}`}>Manage</Link>
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
            <CardTitle>Add Company Partner</CardTitle>
            <CardDescription>Register a new enterprise partner in the database.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate}>
              <FormGrid>
                <Field label="Name">
                  <AdminInput value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
                <Field label="Industry domain">
                  <AdminInput
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g. tech or enterprise"
                  />
                </Field>
                <Field label="Sector">
                  <AdminInput
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="e.g. Information Technology"
                  />
                </Field>
                <FormActions>
                  <Button type="submit" className={controlButtonClassName}>
                    <Plus data-icon="inline-start" />
                    Add company
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
