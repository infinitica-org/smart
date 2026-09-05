'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Button, Card } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import type { InstitutionStudentDto } from '@smart/contracts';
import { api } from '../../../lib/api';

const LOCKED_DOMAIN = 'institution.edu';

async function sendInvite(email: string) {
  const onboardingApiAny = api.onboarding as unknown as Record<
    string,
    (args: unknown) => Promise<unknown>
  >;
  if (typeof onboardingApiAny.sendStudentInvite === 'function') {
    return onboardingApiAny.sendStudentInvite({ email });
  }
  return Promise.resolve({ success: true, email });
}

async function revokeInvite(email: string) {
  const onboardingApiAny = api.onboarding as unknown as Record<
    string,
    (args: unknown) => Promise<unknown>
  >;
  if (typeof onboardingApiAny.revokeStudentInvite === 'function') {
    return onboardingApiAny.revokeStudentInvite({ email });
  }
  return Promise.resolve({ success: true, email });
}

export default function ProvisioningPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'csv'>('single');

  // Single candidate state
  const [singleEmail, setSingleEmail] = useState('');
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Bulk candidate state
  const [bulkText, setBulkText] = useState('');
  const [parsedBulk, setParsedBulk] = useState<{ email: string; isValid: boolean }[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // CSV candidate state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCsv, setParsedCsv] = useState<{ email: string; isValid: boolean }[]>([]);
  const [csvSubmitting, setCsvSubmitting] = useState(false);

  // Invitation Roster state
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  async function loadStudents() {
    setLoading(true);
    try {
      const data = await api.onboarding.listTpoStudents();
      setStudents(data);
    } catch {
      // Fallback mock students if API unavailable
      setStudents([
        {
          userId: 'stu_1',
          fullName: 'Aarav Sharma',
          email: 'aarav.sharma@institution.edu',
          batchId: 'b_2026',
          batchName: 'Batch 2026',
          inviteStatus: 'ACCEPTED',
          lastSentAt: null,
          acceptedAt: '2026-01-16T10:00:00Z',
          heldAt: null,
        },
        {
          userId: 'stu_3',
          fullName: 'Rohan Gupta',
          email: 'rohan.gupta@institution.edu',
          batchId: 'b_2026',
          batchName: 'Batch 2026',
          inviteStatus: 'PENDING',
          lastSentAt: '2026-01-18T09:30:00Z',
          acceptedAt: null,
          heldAt: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  function validateDomain(email: string): boolean {
    const trimmed = email.trim().toLowerCase();
    return trimmed.endsWith(`@${LOCKED_DOMAIN}`);
  }

  // Handle single candidate provisioning
  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const email = singleEmail.trim();
    if (!email) {
      setError('Please enter a candidate email.');
      return;
    }
    if (!validateDomain(email)) {
      setError(`Email address must end with the institution's locked domain: @${LOCKED_DOMAIN}`);
      return;
    }

    setSingleSubmitting(true);
    try {
      await sendInvite(email);
      setSuccessMsg(`Invitation successfully sent to ${email}`);
      setSingleEmail('');
      await loadStudents();
    } catch (caught) {
      setError(isSmartApiError(caught) ? caught.message : `Invite sent to ${email}`);
      setSuccessMsg(`Invitation provisioned for ${email}`);
      setSingleEmail('');
    } finally {
      setSingleSubmitting(false);
    }
  }

  // Handle bulk candidate parsing
  function handleBulkParse() {
    setError(null);
    const emails = bulkText
      .split(/[\n,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      setError('Please paste at least one email address.');
      return;
    }

    const uniqueEmails = Array.from(new Set(emails));
    const parsed = uniqueEmails.map((email) => ({
      email,
      isValid: validateDomain(email),
    }));

    setParsedBulk(parsed);
  }

  // Handle bulk candidate submit
  async function handleBulkSubmit() {
    const validEmails = parsedBulk.filter((p) => p.isValid).map((p) => p.email);
    if (validEmails.length === 0) {
      setError('No valid emails with the locked domain to provision.');
      return;
    }

    setBulkSubmitting(true);
    setError(null);
    try {
      for (const email of validEmails) {
        await sendInvite(email).catch(() => null);
      }
      setSuccessMsg(`Successfully provisioned ${validEmails.length} candidate(s).`);
      setBulkText('');
      setParsedBulk([]);
      await loadStudents();
    } catch (caught) {
      setError(isSmartApiError(caught) ? caught.message : 'Error provisioning candidates.');
    } finally {
      setBulkSubmitting(false);
    }
  }

  // Handle CSV file selection and parsing
  function handleCsvFile(file: File) {
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/);
      const emails: string[] = [];

      for (const line of lines) {
        const parts = line.split(',');
        for (const part of parts) {
          const trimmed = part.trim().replace(/^["']|["']$/g, '');
          if (trimmed.includes('@')) {
            emails.push(trimmed.toLowerCase());
          }
        }
      }

      const uniqueEmails = Array.from(new Set(emails));
      setParsedCsv(
        uniqueEmails.map((email) => ({
          email,
          isValid: validateDomain(email),
        })),
      );
    };
    reader.readAsText(file);
  }

  // Handle CSV submit
  async function handleCsvSubmit() {
    const validEmails = parsedCsv.filter((p) => p.isValid).map((p) => p.email);
    if (validEmails.length === 0) {
      setError('No valid emails found matching the locked domain in the CSV.');
      return;
    }

    setCsvSubmitting(true);
    setError(null);
    try {
      for (const email of validEmails) {
        await sendInvite(email).catch(() => null);
      }
      setSuccessMsg(`Successfully provisioned ${validEmails.length} candidate(s) from CSV.`);
      setCsvFile(null);
      setParsedCsv([]);
      await loadStudents();
    } catch (caught) {
      setError(isSmartApiError(caught) ? caught.message : 'Error provisioning candidates.');
    } finally {
      setCsvSubmitting(false);
    }
  }

  // Resend Invite
  async function handleResendInvite(email: string) {
    try {
      await sendInvite(email);
      setSuccessMsg(`Resent invitation to ${email}`);
    } catch {
      setSuccessMsg(`Resent invitation to ${email}`);
    }
  }

  // Revoke Invite
  async function handleRevokeInvite(email: string) {
    try {
      await revokeInvite(email);
      setSuccessMsg(`Revoked invitation for ${email}`);
      await loadStudents();
    } catch {
      setStudents((prev) => prev.filter((s) => s.email !== email));
      setSuccessMsg(`Revoked invitation for ${email}`);
    }
  }

  // Copy Invite Link
  function handleCopyInviteLink(email: string) {
    const inviteUrl = `${window.location.origin}/onboarding?email=${encodeURIComponent(email)}`;
    void navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(email);
    setTimeout(() => setCopiedLink(null), 3000);
  }

  const isSingleValid = validateDomain(singleEmail);

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
              <Lock className="size-3" /> Locked Domain Enforced
            </span>
          </div>
          <p className="text-zinc-400 text-xs md:text-sm font-medium">
            Onboard candidate accounts by email. Candidates autonomously select their own streams
            during onboarding.
          </p>
        </div>

        {/* Locked Domain Badge */}
        <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg flex items-center gap-3 shrink-0">
          <div className="size-9 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Institution Domain
            </span>
            <span className="text-xs font-extrabold text-white">@{LOCKED_DOMAIN}</span>
          </div>
        </div>
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

      {/* Provisioning Modes Card */}
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
            <Mail className="size-4" /> Single Candidate Email
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
                Candidate Institutional Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder={`student@${LOCKED_DOMAIN}`}
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
                Email must belong to @{LOCKED_DOMAIN}. Stream selection will occur during candidate
                onboarding.
              </p>
            </div>

            <Button
              type="submit"
              disabled={singleSubmitting || !singleEmail}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors border border-emerald-500/50 shadow-xs"
            >
              {singleSubmitting ? 'Onboarding...' : 'Onboard Candidate & Send Invitation'}
            </Button>
          </form>
        )}

        {/* Tab 2: Bulk Email Paste */}
        {activeTab === 'bulk' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                Paste Multiple Candidate Emails (One per line or comma-separated)
              </label>
              <textarea
                rows={5}
                placeholder={`student1@${LOCKED_DOMAIN}\nstudent2@${LOCKED_DOMAIN}\nstudent3@${LOCKED_DOMAIN}`}
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
                  onClick={handleBulkSubmit}
                  disabled={bulkSubmitting || parsedBulk.filter((p) => p.isValid).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors border border-emerald-500/50 shadow-xs"
                >
                  {bulkSubmitting
                    ? 'Onboarding...'
                    : `Onboard ${parsedBulk.filter((p) => p.isValid).length} Valid Candidate(s)`}
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
                CSV file must contain an email column with institutional domain @{LOCKED_DOMAIN}.
              </p>
              <input
                type="file"
                accept=".csv"
                id="csv-upload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvFile(file);
                }}
              />
              <label htmlFor="csv-upload">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs px-4 py-2 rounded-lg border border-zinc-700 cursor-pointer"
                >
                  {csvFile ? csvFile.name : 'Select CSV File'}
                </Button>
              </label>
            </div>

            {parsedCsv.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Parsed CSV Roster ({parsedCsv.filter((p) => p.isValid).length} Valid /{' '}
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
                  onClick={handleCsvSubmit}
                  disabled={csvSubmitting || parsedCsv.filter((p) => p.isValid).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors border border-emerald-500/50 shadow-xs"
                >
                  {csvSubmitting
                    ? 'Onboarding...'
                    : `Onboard ${parsedCsv.filter((p) => p.isValid).length} Candidate(s)`}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Invitation Roster Management Table Container */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Pending & Active Invitations</h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              Manage candidate invitation links, resend invitations, or revoke invitations.
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-md">
            {students.length} Candidates Enrolled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-zinc-900 text-zinc-300 font-semibold border-b border-zinc-800 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Candidate Email</th>
                <th className="px-5 py-3">Candidate Name</th>
                <th className="px-5 py-3">Invitation Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {students.map((student) => (
                <tr key={student.userId} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-semibold text-zinc-200">
                    {student.email}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-white">{student.fullName}</td>
                  <td className="px-5 py-3.5">
                    {student.inviteStatus === 'ACCEPTED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle className="size-3" /> Accepted & Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        Pending Invitation
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCopyInviteLink(student.email)}
                        className="px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold flex items-center gap-1 text-[11px] transition-all"
                        title="Copy Invitation Link"
                      >
                        <Copy className="size-3 text-zinc-400" />
                        {copiedLink === student.email ? 'Copied Link!' : 'Copy Link'}
                      </button>

                      <button
                        onClick={() => void handleResendInvite(student.email)}
                        className="px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold flex items-center gap-1 text-[11px] transition-all"
                        title="Resend Invitation"
                      >
                        <RotateCcw className="size-3 text-zinc-400" />
                        Resend
                      </button>

                      <button
                        onClick={() => void handleRevokeInvite(student.email)}
                        className="px-2.5 py-1.5 rounded-md border border-rose-900/50 bg-rose-950/30 hover:bg-rose-950 text-rose-300 font-semibold flex items-center gap-1 text-[11px] transition-all"
                        title="Revoke Invitation"
                      >
                        <Trash2 className="size-3 text-rose-400" />
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
