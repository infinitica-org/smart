'use client';

import { useEffect, useState } from 'react';
import type { TrustCaseDto, TrustAppealDto, TrustReportDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  FileText,
  Filter,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@smart/ui/tabs';
import { ConfirmDialog } from '@smart/ui';
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

export default function TrustHubPage() {
  const [activeTab, setActiveTab] = useState<'CASES' | 'APPEALS' | 'REPORTS'>('CASES');
  const [cases, setCases] = useState<TrustCaseDto[]>([]);
  const [appeals, setAppeals] = useState<TrustAppealDto[]>([]);
  const [reports, setReports] = useState<TrustReportDto[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  // Enforcement Modal State
  const [enforceModal, setEnforceModal] = useState<{
    open: boolean;
    caseId: string;
    candidateId: string;
    actionType:
      | 'WARN'
      | 'RESTRICT_ASSESSMENTS'
      | 'SUSPEND_VERIFICATION'
      | 'VOID_ATTEMPT'
      | 'VOID_CREDENTIAL'
      | 'BAN_ACCOUNT';
    reason: string;
    expiresAt?: string;
  } | null>(null);

  // Appeal Modal State
  const [appealModal, setAppealModal] = useState<{
    open: boolean;
    appealId: string;
    candidateId: string;
    decision: 'UPHELD' | 'REJECTED';
    reviewNotes: string;
  } | null>(null);

  // Report Modal State
  const [reportModal, setReportModal] = useState<{
    open: boolean;
    reportId: string;
    status: 'ACTION_TAKEN' | 'INVESTIGATING' | 'DISMISSED_INVALID';
    resolutionSummary: string;
    createTrustCase: boolean;
  } | null>(null);

  // Confirmation Dialog
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => Promise<void>;
  } | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'CASES') {
        const query: { status?: string; severity?: string } = {};
        if (statusFilter) query.status = statusFilter;
        if (severityFilter) query.severity = severityFilter;
        const data = await api.trust.listCases(query);
        setCases(data ?? []);
      } else if (activeTab === 'APPEALS') {
        const data = await api.trust.listAppeals(
          statusFilter ? { status: statusFilter } : undefined,
        );
        setAppeals(data ?? []);
      } else if (activeTab === 'REPORTS') {
        const data = await api.trust.listReports(
          statusFilter ? { status: statusFilter } : undefined,
        );
        setReports(data ?? []);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to load data from server.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => {});
  }, [activeTab, statusFilter, severityFilter]);

  /* -------------------------------------------------------------------------- */
  /*                              HANDLERS & ACTIONS                            */
  /* -------------------------------------------------------------------------- */

  async function handleApplyEnforcement() {
    if (!enforceModal) return;
    if (enforceModal.reason.trim().length < 8) {
      setError('Enforcement reason must be at least 8 characters.');
      return;
    }

    try {
      await api.trust.applyEnforcement(enforceModal.caseId, {
        actionType: enforceModal.actionType,
        reason: enforceModal.reason.trim(),
        expiresAt: enforceModal.expiresAt
          ? new Date(enforceModal.expiresAt).toISOString()
          : undefined,
      });
      setNotice(`Enforcement sanction (${enforceModal.actionType}) applied successfully.`);
      setEnforceModal(null);
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Failed to apply enforcement action.'));
    }
  }

  async function handleForceRecalculate(candidateId: string) {
    try {
      await api.trust.forceRecalculation(candidateId);
      setNotice(`Score recalculation queued for candidate ${candidateId}.`);
    } catch (err) {
      setError(formatApiError(err, 'Failed to trigger score recalculation.'));
    }
  }

  async function handleResolveAppeal() {
    if (!appealModal) return;
    if (appealModal.reviewNotes.trim().length < 8) {
      setError('Review notes must be at least 8 characters.');
      return;
    }

    try {
      await api.trust.resolveAppeal(appealModal.appealId, {
        decision: appealModal.decision,
        reviewNotes: appealModal.reviewNotes.trim(),
      });
      setNotice(`Appeal resolved as ${appealModal.decision}.`);
      setAppealModal(null);
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Failed to resolve appeal.'));
    }
  }

  async function handleResolveReport() {
    if (!reportModal) return;
    if (reportModal.resolutionSummary.trim().length < 8) {
      setError('Resolution summary must be at least 8 characters.');
      return;
    }

    try {
      await api.trust.resolveReport(reportModal.reportId, {
        status: reportModal.status,
        resolutionSummary: reportModal.resolutionSummary.trim(),
        createTrustCase: reportModal.createTrustCase,
      });
      setNotice(`Report resolved (${reportModal.status}).`);
      setReportModal(null);
      await loadData();
    } catch (err) {
      setError(formatApiError(err, 'Failed to resolve report.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={ShieldAlert}
        tone="inverse"
        title="Trust & Enforcement Hub"
        description="Unified architecture for candidate trust cases, multi-tier enforcement sanctions, appeals, and abuse reporting (T26–T34)."
      />

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {notice ? (
        <div className="flex items-center justify-between rounded-md border border-zinc-200/80 bg-zinc-50 p-3.5 text-sm text-zinc-900">
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
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as 'CASES' | 'APPEALS' | 'REPORTS');
          setStatusFilter('');
          setSeverityFilter('');
        }}
      >
        <TabsList>
          <TabsTrigger value="CASES">
            <ShieldAlert />
            Trust Cases
          </TabsTrigger>
          <TabsTrigger value="APPEALS">
            <FileText />
            Appeals Queue
          </TabsTrigger>
          <TabsTrigger value="REPORTS">
            <AlertTriangle />
            Abuse Reports
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4 flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
            <Filter className="h-4 w-4" />
            Filters:
          </div>

          <Field label="Status">
            <select
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {activeTab === 'CASES' ? (
                <>
                  <option value="OPEN">Open</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="ACTION_TAKEN">Action Taken</option>
                  <option value="DISMISSED">Dismissed</option>
                </>
              ) : activeTab === 'APPEALS' ? (
                <>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="UPHELD">Upheld</option>
                  <option value="REJECTED">Rejected</option>
                </>
              ) : (
                <>
                  <option value="RECEIVED">Received</option>
                  <option value="INVESTIGATING">Investigating</option>
                  <option value="ACTION_TAKEN">Action Taken</option>
                  <option value="DISMISSED_INVALID">Dismissed Invalid</option>
                </>
              )}
            </select>
          </Field>

          {activeTab === 'CASES' ? (
            <Field label="Severity">
              <select
                className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="">All Severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </Field>
          ) : null}

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 ml-auto text-xs gap-1"
            onClick={() => loadData()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Main Content Tables */}
      {activeTab === 'CASES' ? (
        <DataTable
          headers={[
            'Case ID',
            'Candidate ID',
            'Severity',
            'Status',
            'Summary',
            'Assigned Admin',
            'Actions',
          ]}
          empty={cases.length === 0}
          emptyIcon={ShieldCheck}
        >
          {cases.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-[11px] font-bold text-zinc-700">
                {item.id.slice(0, 8)}...
              </TableCell>
              <TableCell className="font-mono text-xs text-zinc-900">
                {item.candidateId.slice(0, 8)}...
              </TableCell>
              <TableCell>
                <SeverityBadge severity={item.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} />
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-bold text-zinc-800">
                  {item.status}
                </span>
              </TableCell>
              <TableCell className="text-xs text-zinc-600 max-w-xs truncate">
                {item.summary}
              </TableCell>
              <TableCell className="text-xs text-zinc-700 font-mono">
                {item.assignedAdminId ? `${item.assignedAdminId.slice(0, 8)}...` : 'Unassigned'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 text-[11px] font-semibold gap-1"
                    onClick={() =>
                      setEnforceModal({
                        open: true,
                        caseId: item.id,
                        candidateId: item.candidateId,
                        actionType: 'RESTRICT_ASSESSMENTS',
                        reason: '',
                      })
                    }
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Enforce
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-200 text-[11px] font-semibold gap-1"
                    onClick={() => handleForceRecalculate(item.candidateId)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Recalculate
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      ) : activeTab === 'APPEALS' ? (
        <DataTable
          headers={['Appeal ID', 'Candidate ID', 'Reason', 'Status', 'Submitted At', 'Actions']}
          empty={appeals.length === 0}
          emptyIcon={ShieldCheck}
        >
          {appeals.map((appeal) => (
            <TableRow key={appeal.id}>
              <TableCell className="font-mono text-[11px] font-bold text-zinc-700">
                {appeal.id.slice(0, 8)}...
              </TableCell>
              <TableCell className="font-mono text-xs text-zinc-900">
                {appeal.candidateId.slice(0, 8)}...
              </TableCell>
              <TableCell className="text-xs text-zinc-600 max-w-sm truncate">
                {appeal.reason}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-bold text-zinc-800">
                  {appeal.status}
                </span>
              </TableCell>
              <TableCell className="text-xs font-mono text-zinc-600">
                {new Date(appeal.submittedAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                {appeal.status === 'SUBMITTED' || appeal.status === 'UNDER_REVIEW' ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold gap-1"
                      onClick={() =>
                        setAppealModal({
                          open: true,
                          appealId: appeal.id,
                          candidateId: appeal.candidateId,
                          decision: 'UPHELD',
                          reviewNotes: '',
                        })
                      }
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Uphold & Lift
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-7 text-[11px] font-semibold gap-1"
                      onClick={() =>
                        setAppealModal({
                          open: true,
                          appealId: appeal.id,
                          candidateId: appeal.candidateId,
                          decision: 'REJECTED',
                          reviewNotes: '',
                        })
                      }
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 font-semibold">Resolved</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      ) : (
        <DataTable
          headers={['Report ID', 'Category', 'Target User ID', 'Status', 'Description', 'Actions']}
          empty={reports.length === 0}
          emptyIcon={ShieldCheck}
        >
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-mono text-[11px] font-bold text-zinc-700">
                {report.id.slice(0, 8)}...
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  {report.category}
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs text-zinc-800">
                {report.targetUserId ? `${report.targetUserId.slice(0, 8)}...` : 'N/A'}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-bold text-zinc-800">
                  {report.status}
                </span>
              </TableCell>
              <TableCell className="text-xs text-zinc-600 max-w-sm truncate">
                {report.description}
              </TableCell>
              <TableCell className="text-right">
                {report.status === 'RECEIVED' || report.status === 'INVESTIGATING' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-200 text-[11px] font-semibold gap-1"
                    onClick={() =>
                      setReportModal({
                        open: true,
                        reportId: report.id,
                        status: 'ACTION_TAKEN',
                        resolutionSummary: '',
                        createTrustCase: true,
                      })
                    }
                  >
                    Resolve & Moderate
                  </Button>
                ) : (
                  <span className="text-xs text-zinc-400 font-semibold">Resolved</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}

      {/* Enforcement Modal */}
      {enforceModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>Apply Enforcement Sanction</CardTitle>
              <CardDescription>
                Apply structured domain sanction to Candidate ID{' '}
                {enforceModal.candidateId.slice(0, 8)}...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Sanction Tier">
                <select
                  className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold"
                  value={enforceModal.actionType}
                  onChange={(e) =>
                    setEnforceModal({
                      ...enforceModal,
                      actionType: e.target.value as
                        | 'WARN'
                        | 'RESTRICT_ASSESSMENTS'
                        | 'SUSPEND_VERIFICATION'
                        | 'VOID_ATTEMPT'
                        | 'VOID_CREDENTIAL'
                        | 'BAN_ACCOUNT',
                    })
                  }
                >
                  <option value="WARN">WARN — Send Official Advisory Notice</option>
                  <option value="RESTRICT_ASSESSMENTS">
                    RESTRICT_ASSESSMENTS — Lock Retakes / Assessments
                  </option>
                  <option value="SUSPEND_VERIFICATION">
                    SUSPEND_VERIFICATION — Hold Verification & Credentials
                  </option>
                  <option value="VOID_ATTEMPT">VOID_ATTEMPT — Invalidate Attempt Score</option>
                  <option value="VOID_CREDENTIAL">VOID_CREDENTIAL — Invalidate Credentials</option>
                  <option value="BAN_ACCOUNT">BAN_ACCOUNT — Full Platform Suspension</option>
                </select>
              </Field>

              <Field label="Reason / Justification (Min 8 chars)">
                <AdminInput
                  value={enforceModal.reason}
                  onChange={(e) => setEnforceModal({ ...enforceModal, reason: e.target.value })}
                  placeholder="e.g. Confirmed unassisted proctoring anomaly across multiple attempts."
                />
              </Field>

              <Field label="Expiration Date (Optional)">
                <input
                  type="datetime-local"
                  className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold"
                  value={enforceModal.expiresAt ?? ''}
                  onChange={(e) => setEnforceModal({ ...enforceModal, expiresAt: e.target.value })}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEnforceModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleApplyEnforcement}
                >
                  Apply Sanction
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Appeal Resolution Modal */}
      {appealModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>Resolve Appeal ({appealModal.decision})</CardTitle>
              <CardDescription>
                Candidate ID: {appealModal.candidateId.slice(0, 8)}...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Review Notes (Min 8 chars)">
                <AdminInput
                  value={appealModal.reviewNotes}
                  onChange={(e) => setAppealModal({ ...appealModal, reviewNotes: e.target.value })}
                  placeholder="e.g. Verified supplementary identity documentation and cleared anomaly."
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAppealModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={
                    appealModal.decision === 'UPHELD'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-rose-600 text-white hover:bg-rose-700'
                  }
                  onClick={handleResolveAppeal}
                >
                  Submit Decision ({appealModal.decision})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Report Resolution Modal */}
      {reportModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>Resolve Abuse Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Resolution Status">
                <select
                  className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold"
                  value={reportModal.status}
                  onChange={(e) =>
                    setReportModal({
                      ...reportModal,
                      status: e.target.value as
                        'ACTION_TAKEN' | 'INVESTIGATING' | 'DISMISSED_INVALID',
                    })
                  }
                >
                  <option value="ACTION_TAKEN">ACTION_TAKEN — Action Taken</option>
                  <option value="INVESTIGATING">INVESTIGATING — Mark Under Investigation</option>
                  <option value="DISMISSED_INVALID">DISMISSED_INVALID — Dismiss Report</option>
                </select>
              </Field>

              <Field label="Resolution Summary (Min 8 chars)">
                <AdminInput
                  value={reportModal.resolutionSummary}
                  onChange={(e) =>
                    setReportModal({ ...reportModal, resolutionSummary: e.target.value })
                  }
                  placeholder="e.g. Report validated; minted trust case for investigation."
                />
              </Field>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="createCase"
                  checked={reportModal.createTrustCase}
                  onChange={(e) =>
                    setReportModal({ ...reportModal, createTrustCase: e.target.checked })
                  }
                />
                <label htmlFor="createCase" className="text-xs font-semibold text-zinc-800">
                  Automatically mint a Trust Case for target candidate
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReportModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-zinc-900 text-white"
                  onClick={handleResolveReport}
                >
                  Resolve Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Confirmation Dialog */}
      {confirmModal ? (
        <ConfirmDialog
          open={confirmModal.open}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText={confirmModal.confirmText}
          variant={confirmModal.variant}
        />
      ) : null}
    </PageStack>
  );
}
