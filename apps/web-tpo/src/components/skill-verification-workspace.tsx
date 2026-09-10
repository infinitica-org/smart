'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  Search,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  BookOpen,
  Lock,
} from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import {
  SKILL_DEFINITIONS,
  SKILL_STREAMS,
  type BatchDto,
  type InstitutionStudentDto,
  type SkillClaimDto,
  type SkillStream,
} from '@smart/contracts';
import { Badge, Button, Card } from '@smart/ui';
import { api } from '../lib/api';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

function skillNameFor(code: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === code)?.name ?? code;
}

function skillStreamFor(code: string): SkillStream {
  const stream = SKILL_DEFINITIONS.find((s) => s.code === code)?.stream;
  if (!stream || stream === 'UNIVERSAL') return 'SOFTWARE_DEVELOPMENT';
  return stream;
}

function streamLabel(stream: string): string {
  switch (stream) {
    case 'SOFTWARE_DEVELOPMENT':
      return 'Software Engineering';
    case 'DATA_SCIENCE_ANALYTICS':
      return 'Data & Analytics';
    case 'AI_ML_ENGINEERING':
      return 'AI & Machine Learning';
    default:
      return stream.replace(/_/g, ' ');
  }
}

export function SkillVerificationWorkspace() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [selectedStream, setSelectedStream] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setApiNotice(null);
    try {
      const [studentsData, batchesData, claimsData] = await Promise.all([
        api.onboarding.listTpoStudents(),
        api.onboarding.listBatches().catch(() => []),
        api.assessment.listSkillClaims().catch(() => []),
      ]);
      setStudents(studentsData);
      setBatches(batchesData);
      setClaims(claimsData);
    } catch (caught) {
      setApiNotice(errorMessage(caught, 'Backend API offline - previewing cached telemetry.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered student list
  const filteredStudents = students.filter((student) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = student.fullName.toLowerCase().includes(q);
      const matchEmail = student.email.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    // Batch filter
    if (selectedBatchId !== 'ALL') {
      if (student.batchId !== selectedBatchId) return false;
    }

    // Student skill claims
    const studentClaims = claims.filter((c) => c.studentId === student.userId);

    // Stream filter
    if (selectedStream !== 'ALL') {
      const hasStreamClaim = studentClaims.some(
        (claim) => skillStreamFor(claim.skillCode) === selectedStream,
      );
      if (!hasStreamClaim && studentClaims.length > 0) return false;
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      const hasStatusClaim = studentClaims.some((claim) => claim.status === selectedStatus);
      if (!hasStatusClaim) return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalClaims = claims.length;
  const verifiedClaims = claims.filter((c) => c.status === 'VERIFIED').length;
  const declaredClaims = claims.filter((c) => c.status === 'DECLARED').length;
  const reattemptClaims = claims.filter((c) => c.status === 'BEGINNER_REATTEMPT').length;
  const lockedClaims = claims.filter((c) => c.status === 'LOCKED').length;
  const passRate = totalClaims > 0 ? Math.round((verifiedClaims / totalClaims) * 100) : 0;

  return (
    <main className="mx-auto max-w-[1400px] space-y-6 font-sans select-none pb-12 text-zinc-100">
      {/* Premium Dark Header Bar */}
      <header className="relative overflow-hidden flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-emerald-950/30 p-6 md:p-8 rounded-3xl border border-zinc-800/80 backdrop-blur-xl shadow-2xl">
        <div className="absolute -top-12 -right-12 size-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <Award className="size-3.5" /> SMART Telemetry · Skill Verification
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
            Student Skill Verification Workspace
          </h1>
          <p className="mt-1 text-xs md:text-sm text-zinc-400 font-medium">
            Monitor certified student skill claims, level progression, and competency breakdown
            across active institutional cohorts.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            variant="outline"
            className="h-10 rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300 font-bold text-xs shadow-xs flex items-center gap-2 transition-all"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </header>

      {apiNotice ? (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-2">
          <span className="size-2 rounded-full bg-amber-400 animate-ping" />
          {apiNotice}
        </div>
      ) : null}

      {/* KPI Metric Summary Cards with Vibrant Colored Glows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md p-6 border border-zinc-800/80 shadow-xl flex flex-col justify-between hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Total Skill Claims
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              <BookOpen className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white tabular-nums tracking-tight group-hover:text-blue-300 transition-colors">
              {totalClaims}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">Submitted skill assessments</p>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md p-6 border border-zinc-800/80 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Verified Credentials
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-emerald-400 tabular-nums tracking-tight group-hover:text-emerald-300 transition-colors">
              {verifiedClaims}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {passRate}% overall verification rate
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md p-6 border border-zinc-800/80 shadow-xl flex flex-col justify-between hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              In Progress / Declared
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Clock className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-amber-400 tabular-nums tracking-tight group-hover:text-amber-300 transition-colors">
              {declaredClaims}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">Awaiting evaluation</p>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md p-6 border border-zinc-800/80 shadow-xl flex flex-col justify-between hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Re-attempt / Locked
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
              <Lock className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-rose-400 tabular-nums tracking-tight group-hover:text-rose-300 transition-colors">
              {reattemptClaims + lockedClaims}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {reattemptClaims} re-att. / {lockedClaims} locked
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-zinc-900/60 backdrop-blur-md p-5 rounded-2xl border border-zinc-800/80 shadow-xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <input
            type="search"
            placeholder="Search candidate by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-medium text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Batch Filter */}
          <select
            aria-label="Filter by Batch"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-emerald-500/60"
          >
            <option value="ALL">All Batches</option>
            {batches.map((b) => (
              <option key={b.batchId} value={b.batchId}>
                {b.name} ({b.memberCount} members)
              </option>
            ))}
          </select>

          {/* Domain Stream Filter */}
          <select
            aria-label="Filter by Skill Domain Stream"
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-emerald-500/60"
          >
            <option value="ALL">All Domains</option>
            {SKILL_STREAMS.map((st) => (
              <option key={st} value={st}>
                {streamLabel(st)}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter by Verification Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-emerald-500/60"
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="DECLARED">Declared / In Progress</option>
            <option value="BEGINNER_REATTEMPT">Re-attempt Allowed</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>
      </div>

      {/* Student Verification Roster & Competency Table */}
      <Card className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 shadow-xl overflow-hidden rounded-2xl">
        {loading ? (
          <div role="status" className="p-8 text-center text-sm font-medium text-zinc-400">
            Loading student skill claims telemetry…
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-sm font-medium text-zinc-400">
            No student skill verification records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Batch</th>
                  <th className="px-6 py-4">Verified Skill Credentials</th>
                  <th className="px-6 py-4">Competency Status</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredStudents.map((student) => {
                  const studentClaims = claims.filter((c) => c.studentId === student.userId);
                  const studentVerified = studentClaims.filter((c) => c.status === 'VERIFIED');
                  const isExpanded = expandedStudentId === student.userId;

                  return (
                    <tr
                      key={student.userId}
                      className="group hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">{student.fullName}</span>
                        <span className="text-xs text-zinc-400 font-medium">{student.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-zinc-300 text-xs block">
                          {student.batchName ?? 'Unassigned Batch'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                          {studentVerified.length === 0 ? (
                            <span className="text-xs text-zinc-500 font-medium">
                              No verified claims
                            </span>
                          ) : (
                            studentVerified.slice(0, 3).map((claim) => (
                              <span
                                key={claim.claimId}
                                className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                              >
                                <CheckCircle2 className="size-3" />
                                {skillNameFor(claim.skillCode)}
                              </span>
                            ))
                          )}
                          {studentVerified.length > 3 ? (
                            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                              +{studentVerified.length - 3} more
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {studentVerified.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="size-3.5" /> Certified
                          </span>
                        ) : studentClaims.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                            <Clock className="size-3.5" /> In Evaluation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
                            Not Started
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 hover:border-emerald-500/40 hover:text-emerald-300 text-xs font-bold h-8 px-3 transition-all"
                          onClick={() => setExpandedStudentId(isExpanded ? null : student.userId)}
                        >
                          {isExpanded ? (
                            <>
                              Hide Claims <ChevronUp className="size-3.5 ml-1" />
                            </>
                          ) : (
                            <>
                              View Claims ({studentClaims.length}){' '}
                              <ChevronDown className="size-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Expandable Detail View Drawer */}
        {expandedStudentId ? (
          <div className="p-6 bg-zinc-950/90 border-t border-zinc-800 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-400" />
                Skill Claims Matrix for{' '}
                {students.find((s) => s.userId === expandedStudentId)?.fullName}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedStudentId(null)}
                className="text-xs font-bold text-zinc-400 hover:text-white"
              >
                Close Matrix
              </Button>
            </div>

            {claims.filter((c) => c.studentId === expandedStudentId).length === 0 ? (
              <p className="text-xs text-zinc-400 font-medium p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                No skill claims filed yet for this candidate.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {claims
                  .filter((c) => c.studentId === expandedStudentId)
                  .map((claim) => {
                    const skillDef = SKILL_DEFINITIONS.find((s) => s.code === claim.skillCode);
                    const levelMeta = skillDef?.levels[claim.proficiency];

                    return (
                      <div
                        key={claim.claimId}
                        className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-extrabold text-white">
                                {skillNameFor(claim.skillCode)}
                              </h4>
                              <p className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                                Stream: {streamLabel(skillStreamFor(claim.skillCode))}
                              </p>
                            </div>
                            <Badge
                              variant={
                                claim.status === 'VERIFIED'
                                  ? 'default'
                                  : claim.status === 'LOCKED'
                                    ? 'destructive'
                                    : 'outline'
                              }
                              className="rounded-full text-[10px] font-bold px-2.5 py-0.5"
                            >
                              {claim.status}
                            </Badge>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                            <div>
                              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] block">
                                Proficiency
                              </span>
                              <span className="font-extrabold text-white">{claim.proficiency}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] block">
                                Pass Mark Threshold
                              </span>
                              <span className="font-extrabold text-emerald-400">
                                {levelMeta?.passMark ?? 60}%
                              </span>
                            </div>
                          </div>

                          {levelMeta?.competencyBar ? (
                            <p className="mt-2.5 text-xs text-zinc-300 font-medium leading-relaxed bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40">
                              <strong className="text-emerald-400 font-bold">
                                Competency Bar:
                              </strong>{' '}
                              {levelMeta.competencyBar}
                            </p>
                          ) : null}
                        </div>

                        <div className="text-[11px] text-zinc-400 font-medium flex items-center justify-between pt-2 border-t border-zinc-800">
                          <span>Strikes: {claim.strikes}</span>
                          {claim.lockedUntil ? (
                            <span className="text-rose-400 font-bold">
                              Locked until {new Date(claim.lockedUntil).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : null}
      </Card>
    </main>
  );
}
