'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Copy,
  RotateCcw,
  Trash2,
  Lock,
  UserPlus,
  Mail,
  ShieldCheck,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { BatchDto, BatchMemberDto } from '@smart/contracts';
import { BatchImportWizard } from '../batch-import-wizard';
import { TpoBentoPageHeader } from '../tpo-bento/TpoBentoPageHeader';
import { api } from '../../lib/api';
import { validateInstitutionEmail } from '../../lib/domain-validation';
import { loadAutoApproveInvites, loadExtraEmailDomains } from '../../lib/tpo-institution-settings';
import {
  bentoCardMutedClass,
  bentoChipClass,
  bentoCompactCardClass,
  bentoCompactToolbarClass,
  bentoSegmentTabActiveClass,
  bentoSegmentTabIdleClass,
  bentoSegmentedTabsClass,
  candidatesControlClass,
  candidatesPageStackClass,
  bentoTableBodyRowClass,
  bentoTableCellClass,
  bentoTableClass,
  bentoTableHeadCellClass,
  bentoTableHeadRowClass,
  bentoTableShellClass,
  dashboardErrorNoticeClass,
  dashboardMetricHintClass,
  dashboardMintBadgeClass,
  dashboardPendingBadgeClass,
  dashboardPillClass,
  dashboardPrimaryButtonClass,
  dashboardRoseBadgeClass,
  dashboardSuccessNoticeClass,
  dashboardSectionTitleClass,
} from '../../lib/tpo-dashboard-ui';
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
  secondaryButtonSmClass,
} from '../../lib/tpo-ui';

// ─────────────────── helpers ────────────────────

function extractEmailsFromText(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,;\s]+/)
        .map((s) =>
          s
            .trim()
            .toLowerCase()
            .replace(/^['"]+|['"]+$/g, ''),
        )
        .filter((s) => s.includes('@') && s.includes('.')),
    ),
  );
}

function safeMsg(err: unknown, fallback: string): string {
  if (isSmartApiError(err)) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || 'ST').toUpperCase();
}

// ─────────────────── component ────────────────────

