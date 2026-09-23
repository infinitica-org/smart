'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Eye,
  GraduationCap,
  LifeBuoy,
  Lock,
  PauseCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  User,
  X,
} from 'lucide-react';
import type {
  CandidateBriefDto,
  CandidateViewReasonCode,
  GlobalStudentHitDto,
  InstitutionDto,
  CompanyDto,
} from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  FormGrid,
  InlineAlert,
  NativeSelect,
  PageStack,
  StatusBadge,
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

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<GlobalStudentHitDto[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionDto[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<GlobalStudentHitDto | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateBriefDto | null>(null);
  const [simulatingUser, setSimulatingUser] = useState<GlobalStudentHitDto | null>(null);

  const [viewCode, setViewCode] = useState<CandidateViewReasonCode>('support_ticket');
  const [viewReason, setViewReason] = useState('Super Admin support investigation');
  const [actionReason, setActionReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTenants() {
      try {
        const [insts, comps] = await Promise.all([
          api.onboarding.listInstitutions().catch(() => []),
          api.onboarding.listCompanies().catch(() => []),
        ]);
        setInstitutions(insts);
        setCompanies(comps);
      } catch (err) {
        setError(formatApiError(err, 'Failed to load tenant list.'));
      }
    }
    loadTenants().catch(() => {});
  }, []);

  async function handleSearch(event?: FormEvent) {
    if (event) event.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setStudents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await api.onboarding.searchStudents({ q });
      setStudents(results);
      const first = results[0];
      if (first) {
        setSelectedStudent(first);
        await loadCandidateDetails(first.userId);
      } else {
        setSelectedStudent(null);
        setCandidateProfile(null);
      }
    } catch (err) {
      setError(formatApiError(err, 'Search failed. Enter at least 3 characters.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadCandidateDetails(userId: string) {
    try {
      const profile = await api.onboarding.viewCandidateProfile(userId, {
        reasonCode: viewCode,
        reason: viewReason.trim() || 'Super Admin diagnostic review',
      });
      setCandidateProfile(profile);
    } catch (err) {
      setCandidateProfile(null);
    }
  }

  async function handleSelectStudent(student: GlobalStudentHitDto) {
    setSelectedStudent(student);
    await loadCandidateDetails(student.userId);
  }

  async function handleHoldToggle(student: GlobalStudentHitDto) {
    if (actionReason.trim().length < 8) {
      setError('Please provide an audit reason of at least 8 characters.');
      return;
    }
    setError(null);
    try {
      if (student.heldAt) {
        await api.onboarding.releaseStudentHold(student.userId, {
          reason: actionReason.trim(),
        });
        setNotice(`Released hold on ${student.fullName}.`);
      } else {
        await api.onboarding.holdStudent(student.userId, {
          reason: actionReason.trim(),
        });
        setNotice(`Account for ${student.fullName} placed on hold.`);
      }
      setActionReason('');
      await handleSearch();
    } catch (err) {
      setError(formatApiError(err, 'Failed to update student hold state.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={LifeBuoy}
        title="Admin Support & Diagnostics Tool"
        description="Search real student and employer accounts from PostgreSQL, inspect candidate verification state, view live diagnostic logs, and manage account access."
      />

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {notice ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-900 dark:text-emerald-200">
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

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <AdminInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name or email from live database (e.g. Satheswaran, student@)..."
            className="pl-11 py-3 text-sm bg-card border-border rounded-xl shadow-xs"
          />
        </div>
        <Button type="submit" className="bg-foreground text-background font-bold px-6">
          {loading ? 'Searching…' : 'Search DB'}
        </Button>
      </form>

      {/* Grid: Search Results & Diagnostics Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Results List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Matching Database Records</CardTitle>
            <CardDescription>{students.length} accounts found</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {students.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Enter candidate name or email to search live records from PostgreSQL.
              </p>
            ) : (
              students.map((student) => {
                const isSelected = selectedStudent?.userId === student.userId;
                return (
                  <div
                    key={student.userId}
                    onClick={() => void handleSelectStudent(student)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? 'border-foreground bg-muted shadow-xs'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">
                        {student.fullName}
                      </span>
                      <StatusBadge status={student.heldAt ? 'On hold' : 'Active'} />
                    </div>
                    <p className="mt-1 text-xs font-mono text-muted-foreground">{student.email}</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground truncate">
                      {student.institutionName}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Selected Candidate Diagnostics Details */}
        {selectedStudent ? (
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">
                      {selectedStudent.fullName}
                    </h2>
                    <StatusBadge status={selectedStudent.heldAt ? 'On hold' : 'Active'} />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    {selectedStudent.email} · ID: {selectedStudent.userId}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs font-semibold border-border hover:bg-muted"
                    onClick={() => setSimulatingUser(selectedStudent)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View as user
                  </Button>

                  <Button
                    size="sm"
                    variant={selectedStudent.heldAt ? 'outline' : 'destructive'}
                    className="h-8 text-xs font-bold gap-1 shadow-sm"
                    onClick={() => void handleHoldToggle(selectedStudent)}
                  >
                    {selectedStudent.heldAt ? (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        Release hold
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Place on hold
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
              {/* Account Diagnostics Summary */}
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Account Verification & Institutional Connection
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Partner University</span>
                    <strong className="text-foreground text-sm">
                      {selectedStudent.institutionName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Campus Invitation Status</span>
                    <span className="font-mono text-foreground font-semibold">
                      {selectedStudent.inviteStatus ?? 'DIRECT_SIGNUP'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Account State</span>
                    <span className="font-semibold text-foreground">
                      {selectedStudent.heldAt
                        ? 'On Hold (Account access restricted)'
                        : 'Active / Verified Access'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Verified Skills Count</span>
                    <span className="font-mono text-teal-600 font-bold">
                      {candidateProfile
                        ? `${candidateProfile.verifiedSkillCount} verified / ${candidateProfile.skillClaimCount} claimed`
                        : 'Loading…'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hold Action Reason Field */}
              <div className="space-y-2 border-t border-border pt-4">
                <Field label="Audit Reason (Required for hold or release actions)">
                  <AdminInput
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter audit rationale (at least 8 characters)..."
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2 flex items-center justify-center p-12">
            <EmptyState icon={User}>
              Search and select a student above to inspect account diagnostics directly from the
              database.
            </EmptyState>
          </Card>
        )}
      </div>

      {/* View-As-User Simulation Modal */}
      {simulatingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-ping" />
                <h3 className="text-base font-bold text-foreground">
                  View-As-User Session: {simulatingUser.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSimulatingUser(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold">⚠️ Read-Only Diagnostic Sandbox</p>
              <p className="mt-0.5 opacity-90">
                You are diagnosing account state for <strong>{simulatingUser.email}</strong>.
                Mutating candidate actions are disabled in simulation mode.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-muted p-3">
                <span className="text-muted-foreground block">Campus Tenant</span>
                <strong className="text-foreground">{simulatingUser.institutionName}</strong>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <span className="text-muted-foreground block">Account ID</span>
                <strong className="font-mono text-foreground">{simulatingUser.userId}</strong>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSimulatingUser(null)}>
                Exit View-As Mode
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageStack>
  );
}
