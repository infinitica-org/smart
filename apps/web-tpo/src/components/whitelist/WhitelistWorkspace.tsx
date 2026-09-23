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
    <div className={candidatesPageStackClass}>
      <TpoBentoPageHeader
        compact
        title="Whitelist"
        description="Upload and invite candidates by email, bulk paste, or CSV. Only verified institutional domains are accepted."
        icon={UserPlus}
        accent="mint"
        badge={
          <span className={`${bentoChipClass} inline-flex items-center gap-1`}>
            <Lock className="size-3" /> Domain Locked
          </span>
        }
        aside={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className={`${bentoCardMutedClass} flex items-center gap-2.5 !p-3`}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--tpo-dash-accent-mint-soft)] text-[var(--tpo-dash-accent-mint)]">
                <ShieldCheck className="size-3.5" />
              </div>
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Institution Domain
                </span>
                {scaffoldLoading ? (
                  <Loader2 className="size-3 animate-spin text-[var(--ds-text-muted)]" />
                ) : (
                  <span className="text-[13px] font-semibold text-[var(--ds-text)]">
                    @{domain ?? '(unknown)'}
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/settings"
              className="text-[12px] font-semibold text-[var(--ds-link)] hover:underline"
            >
              Domain settings
            </Link>
          </div>
        }
      />

      <div className={bentoCompactToolbarClass}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
          Active batch
        </p>
        {scaffoldLoading ? (
          <Loader2 className="size-4 animate-spin text-[var(--ds-text-muted)]" />
        ) : batches.length === 0 ? (
          <form
            onSubmit={handleCreateBatch}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <label className={`${labelClass} mb-1.5 block`} htmlFor="whitelist-new-batch">
                Create a batch to upload into
              </label>
              <input
                id="whitelist-new-batch"
                type="text"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="e.g. Main Campus 2026"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={creatingBatch || !newBatchName.trim()}
              className={dashboardPrimaryButtonClass}
            >
              {creatingBatch ? 'Creating…' : 'Create batch'}
            </button>
          </form>
        ) : (
          <select
            aria-label="Select batch for onboarding"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className={candidatesControlClass}
          >
            {batches.map((b) => (
              <option key={b.batchId} value={b.batchId}>
                {b.name} {b.code ? `(${b.code})` : ''} — {b.memberCount} members
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Notifications */}
      {error ? (
        <div className={`${dashboardErrorNoticeClass} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="px-1 text-[#9f1239]">
            ✕
          </button>
        </div>
      ) : null}
      {successMsg ? (
        <div className={`${dashboardSuccessNoticeClass} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 shrink-0" />
            <p>{successMsg}</p>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="px-1 text-[#047857]">
            ✕
          </button>
        </div>
      ) : null}

      <div className={bentoCompactCardClass}>
        <div className={bentoSegmentedTabsClass}>
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
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-semibold transition-colors duration-200 sm:flex-none ${
                activeTab === tab ? bentoSegmentTabActiveClass : bentoSegmentTabIdleClass
              }`}
            >
              <Icon className="size-4 shrink-0" /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="max-w-3xl space-y-3">
            <div>
              <label className={`${labelClass} mb-1.5 block`}>Candidate Full Name</label>
              <input
                type="text"
                placeholder="e.g. Aarav Sharma"
                className={inputClass}
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
              />
            </div>

            <div>
              <label className={`${labelClass} mb-1.5 block`}>Candidate Institutional Email</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder={`student@${domain ?? 'institution.edu'}`}
                  className={`${inputClass} pr-10`}
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                />
                {singleEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isSingleValid ? (
                      <CheckCircle className="size-4 text-[#047857]" />
                    ) : (
                      <AlertCircle className="size-4 text-[#9f1239]" />
                    )}
                  </div>
                )}
              </div>
              <p className={`${dashboardMetricHintClass} mt-1.5 text-[12px]`}>
                Must belong to @{domain ?? '(loading…)'} or its subdomains. Candidate selects their
                stream during onboarding.
              </p>
            </div>

            <div>
              <label className={`${labelClass} mb-1.5 block`}>
                Group / Section{' '}
                <span className="font-normal text-[var(--ds-text-muted)]">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CSE-A, Batch 2026, Section 1"
                className={inputClass}
                value={singleGroupLabel}
                onChange={(e) => setSingleGroupLabel(e.target.value)}
              />
              <p className={`${dashboardMetricHintClass} mt-1.5 text-[12px]`}>
                Optional group or section label to organize candidates within the batch.
              </p>
            </div>

            <button
              type="submit"
              disabled={singleSubmitting || !singleName || !singleEmail || !selectedBatchId}
              className={dashboardPrimaryButtonClass}
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
            <div className="max-w-3xl space-y-3">
              <div>
                <h3 className={dashboardSectionTitleClass}>Quick paste</h3>
                <p className={`${dashboardMetricHintClass} mt-1 text-[12px]`}>
                  Paste institutional emails only — names are inferred from the address. For full
                  name and group columns, use file upload below.
                </p>
              </div>
              <div>
                <label className={`${labelClass} mb-2 block`}>
                  Candidate emails (one per line or comma-separated)
                </label>
                <textarea
                  rows={5}
                  placeholder={`student1@${domain ?? 'institution.edu'}\nstudent2@${domain ?? 'institution.edu'}\nstudent3@${domain ?? 'institution.edu'}`}
                  className={`${inputClass} font-mono`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
              </div>

              <button type="button" onClick={handleBulkParse} className={secondaryButtonClass}>
                Validate Emails
              </button>

              {parsedBulk.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className={dashboardSectionTitleClass}>
                    Validation Results ({parsedBulk.filter((p) => p.isValid).length} Valid /{' '}
                    {parsedBulk.filter((p) => !p.isValid).length} Invalid)
                  </h4>

                  <div
                    className={`${bentoCardMutedClass} max-h-48 divide-y divide-[var(--ds-border-subtle)] overflow-y-auto !p-0`}
                  >
                    {parsedBulk.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2.5 text-xs"
                      >
                        <span className="font-mono text-[var(--ds-text-secondary)]">
                          {item.email}
                        </span>
                        {item.isValid ? (
                          <span className={dashboardMintBadgeClass}>
                            <Check className="size-3" /> Valid Domain
                          </span>
                        ) : (
                          <span className={dashboardRoseBadgeClass}>
                            <AlertCircle className="size-3" /> Invalid Domain
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
                    className={dashboardPrimaryButtonClass}
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

            <div className="border-t border-[var(--ds-border-subtle)] pt-6">
              {!selectedBatchId ? (
                <p className="text-[13px] text-[var(--ds-text-muted)]">
                  Create or select an active batch above to upload a CSV or Excel roster.
                </p>
              ) : !bulkFileImportEnabled ? (
                <div className={`${bentoCardMutedClass} text-[13px] text-[var(--ds-text-muted)]`}>
                  File import (CSV/Excel) is not enabled on your institution plan. Use{' '}
                  <strong className="text-[var(--ds-text)]">Quick paste</strong> above, or contact
                  SMART to enable bulk file import.
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

      <div className={bentoTableShellClass}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ds-text)]">
              Pending & Active Invitations
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--ds-text-muted)]">
              {selectedBatchId
                ? `Showing candidates for the selected batch.`
                : `Select a batch above to see candidates.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={bentoChipClass}>{members.length} Total</span>
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
                className={dashboardPrimaryButtonClass}
              >
                Send pending invites
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadMembers()}
              disabled={rosterLoading}
              className={`${secondaryButtonSmClass} !px-2 !py-2`}
              title="Refresh"
            >
              <RefreshCw className={`size-3.5 ${rosterLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {!selectedBatchId ? (
          <div
            className={`${bentoTableCellClass} py-6 text-center text-[13px] text-[var(--ds-text-muted)]`}
          >
            No batch selected. Choose a batch to view invited candidates.
          </div>
        ) : rosterLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-[var(--ds-text-muted)]" />
          </div>
        ) : members.length === 0 ? (
          <div
            className={`${bentoTableCellClass} py-6 text-center text-[13px] text-[var(--ds-text-muted)]`}
          >
            No candidates in this batch yet. Use the tabs above to onboard candidates.
          </div>
        ) : (
          <div className="overflow-x-auto px-1 pb-1">
            <table className={bentoTableClass}>
              <thead>
                <tr className={bentoTableHeadRowClass}>
                  <th className={bentoTableHeadCellClass}>Candidate</th>
                  <th className={bentoTableHeadCellClass}>Group</th>
                  <th className={bentoTableHeadCellClass}>Status</th>
                  <th className={`${bentoTableHeadCellClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((m) => (
                  <tr key={m.userId} className={bentoTableBodyRowClass}>
                    <td className={bentoTableCellClass}>
                      <div className="font-semibold text-[var(--ds-text)]">{m.fullName}</div>
                      <div className="font-mono text-[12px] text-[var(--ds-text-muted)]">
                        {m.email}
                      </div>
                    </td>
                    <td className={bentoTableCellClass}>{m.groupLabel ?? '—'}</td>
                    <td className={bentoTableCellClass}>
                      <span className={dashboardMintBadgeClass}>
                        <CheckCircle className="size-3" /> Active
                      </span>
                    </td>
                    <td className={`${bentoTableCellClass} text-right text-[var(--ds-text-muted)]`}>
                      —
                    </td>
                  </tr>
                ))}
                {pendingMembers.map((m) => (
                  <tr key={m.userId} className={bentoTableBodyRowClass}>
                    <td className={bentoTableCellClass}>
                      <div className="font-semibold text-[var(--ds-text)]">{m.fullName}</div>
                      <div className="font-mono text-[12px] text-[var(--ds-text-muted)]">
                        {m.email}
                      </div>
                    </td>
                    <td className={bentoTableCellClass}>{m.groupLabel ?? '—'}</td>
                    <td className={bentoTableCellClass}>
                      <span className={dashboardPendingBadgeClass}>Pending Invitation</span>
                    </td>
                    <td className={`${bentoTableCellClass} text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopyInviteLink(m.userId)}
                          disabled={actionLoadingId === `copy-${m.userId}`}
                          className={secondaryButtonSmClass}
                          title="Copy Invitation Link"
                        >
                          {actionLoadingId === `copy-${m.userId}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Copy className="size-3" />
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
                              className={secondaryButtonSmClass}
                              title="Resend Invitation"
                            >
                              {actionLoadingId === `resend-${m.invitation?.invitationId}` ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <RotateCcw className="size-3" />
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
                              className={`${secondaryButtonSmClass} text-[#9f1239] hover:bg-[var(--tpo-dash-accent-rose-soft)]`}
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
                    <tr key={m.userId} className={`${bentoTableBodyRowClass} opacity-70`}>
                      <td className={bentoTableCellClass}>
                        <div className="font-semibold text-[var(--ds-text)]">{m.fullName}</div>
                        <div className="font-mono text-[12px] text-[var(--ds-text-muted)]">
                          {m.email}
                        </div>
                      </td>
                      <td className={bentoTableCellClass}>{m.groupLabel ?? '—'}</td>
                      <td className={bentoTableCellClass}>
                        <span className={dashboardPillClass}>
                          {m.invitation?.status ?? 'No Invite'}
                        </span>
                      </td>
                      <td className={`${bentoTableCellClass} text-right`}>—</td>
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