export function WhitelistWorkspace() {
  // Domain and batch scaffold
  const [domain, setDomain] = useState<string | null>(null);
  const [extraDomains, setExtraDomains] = useState<string[]>([]);
  const [autoApproveInvites, setAutoApproveInvites] = useState(true);
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [scaffoldLoading, setScaffoldLoading] = useState(true);
  const [bulkFileImportEnabled, setBulkFileImportEnabled] = useState(true);
  const [newBatchName, setNewBatchName] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Onboarding mode tabs
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single candidate
  const [singleName, setSingleName] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [singleGroupLabel, setSingleGroupLabel] = useState('');
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Bulk paste
  const [bulkText, setBulkText] = useState('');
  const [parsedBulk, setParsedBulk] = useState<{ email: string; isValid: boolean }[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Invitation roster (for selected batch)
  const [members, setMembers] = useState<BatchMemberDto[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Global feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // ── Load entitlements + batches ──
  async function loadScaffold() {
    setScaffoldLoading(true);
    try {
      const [me, ent, batchList] = await Promise.all([
        api.auth.me(),
        api.onboarding.tpoEntitlements(),
        api.onboarding.listBatches(),
      ]);
      setDomain(ent.domain ?? null);
      setBulkFileImportEnabled(
        ent.flags?.find((f) => f.key === 'bulk_batch_import')?.enabled ?? true,
      );
      const inst = me.institutionId ?? null;
      if (inst) {
        setExtraDomains(loadExtraEmailDomains(inst));
        setAutoApproveInvites(loadAutoApproveInvites(inst));
      }
      setBatches(batchList);
      if (batchList.length > 0 && !selectedBatchId) {
        setSelectedBatchId(batchList[0]?.batchId ?? '');
      }
    } catch {
      setError('Failed to load institution data. Please refresh.');
    } finally {
      setScaffoldLoading(false);
    }
  }

  const loadMembersRef = useRef(0);

  // ── Load invitation roster for selected batch ──
  const loadMembers = useCallback(async () => {
    if (!selectedBatchId) {
      setMembers([]);
      return;
    }
    const requestId = ++loadMembersRef.current;
    setRosterLoading(true);
    try {
      const data = await api.onboarding.listBatchMembers(selectedBatchId);
      if (requestId === loadMembersRef.current) {
        setMembers(data);
      }
    } catch {
      if (requestId === loadMembersRef.current) {
        setError('Failed to load candidate roster.');
      }
    } finally {
      if (requestId === loadMembersRef.current) {
        setRosterLoading(false);
      }
    }
  }, [selectedBatchId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Whitelist · SMART TPO';
    }
    void loadScaffold();
  }, []); // loadScaffold intentionally omitted — it only runs on mount

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  // ── Auto-dismiss notifications after 5s ──
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  // ── Domain validation ──
  function checkDomain(email: string): boolean {
    return validateInstitutionEmail(email, domain, extraDomains);
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    const name = newBatchName.trim();
    if (!name) return;
    setCreatingBatch(true);
    setError(null);
    try {
      const created = await api.onboarding.createBatch({ name });
      const batchList = await api.onboarding.listBatches();
      setBatches(batchList);
      setSelectedBatchId(created.batchId);
      setNewBatchName('');
      setSuccessMsg(`Batch "${name}" created. You can upload candidates now.`);
    } catch {
      setError('Could not create batch. Try a different name.');
    } finally {
      setCreatingBatch(false);
    }
  }

  async function queueBatchInvitesIfEnabled(batchId: string): Promise<string | null> {
    if (!autoApproveInvites) return null;
    try {
      await api.onboarding.sendBatchInvites(batchId);
      return null;
    } catch {
      return 'Candidates added but invitation emails could not be queued.';
    }
  }

  // ── Single candidate submit ──
  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const email = singleEmail.trim().toLowerCase();
    const name = singleName.trim();
    const groupLabel = singleGroupLabel.trim() || undefined;
    if (!name || !email) {
      setError('Please enter both the candidate name and email.');
      return;
    }
    if (!selectedBatchId) {
      setError('Please select a batch before onboarding candidates.');
      return;
    }
    if (!checkDomain(email)) {
      setError(
        `Email must match a verified institution domain (Settings → Verified student email domains).`,
      );
      return;
    }
    setSingleSubmitting(true);
    try {
      const member = await api.onboarding.addBatchMember(selectedBatchId, {
        fullName: name,
        email,
        groupLabel,
      });
      let sendError: string | null = null;
      if (member.invitation?.invitationId) {
        try {
          await api.onboarding.resendStudentInvitation(member.invitation.invitationId);
        } catch (caught: unknown) {
          sendError = safeMsg(caught, 'Email delivery failed');
        }
      }
      if (sendError) {
        setError(
          `Candidate ${name} was added to batch, but email delivery failed: ${sendError}. You can retry using "Resend" or use "Copy Link" from the roster below.`,
        );
      } else {
        setSuccessMsg(
          `Invitation sent to ${email}. Candidate will receive a magic link via email.`,
        );
      }
      setSingleName('');
      setSingleEmail('');
      setSingleGroupLabel('');
      await loadMembers();
    } catch (caught) {
      setError(safeMsg(caught, 'Failed to onboard candidate. Please try again.'));
    } finally {
      setSingleSubmitting(false);
    }
  }

  // ── Bulk email parse & submit ──
  function handleBulkParse() {
    setError(null);
    if (!bulkText.trim()) {
      setError('Please paste at least one candidate email address.');
      return;
    }
    const emails = extractEmailsFromText(bulkText);
    if (emails.length === 0) {
      setError('No valid email addresses found in the pasted text.');
      return;
    }
    setParsedBulk(emails.map((em) => ({ email: em, isValid: checkDomain(em) })));
  }

  async function handleBulkSubmit() {
    const valid = parsedBulk.filter((p) => p.isValid);
    if (valid.length === 0) {
      setError('No candidates with the institution domain to provision.');
      return;
    }
    if (!selectedBatchId) {
      setError('Please select a batch.');
      return;
    }
    setBulkSubmitting(true);
    setError(null);
    let added = 0;
    const failed: string[] = [];
    for (const { email } of valid) {
      const namePart = email.split('@')[0] ?? email;
      const fallbackName = namePart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      try {
        await api.onboarding.addBatchMember(selectedBatchId, {
          fullName: fallbackName,
          email,
        });
        added += 1;
      } catch {
        failed.push(email);
      }
    }
    if (added > 0) {
      const inviteError = await queueBatchInvitesIfEnabled(selectedBatchId);
      if (inviteError) setError(inviteError);
      setSuccessMsg(
        autoApproveInvites
          ? `Provisioned ${added} candidate(s) and queued invitations.${failed.length > 0 ? ` ${failed.length} already existed or had errors.` : ''}`
          : `Provisioned ${added} candidate(s). Send invitations from the roster when ready.${failed.length > 0 ? ` ${failed.length} skipped.` : ''}`,
      );
      setBulkText('');
      setParsedBulk([]);
      await loadMembers();
    } else {
      setError(`All ${failed.length} candidate(s) failed. They may already be enrolled.`);
    }
    setBulkSubmitting(false);
  }

  // ── Copy Invite Link ──
  async function handleCopyInviteLink(userId: string) {
    setActionLoadingId(`copy-${userId}`);
    try {
      const { inviteUrl } = await api.onboarding.getStudentInviteLink(userId);
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (caught) {
      setError(safeMsg(caught, 'Could not generate invite link. Please try again.'));
    } finally {
      setActionLoadingId(null);
    }
  }

  // ── Resend Invitation ──
  async function handleResend(invitationId: string) {
    setActionLoadingId(`resend-${invitationId}`);
    setError(null);
    try {
      await api.onboarding.resendStudentInvitation(invitationId);
      setSuccessMsg('Invitation resent successfully.');
      await loadMembers();
    } catch (caught) {
      setError(safeMsg(caught, 'Failed to resend invitation.'));
    } finally {
      setActionLoadingId(null);
    }
  }

  // ── Revoke Invitation ──
  async function handleRevoke(invitationId: string) {
    setActionLoadingId(`revoke-${invitationId}`);
    setError(null);
    try {
      await api.onboarding.revokeStudentInvitation(invitationId);
      setSuccessMsg('Invitation revoked.');
      await loadMembers();
    } catch (caught) {
      setError(safeMsg(caught, 'Failed to revoke invitation.'));
    } finally {
      setActionLoadingId(null);
    }
  }

  const isSingleValid = !!singleEmail && checkDomain(singleEmail);

  const pendingMembers = members.filter(
    (m) => m.invitation?.status === 'PENDING' && !m.emailVerified,
  );
  const activeMembers = members.filter((m) => m.emailVerified);

  return (
    <div className="space-y-4 pb-12">
      <TpoBentoPageHeader
        compact
        title="Whitelist"
        description="Upload and invite candidates by email, bulk paste, or CSV. Only verified institutional domains are accepted."
        icon={UserPlus}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200/80 bg-zinc-100/90 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
            <Lock className="size-3 text-zinc-500" /> Domain Locked
          </span>
        }
        aside={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-2xs">
              <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-2xs">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Institution Domain
                </span>
                {scaffoldLoading ? (
                  <Loader2 className="size-3 animate-spin text-zinc-400" />
                ) : (
                  <span className="font-mono text-xs font-bold text-zinc-900">
                    @{domain ?? '(unknown)'}
                  </span>
                )}
              </div>
            </div>
            <Link href="/settings" className="text-xs font-semibold text-zinc-900 hover:underline">
              Domain settings →
            </Link>
          </div>
        }
      />

      {/* Active Batch Selector */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Target Batch Cohort
        </p>
        {scaffoldLoading ? (
          <div className="flex items-center gap-2 py-1 text-xs text-zinc-500">
            <Loader2 className="size-4 animate-spin" /> Loading batches…
          </div>
        ) : batches.length === 0 ? (
          <form
            onSubmit={handleCreateBatch}
            className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <label
                className="mb-1.5 block text-xs font-semibold text-zinc-700"
                htmlFor="whitelist-new-batch"
              >
                Create a batch to upload into
              </label>
              <input
                id="whitelist-new-batch"
                type="text"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="e.g. Main Campus 2026"
                className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <button
              type="submit"
              disabled={creatingBatch || !newBatchName.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {creatingBatch ? 'Creating…' : 'Create batch'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <select
              aria-label="Select batch for onboarding"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="h-9.5 w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 text-xs font-semibold text-zinc-900 transition-all hover:bg-white focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:max-w-md"
            >
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.name} {b.code ? `(${b.code})` : ''} — {b.memberCount} members
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-400">
              {batches.length} active {batches.length === 1 ? 'batch' : 'batches'}
            </span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="px-1 text-rose-700 hover:text-rose-900"
          >
            ✕
          </button>
        </div>
      ) : null}
      {successMsg ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 shrink-0 text-emerald-600" />
            <p>{successMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="px-1 text-emerald-800 hover:text-emerald-950"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Onboarding Mode Workspace */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-2xs">
        {/* Segmented Switcher */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/70 bg-zinc-100/90 p-1 mb-5">
          {(
            [
              ['single', 'Single candidate', Mail],
              ['bulk', 'Bulk whitelist upload', UploadCloud],
            ] as const
          ).map(([tab, label, Icon]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Icon className="size-3.5 shrink-0" /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="max-w-2xl space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Candidate Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Aarav Sharma"
                className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Candidate Institutional Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder={`student@${domain ?? 'institution.edu'}`}
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/60 pl-3 pr-10 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                />
                {singleEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isSingleValid ? (
                      <CheckCircle className="size-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="size-4 text-rose-600" />
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Must belong to @{domain ?? '(loading…)'} or its subdomains. Candidate selects their
                stream during onboarding.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Group / Section <span className="font-normal text-zinc-400">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CSE-A, Batch 2026, Section 1"
                className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                value={singleGroupLabel}
                onChange={(e) => setSingleGroupLabel(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-zinc-400">
                Optional group or section label to organize candidates within the batch.
              </p>
            </div>

            <button
              type="submit"
              disabled={singleSubmitting || !singleName || !singleEmail || !selectedBatchId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {singleSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> Onboarding…
                </span>
              ) : (
                'Onboard Candidate & Send Invitation'
              )}
            </button>
          </form>
        )}

        {activeTab === 'bulk' && (
          <div className="space-y-8">
            <div className="max-w-2xl space-y-3.5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Quick paste</h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Paste institutional emails only — names are inferred from the address. For full
                  name and group columns, use file upload below.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Candidate emails (one per line or comma-separated)
                </label>
                <textarea
                  rows={5}
                  placeholder={`student1@${domain ?? 'institution.edu'}\nstudent2@${domain ?? 'institution.edu'}\nstudent3@${domain ?? 'institution.edu'}`}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleBulkParse}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-900 shadow-2xs transition hover:bg-zinc-50 hover:border-zinc-300"
              >
                Validate Emails
              </button>

              {parsedBulk.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-zinc-900">
                    Validation Results ({parsedBulk.filter((p) => p.isValid).length} Valid /{' '}
                    {parsedBulk.filter((p) => !p.isValid).length} Invalid)
                  </h4>

                  <div className="max-h-48 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200/80 bg-zinc-50/50">
                    {parsedBulk.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                      >
                        <span className="font-mono text-zinc-700">{item.email}</span>
                        {item.isValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            <Check className="size-3 text-emerald-600" /> Valid Domain
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            <AlertCircle className="size-3 text-rose-600" /> Invalid Domain
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleBulkSubmit()}
                    disabled={
                      bulkSubmitting ||
                      parsedBulk.filter((p) => p.isValid).length === 0 ||
                      !selectedBatchId
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {bulkSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin" /> Onboarding…
                      </span>
                    ) : (
                      `Onboard ${parsedBulk.filter((p) => p.isValid).length} Valid Candidate(s)`
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 pt-6">
              {!selectedBatchId ? (
                <p className="text-xs text-zinc-500">
                  Create or select an active batch above to upload a CSV or Excel roster.
                </p>
              ) : !bulkFileImportEnabled ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
                  File import (CSV/Excel) is not enabled on your institution plan. Use{' '}
                  <strong className="text-zinc-900">Quick paste</strong> above, or contact SMART to
                  enable bulk file import.
                </div>
              ) : (
                <BatchImportWizard
                  batchId={selectedBatchId}
                  heading="File upload (CSV or Excel)"
                  autoSendInvites={autoApproveInvites}
                  onComplete={() => {
                    void loadMembers();
                    setSuccessMsg('Import finished. Review invitations below.');
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pending & Active Invitations Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Pending & Active Invitations</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {selectedBatchId
                ? `Showing candidates for the selected batch cohort.`
                : `Select a batch above to view invited candidates.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
              {members.length} Total
            </span>
            {!autoApproveInvites && selectedBatchId && pendingMembers.length > 0 ? (
              <button
                type="button"
                onClick={async () => {
                  setActionLoadingId('send-batch');
                  try {
                    await api.onboarding.sendBatchInvites(selectedBatchId);
                    setSuccessMsg('Pending invitations queued for email delivery.');
                    await loadMembers();
                  } catch {
                    setError('Could not queue invitation emails.');
                  } finally {
                    setActionLoadingId(null);
                  }
                }}
                disabled={actionLoadingId === 'send-batch'}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Send pending invites
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadMembers()}
              disabled={rosterLoading}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200/90 bg-white text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:border-zinc-300"
              title="Refresh"
            >
              <RefreshCw className={`size-3.5 ${rosterLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {!selectedBatchId ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No batch selected. Choose a batch to view invited candidates.
          </div>
        ) : rosterLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-zinc-700" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No candidates in this batch yet. Use the tabs above to onboard candidates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/75 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {activeMembers.map((m) => (
                  <tr key={m.userId} className="transition-colors hover:bg-zinc-50/60">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                          {getInitials(m.fullName)}
                        </span>
                        <div>
                          <div className="font-bold text-zinc-900">{m.fullName}</div>
                          <div className="font-mono text-[11px] text-zinc-500">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-700 font-medium">{m.groupLabel ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
                        <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-zinc-400">—</td>
                  </tr>
                ))}
                {pendingMembers.map((m) => (
                  <tr key={m.userId} className="transition-colors hover:bg-zinc-50/60">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                          {getInitials(m.fullName)}
                        </span>
                        <div>
                          <div className="font-bold text-zinc-900">{m.fullName}</div>
                          <div className="font-mono text-[11px] text-zinc-500">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-700 font-medium">{m.groupLabel ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                        <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                        Pending Invitation
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleCopyInviteLink(m.userId)}
                          disabled={actionLoadingId === `copy-${m.userId}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 shadow-2xs hover:bg-zinc-50"
                          title="Copy Invitation Link"
                        >
                          {actionLoadingId === `copy-${m.userId}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Copy className="size-3 text-zinc-400" />
                          )}
                          {copiedId === m.userId ? 'Copied!' : 'Copy Link'}
                        </button>

                        {m.invitation?.invitationId && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const invId = m.invitation?.invitationId;
                                if (invId) void handleResend(invId);
                              }}
                              disabled={actionLoadingId === `resend-${m.invitation?.invitationId}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 shadow-2xs hover:bg-zinc-50"
                              title="Resend Invitation"
                            >
                              {actionLoadingId === `resend-${m.invitation?.invitationId}` ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <RotateCcw className="size-3 text-zinc-400" />
                              )}
                              Resend
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const invId = m.invitation?.invitationId;
                                if (invId) void handleRevoke(invId);
                              }}
                              disabled={actionLoadingId === `revoke-${m.invitation.invitationId}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200/80 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100"
                              title="Revoke Invitation"
                            >
                              {actionLoadingId === `revoke-${m.invitation.invitationId}` ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Trash2 className="size-3" />
                              )}
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {members
                  .filter((m) => !m.emailVerified && m.invitation?.status !== 'PENDING')
                  .map((m) => (
                    <tr key={m.userId} className="opacity-70">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-zinc-900">{m.fullName}</div>
                        <div className="font-mono text-[11px] text-zinc-500">{m.email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-700">{m.groupLabel ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                          {m.invitation?.status ?? 'No Invite'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-zinc-400">—</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
