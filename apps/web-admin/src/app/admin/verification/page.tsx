'use client';

import { useEffect, useState } from 'react';
import type {
  CompanyVerificationReviewDetailDto,
  IntegrityQueueItemDto,
  VerificationQueueItemDto,
} from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  ShieldCheck,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  Field,
  InlineAlert,
  PageStack,
  SeverityBadge,
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

export default function VerificationPage() {
  const [items, setItems] = useState<VerificationQueueItemDto[]>([]);
  const [escalations, setEscalations] = useState<IntegrityQueueItemDto[]>([]);
  const [selectedEscalation, setSelectedEscalation] = useState<IntegrityQueueItemDto | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<VerificationQueueItemDto | null>(null);
  const [companyDetail, setCompanyDetail] = useState<CompanyVerificationReviewDetailDto | null>(
    null,
  );
  const [reviewReason, setReviewReason] = useState('');
  const [tenantReason, setTenantReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  async function loadData() {
    try {
      const [queueItems, escalatedItems] = await Promise.all([
        api.onboarding.verificationQueue(),
        api.onboarding.integrityQueue('ESCALATED'),
      ]);
      setItems(queueItems);
      setEscalations(escalatedItems);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load verification data from database.'));
    }
  }

  useEffect(() => {
    loadData().catch(() => {});
  }, []);

  async function openCompanyReview(item: VerificationQueueItemDto) {
    if (item.tenantType !== 'company') {
      setSelectedCompany(item);
      setCompanyDetail(null);
      return;
    }
    setSelectedCompany(item);
    setError(null);
    try {
      setCompanyDetail(await api.onboarding.companyVerificationReview(item.tenantId));
    } catch (err) {
      setCompanyDetail(null);
      setError(isSmartApiError(err) ? err.message : 'Could not load company review details.');
    }
  }

  async function resolveTenant(item: VerificationQueueItemDto, decision: 'APPROVED' | 'REJECTED') {
    // A company rejection is emailed to the applicant, so it needs a note they can act on.
    if (
      decision === 'REJECTED' &&
      item.tenantType === 'company' &&
      tenantReason.trim().length < 8
    ) {
      setError(
        'Tell the company what to change (at least 8 characters). This note is emailed to them.',
      );
      return;
    }
    setError(null);
    try {
      await api.onboarding.resolveVerification(item.tenantId, {
        tenantType: item.tenantType,
        decision,
        reason: tenantReason.trim() || `${decision} via Verification Pipeline Monitor`,
        submissionId: item.submissionId,
      });
      setTenantReason('');
      setSelectedCompany(null);
      setCompanyDetail(null);
      setActionNotice(`Resolved ${item.name} with decision: ${decision}.`);
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Could not resolve verification.'));
    }
  }

  async function resolveCandidateEscalation(resolution: 'CLEAR' | 'VOID' | 'ESCALATE') {
    if (!selectedEscalation) return;
    if (reviewReason.trim().length < 8) {
      setError('Enter an audit review note of at least 8 characters.');
      return;
    }
    setError(null);
    try {
      await api.onboarding.resolveIntegrity(selectedEscalation.attemptId, {
        resolution,
        reason: reviewReason.trim(),
      });
      setActionNotice(`Candidate assessment status updated with resolution: ${resolution}.`);
      setSelectedEscalation(null);
      setReviewReason('');
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Could not resolve candidate escalation.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={BadgeCheck}
        tone="muted"
        title="Verification Pipeline Monitor"
        description="Monitor verification pipeline health, review live escalated assessment attempts, and resolve tenant verification requests."
      />

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {actionNotice ? (
        <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Verification Pipeline Monitor Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-start justify-between gap-3 rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pending Tenant Verifications
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {items.length}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">Tenants awaiting approval in DB</p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-50 text-zinc-700 shadow-2xs">
            <Clock className="size-4" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Escalated Attempts
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {escalations.length}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">Requiring committee review in DB</p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-50 text-zinc-700 shadow-2xs">
            <TrendingUp className="size-4" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pipeline State
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {items.length === 0 && escalations.length === 0 ? 'Clear' : 'Active Queue'}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">Live PostgreSQL monitoring</p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-50 text-zinc-700 shadow-2xs">
            <ShieldCheck className="size-4" />
          </div>
        </div>
      </div>

      {/* Escalations List + Review */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
              Assessment & AI Defense Escalations
            </h3>
            <p className="text-xs text-zinc-500">
              Live escalated candidate attempts requiring Super Admin verification review.
            </p>
          </div>
          <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-zinc-700">
            {escalations.length} {escalations.length === 1 ? 'escalation' : 'escalations'}
          </span>
        </div>

        <DataTable
          headers={[
            'Candidate',
            'Integrity Flag',
            'Risk Severity',
            'Flag Reason',
            'Status',
            'Actions',
          ]}
          empty={escalations.length === 0}
          emptyIcon={ShieldCheck}
        >
          {escalations.map((esc) => {
            const initials =
              esc.studentName
                .split(' ')
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'ST';

            return (
              <TableRow key={esc.attemptId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 text-xs">{esc.studentName}</div>
                      <div className="truncate text-[11px] text-zinc-500">{esc.studentEmail}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-900">
                    {esc.integrityFlag}
                  </span>
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={esc.severity} />
                </TableCell>
                <TableCell className="max-w-sm text-xs text-zinc-600 truncate">
                  {esc.flagReason ?? 'Automated proctoring trigger'}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                    <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse" />
                    {esc.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-[11px] font-semibold rounded-md border-zinc-200 bg-white px-2.5 text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs"
                    onClick={() => setSelectedEscalation(esc)}
                  >
                    <Eye className="h-3 w-3" />
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </div>

      {/* Escalation Review Modal */}
      {selectedEscalation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-md border border-zinc-200/90 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
              <div>
                <h3 className="font-heading text-lg font-bold text-zinc-950 dark:text-zinc-100">
                  Review Candidate Attempt: {selectedEscalation.studentName}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {selectedEscalation.studentEmail} · Attempt: {selectedEscalation.attemptId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEscalation(null)}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                    {selectedEscalation.integrityFlag}
                  </span>
                  <SeverityBadge severity={selectedEscalation.severity} />
                </div>
                <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {selectedEscalation.flagReason ||
                    'Triggered for manual review during assessment run.'}
                </p>
              </div>

              <div>
                <Field label="Admin Resolution Rationale (Logged to Audit Trail)">
                  <AdminInput
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder="Enter audit rationale (at least 8 characters)..."
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs"
                onClick={() => setSelectedEscalation(null)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md border-rose-300 text-rose-700 hover:bg-rose-50 text-xs gap-1"
                onClick={() => void resolveCandidateEscalation('VOID')}
              >
                <XCircle className="h-3.5 w-3.5" />
                Confirm Void
              </Button>

              <Button
                size="sm"
                className="rounded-md bg-zinc-900 hover:bg-black text-white font-semibold text-xs gap-1 shadow-2xs dark:bg-zinc-100 dark:text-zinc-950"
                onClick={() => void resolveCandidateEscalation('CLEAR')}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Clear & Approve
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tenant Verification Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
              Tenant Verification Queue
            </h3>
            <p className="text-xs text-zinc-500">
              Live pending tenant applications in PostgreSQL awaiting platform verification.
            </p>
          </div>
          <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-zinc-700">
            {items.length} pending
          </span>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <Field label="Decision Reason / Verification Notes">
              <AdminInput
                value={tenantReason}
                onChange={(e) => setTenantReason(e.target.value)}
                placeholder="e.g. Verified official registrar domain. For a company rejection, this note is emailed to the applicant."
              />
            </Field>

            <DataTable
              headers={[
                'Tenant & Domain',
                'Type',
                'Domain',
                'Status',
                'Submission Details',
                'Actions',
              ]}
              empty={items.length === 0}
              emptyIcon={BadgeCheck}
            >
              {items.map((item) => {
                const initials =
                  item.name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'TN';

                return (
                  <TableRow key={`${item.tenantType}-${item.tenantId}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 text-xs">{item.name}</div>
                          <div className="font-mono text-[11px] text-zinc-500">
                            {item.domain ?? '—'}
                          </div>
                          {item.representativeEmail ? (
                            <div className="text-[11px] text-zinc-400">
                              {item.representativeEmail}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-700">
                        {item.tenantType.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {item.domain ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                        <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse" />
                        {item.verificationStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.tenantType === 'company' ? (
                        <div className="text-xs text-zinc-600">
                          <span>{item.documentCount ?? 0} docs</span>
                          {item.submittedAt ? (
                            <div className="text-[10px] text-zinc-400">
                              {new Date(item.submittedAt).toLocaleDateString()}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.tenantType === 'company' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50 shadow-2xs gap-1"
                            onClick={() => void openCompanyReview(item)}
                          >
                            <FileText className="h-3.5 w-3.5 text-zinc-600" />
                            Docs
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs gap-1"
                          onClick={() => void resolveTenant(item, 'REJECTED')}
                        >
                          <X className="h-3.5 w-3.5" />
                          {item.tenantType === 'company' ? 'Request changes' : 'Reject'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 bg-zinc-900 text-white hover:bg-black px-2.5 text-[11px] font-semibold gap-1 shadow-2xs"
                          onClick={() => void resolveTenant(item, 'APPROVED')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </DataTable>
          </CardContent>
        </Card>
      </div>

      {/* Company Verification Detail Drawer/Modal */}
      {selectedCompany && companyDetail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-md border border-zinc-200/90 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
              <div>
                <h3 className="font-heading text-lg font-bold text-zinc-950 dark:text-zinc-100">
                  {companyDetail.legalName}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Submission ID: {companyDetail.submissionId} · Country:{' '}
                  {companyDetail.registrationCountry ?? '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCompany(null);
                  setCompanyDetail(null);
                }}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-zinc-200/80 bg-zinc-50 p-4 text-xs space-y-2 dark:border-zinc-800 dark:bg-zinc-800/60">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Representative Email:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {companyDetail.representativeEmail ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Business Reg Number:</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {companyDetail.businessRegistrationNumber ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tax ID:</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {companyDetail.taxId ?? '—'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
                  Uploaded Verification Documents ({companyDetail.documents.length})
                </h4>
                {companyDetail.documents.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No documents uploaded with this submission.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-200/80 rounded-md border border-zinc-200/80">
                    {companyDetail.documents.map((doc) => (
                      <div
                        key={doc.documentId}
                        className="flex items-center justify-between p-3 text-xs bg-white dark:bg-zinc-900"
                      >
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {doc.fileName}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {doc.documentType} · Status: {doc.reviewStatus}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                          <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
                            Download / View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs"
                onClick={() => {
                  setSelectedCompany(null);
                  setCompanyDetail(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md border-rose-300 text-rose-700 hover:bg-rose-50 text-xs gap-1"
                onClick={() => void resolveTenant(selectedCompany, 'REJECTED')}
              >
                <X className="h-3.5 w-3.5" />
                Reject / request changes
              </Button>
              <Button
                size="sm"
                className="rounded-md bg-zinc-900 hover:bg-black text-white font-semibold text-xs gap-1 shadow-2xs dark:bg-zinc-100 dark:text-zinc-950"
                onClick={() => void resolveTenant(selectedCompany, 'APPROVED')}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve Company
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageStack>
  );
}
