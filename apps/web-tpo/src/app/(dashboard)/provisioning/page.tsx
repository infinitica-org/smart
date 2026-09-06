'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Copy,
  RotateCcw,
  Trash2,
  Lock,
  UserPlus,
  Mail,
  ListPlus,
  ShieldCheck,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button, Card } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import type { BatchDto, BatchMemberDto } from '@smart/contracts';
import { api } from '../../../lib/api';

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

function extractEmailsFromCsv(text: string): string[] {
  const emails: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    for (const cell of line.split(',')) {
      const trimmed = cell
        .trim()
        .replace(/^["']+|["']+$/g, '')
        .toLowerCase();
      if (trimmed.includes('@') && trimmed.includes('.')) {
        emails.push(trimmed);
      }
    }
  }
  return Array.from(new Set(emails));
}

function safeMsg(err: unknown, fallback: string): string {
  if (isSmartApiError(err)) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─────────────────── component ────────────────────

export default function ProvisioningPage() {
  // Domain and batch scaffold
  const [domain, setDomain] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [scaffoldLoading, setScaffoldLoading] = useState(true);

  // Onboarding mode tabs
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'csv'>('single');

  // Single candidate
  const [singleName, setSingleName] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Bulk paste
  const [bulkText, setBulkText] = useState('');
  const [parsedBulk, setParsedBulk] = useState<{ email: string; isValid: boolean }[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // CSV upload
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCsv, setParsedCsv] = useState<{ email: string; isValid: boolean }[]>([]);
  const [csvSubmitting, setCsvSubmitting] = useState(false);

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
      const [ent, batchList] = await Promise.all([
        api.onboarding.tpoEntitlements(),
        api.onboarding.listBatches(),
      ]);
      setDomain(ent.domain ?? null);
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

  // ── Domain validation ──
  function validateDomain(email: string): boolean {
    if (!domain || !domain.trim()) return false;
    const cleanEmail = email.trim().toLowerCase();
    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanEmail.includes('@')) return false;
    return cleanEmail.endsWith(`@${cleanDomain}`);
  }

  // ── Single candidate submit ──
  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const email = singleEmail.trim().toLowerCase();
    const name = singleName.trim();
    if (!name || !email) {
      setError('Please enter both the candidate name and email.');
      return;
    }
    if (!selectedBatchId) {
      setError('Please select a batch before onboarding candidates.');
      return;
    }
    if (!validateDomain(email)) {
      setError(`Email must belong to the institution's locked domain: @${domain ?? '(loading…)'}`);
      return;
    }
    setSingleSubmitting(true);
    try {
      const member = await api.onboarding.addBatchMember(selectedBatchId, {
        fullName: name,
        email,
      });
      let sendFailed = false;
      if (member.invitation?.invitationId) {
        try {
          await api.onboarding.resendStudentInvitation(member.invitation.invitationId);
        } catch {
          sendFailed = true;
        }
      }
      if (sendFailed) {
        setSuccessMsg(
          `Candidate ${name} added to batch, but sending invitation email failed. You can resend the invitation from the candidate roster below.`,
        );
      } else {
        setSuccessMsg(`Invitation sent to ${email}. They will receive a magic link via email.`);
      }
      setSingleName('');
      setSingleEmail('');
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
    setParsedBulk(emails.map((em) => ({ email: em, isValid: validateDomain(em) })));
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
      try {
        await api.onboarding.sendBatchInvites(selectedBatchId);
      } catch {
        setError('Candidates added but invitation emails could not be queued.');
      }
      setSuccessMsg(
        `Provisioned ${added} candidate(s).${failed.length > 0 ? ` ${failed.length} already existed or had errors.` : ''}`,
      );
      setBulkText('');
      setParsedBulk([]);
      await loadMembers();
    } else {
      setError(`All ${failed.length} candidate(s) failed. They may already be enrolled.`);
    }
    setBulkSubmitting(false);
  }

  // ── CSV handling ──
  function handleCsvFile(file: File) {
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const emails = extractEmailsFromCsv(text);
      setParsedCsv(emails.map((em) => ({ email: em, isValid: validateDomain(em) })));
    };
    reader.readAsText(file);
  }

  async function handleCsvSubmit() {
    const valid = parsedCsv.filter((p) => p.isValid);
    if (valid.length === 0) {
      setError('No valid institutional domain emails found in the CSV.');
      return;
    }
    if (!selectedBatchId) {
      setError('Please select a batch.');
      return;
    }
    setCsvSubmitting(true);
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
      try {
        await api.onboarding.sendBatchInvites(selectedBatchId);
      } catch {
        setError('Candidates added but invitation emails could not be queued.');
      }
      setSuccessMsg(
        `Provisioned ${added} candidate(s) from CSV.${failed.length > 0 ? ` ${failed.length} skipped.` : ''}`,
      );
      setCsvFile(null);
      setParsedCsv([]);
      if (csvInputRef.current) csvInputRef.current.value = '';
      await loadMembers();
    } else {
      setError(`All ${failed.length} candidate(s) failed. They may already be enrolled.`);
    }
    setCsvSubmitting(false);
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

  const isSingleValid =
    !!singleEmail && !!domain && singleEmail.trim().toLowerCase().endsWith(`@${domain}`);

  const pendingMembers = members.filter(
    (m) => m.invitation?.status === 'PENDING' && !m.emailVerified,
  );
  const activeMembers = members.filter((m) => m.emailVerified);

  return (
    <main className="max-w-[1400px] mx-auto space-y-5 font-sans select-none pb-12 text-zinc-100">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 p-6 md:p-7 rounded-xl border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <UserPlus className="size-6 text-zinc-300" />
              Candidate Onboarding Workspace
            </h1>
            <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
              <Lock className="size-3" /> Domain Locked
            </span>
          </div>
          <p className="text-zinc-400 text-xs md:text-sm font-medium">
            Onboard candidates by email. Candidates autonomously select their own streams during
            onboarding.
          </p>
        </div>

        {/* Domain Badge */}
        <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg flex items-center gap-3 shrink-0">
          <div className="size-9 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Institution Domain
            </span>
            {scaffoldLoading ? (
              <Loader2 className="size-3 animate-spin text-zinc-400" />
            ) : (
              <span className="text-xs font-extrabold text-white">@{domain ?? '(unknown)'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Batch Selector */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider shrink-0">
          Active Batch
        </span>
        {scaffoldLoading ? (
          <Loader2 className="size-4 animate-spin text-zinc-400" />
        ) : batches.length === 0 ? (
          <div className="flex items-center gap-3 flex-1">
            <p className="text-xs text-zinc-500 font-medium">
              No batches exist yet.{' '}
              <a href="/batches" className="text-emerald-400 underline hover:text-emerald-300">
                Create a batch first →
              </a>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <select
              aria-label="Select batch for onboarding"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="bg-zinc-950 text-zinc-100 text-xs font-bold rounded-lg border border-zinc-800 px-3 py-2 focus:outline-none focus:border-emerald-600 min-w-[200px]"
            >
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.name} {b.code ? `(${b.code})` : ''} — {b.memberCount} members
                </option>
              ))}
            </select>
            <a
              href="/batches"
              className="text-xs text-zinc-400 hover:text-emerald-400 font-semibold underline transition-colors"
            >
              + Create new batch
            </a>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-4 text-rose-400 shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-200 p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="size-4 text-emerald-400 shrink-0" />
            <p className="text-xs font-bold">{successMsg}</p>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Onboarding Modes Card */}
      <Card className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-xl shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'single'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Mail className="size-4" /> Single Candidate
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'bulk'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <ListPlus className="size-4" /> Bulk Email Paste
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'csv'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <FileSpreadsheet className="size-4" /> CSV Roster Upload
          </button>
        </div>

        {/* Tab 1: Single Candidate */}
        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="space-y-4 max-w-xl">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                Candidate Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Aarav Sharma"
                className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2.5 px-4 border border-zinc-800 focus:outline-none focus:border-zinc-600 font-medium placeholder:text-zinc-500"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                Candidate Institutional Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder={`student@${domain ?? 'institution.edu'}`}
                  className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2.5 pl-4 pr-10 border border-zinc-800 focus:outline-none focus:border-zinc-600 font-medium placeholder:text-zinc-500"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                />
                {singleEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isSingleValid ? (
                      <CheckCircle className="size-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="size-4 text-rose-400" />
                    )}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">
                Must belong to @{domain ?? '(loading…)'}. Candidate selects their stream during
                onboarding.
              </p>
            </div>

            <Button
              type="submit"
              disabled={singleSubmitting || !singleName || !singleEmail || !selectedBatchId}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors border border-emerald-500/50 shadow-xs"
            >
              {singleSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> Onboarding…
                </span>
              ) : (
                'Onboard Candidate & Send Invitation'
              )}
            </Button>
          </form>
        )}

        {/* Tab 2: Bulk Email Paste */}
        {activeTab === 'bulk' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                Paste Multiple Candidate Emails (one per line or comma-separated)
              </label>
              <textarea
                rows={5}
                placeholder={`student1@${domain ?? 'institution.edu'}\nstudent2@${domain ?? 'institution.edu'}\nstudent3@${domain ?? 'institution.edu'}`}
                className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg p-3 border border-zinc-800 focus:outline-none focus:border-zinc-600 font-mono placeholder:text-zinc-500"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
            </div>

            <Button
              type="button"
              onClick={handleBulkParse}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs px-4 py-2 rounded-lg border border-zinc-700"
            >
              Validate Emails
            </Button>

            {parsedBulk.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Validation Results ({parsedBulk.filter((p) => p.isValid).length} Valid /{' '}
                  {parsedBulk.filter((p) => !p.isValid).length} Invalid)
                </h4>

                <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-lg divide-y divide-zinc-800 bg-zinc-950">
                  {parsedBulk.map((item, idx) => (
                    <div key={idx} className="p-2.5 px-3 flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-200">{item.email}</span>
                      {item.isValid ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <Check className="size-3" /> Valid Domain
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          <AlertCircle className="size-3" /> Invalid Domain
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={() => void handleBulkSubmit()}
                  disabled={
                    bulkSubmitting ||
                    parsedBulk.filter((p) => p.isValid).length === 0 ||
                    !selectedBatchId
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors border border-emerald-500/50 shadow-xs"
                >
                  {bulkSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" /> Onboarding…
                    </span>
                  ) : (
                    `Onboard ${parsedBulk.filter((p) => p.isValid).length} Valid Candidate(s)`
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: CSV Upload */}
        {activeTab === 'csv' && (
          <div className="space-y-4 max-w-xl">
            <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 bg-zinc-950 flex flex-col items-center justify-center text-center transition-all">
              <UploadCloud className="size-8 text-zinc-400 mb-2" />
              <p className="text-xs font-bold text-white mb-1">Upload Candidate CSV Roster</p>
              <p className="text-[11px] text-zinc-400 mb-4 font-medium">
                CSV must contain an email column using the institution domain @
                {domain ?? '(loading…)'}.
              </p>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                id="csv-upload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvFile(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('csv-upload')?.click()}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs px-4 py-2 rounded-lg border border-zinc-700 cursor-pointer"
              >
                {csvFile ? csvFile.name : 'Select CSV File'}
              </Button>
            </div>

            {parsedCsv.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Parsed Roster ({parsedCsv.filter((p) => p.isValid).length} Valid /{' '}
                  {parsedCsv.filter((p) => !p.isValid).length} Invalid)
                </h4>

                <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-lg divide-y divide-zinc-800 bg-zinc-950">
                  {parsedCsv.map((item, idx) => (
                    <div key={idx} className="p-2.5 px-3 flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-200">{item.email}</span>
                      {item.isValid ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <Check className="size-3" /> Valid Domain
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          <AlertCircle className="size-3" /> Invalid Domain
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={() => void handleCsvSubmit()}
                  disabled={
                    csvSubmitting ||
                    parsedCsv.filter((p) => p.isValid).length === 0 ||
                    !selectedBatchId
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors border border-emerald-500/50 shadow-xs"
                >
                  {csvSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" /> Onboarding…
                    </span>
                  ) : (
                    `Onboard ${parsedCsv.filter((p) => p.isValid).length} Candidate(s) from CSV`
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Invitation Roster */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Pending & Active Invitations</h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              {selectedBatchId
                ? `Showing candidates for the selected batch.`
                : `Select a batch above to see candidates.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-md">
              {members.length} Total
            </span>
            <button
              onClick={() => void loadMembers()}
              disabled={rosterLoading}
              className="p-1.5 rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`size-3.5 ${rosterLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {!selectedBatchId ? (
          <div className="p-8 text-center text-zinc-500 text-xs font-medium">
            No batch selected. Choose a batch to view invited candidates.
          </div>
        ) : rosterLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-zinc-400" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs font-medium">
            No candidates in this batch yet. Use the tabs above to onboard candidates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-zinc-900 text-zinc-300 font-semibold border-b border-zinc-800 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Group</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {/* Active members first */}
                {activeMembers.map((m) => (
                  <tr key={m.userId} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white">{m.fullName}</div>
                      <div className="font-mono text-zinc-500 text-[11px]">{m.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-medium">{m.groupLabel ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle className="size-3" /> Active
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => void handleCopyInviteLink(m.userId)}
                        disabled={actionLoadingId === `copy-${m.userId}`}
                        className="px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold flex items-center gap-1 text-[11px] transition-all ml-auto"
                        title="Copy Invitation Link"
                      >
                        {actionLoadingId === `copy-${m.userId}` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Copy className="size-3 text-zinc-400" />
                        )}
                        {copiedId === m.userId ? 'Copied!' : 'Copy Link'}
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Pending invitation members */}
                {pendingMembers.map((m) => (
                  <tr key={m.userId} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white">{m.fullName}</div>
                      <div className="font-mono text-zinc-500 text-[11px]">{m.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-medium">{m.groupLabel ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        Pending Invitation
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleCopyInviteLink(m.userId)}
                          disabled={actionLoadingId === `copy-${m.userId}`}
                          className="px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold flex items-center gap-1 text-[11px] transition-all disabled:opacity-50"
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
                              onClick={() => {
                                const invId = m.invitation?.invitationId;
                                if (invId) void handleResend(invId);
                              }}
                              disabled={actionLoadingId === `resend-${m.invitation?.invitationId}`}
                              className="px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold flex items-center gap-1 text-[11px] transition-all disabled:opacity-50"
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
                              onClick={() => {
                                const invId = m.invitation?.invitationId;
                                if (invId) void handleRevoke(invId);
                              }}
                              disabled={actionLoadingId === `revoke-${m.invitation.invitationId}`}
                              className="px-2.5 py-1.5 rounded-md border border-rose-900/50 bg-rose-950/30 hover:bg-rose-950 text-rose-300 font-semibold flex items-center gap-1 text-[11px] transition-all disabled:opacity-50"
                              title="Revoke Invitation"
                            >
                              {actionLoadingId === `revoke-${m.invitation.invitationId}` ? (
                                <Loader2 className="size-3 animate-spin text-rose-400" />
                              ) : (
                                <Trash2 className="size-3 text-rose-400" />
                              )}
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Other statuses (revoked, accepted without full verification, etc.) */}
                {members
                  .filter((m) => !m.emailVerified && m.invitation?.status !== 'PENDING')
                  .map((m) => (
                    <tr
                      key={m.userId}
                      className="hover:bg-zinc-900/50 transition-colors opacity-60"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white">{m.fullName}</div>
                        <div className="font-mono text-zinc-500 text-[11px]">{m.email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 font-medium">
                        {m.groupLabel ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                          {m.invitation?.status ?? 'No Invite'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">—</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
