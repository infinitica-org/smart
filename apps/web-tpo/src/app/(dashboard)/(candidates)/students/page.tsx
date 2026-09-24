'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Clock, ChevronRight, Users, ShieldCheck } from 'lucide-react';

import {
  SKILL_CATEGORY_IDS,
  SKILL_DEFINITIONS,
  proficiencyLevelUiLabel,
  type InstitutionStudentDto,
  type SkillClaimDto,
} from '@smart/contracts';

import { CandidateDetailDrawer } from '../../../../components/candidate-detail-drawer';
import { TpoBentoPageHeader } from '../../../../components/tpo-bento/TpoBentoPageHeader';
import { api, staffApi } from '../../../../lib/api';
import {
  categoryLabel,
  categoryNameForSkillCode,
  skillCategoryFor,
} from '../../../../lib/skill-taxonomy';

function candidateCountLabel(count: number): string {
  return count === 1 ? '1 candidate' : `${count} candidates`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || 'ST').toUpperCase();
}

export default function CandidatesPage() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewScope, setViewScope] = useState<'ALL' | 'MY'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [proficiencyFilter, setProficiencyFilter] = useState<string>('ALL');
  const [selectedStudent, setSelectedStudent] = useState<InstitutionStudentDto | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Students · SMART TPO';
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) setSearchQuery(q);
    }
    api.assessment
      .listSkillClaims()
      .then((claimList) => setClaims(claimList))
      .catch(() => setClaims([]));
  }, []);

  const loadStudents = () => {
    setLoading(true);
    setError(null);
    const q = searchQuery.trim() || undefined;
    const promise =
      viewScope === 'MY' ? staffApi.listAssignedStudents() : api.onboarding.listTpoStudents({ q });

    promise
      .then((studentList) => {
        setStudents(studentList);
        setError(null);
      })
      .catch((err: unknown) => {
        setStudents([]);
        const msg =
          err instanceof Error ? err.message : 'Failed to load candidates. Please try again.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, viewScope]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const query = searchQuery.trim().toLowerCase();
      if (
        query &&
        !student.fullName.toLowerCase().includes(query) &&
        !student.email.toLowerCase().includes(query)
      ) {
        return false;
      }
      const studentClaims = claims.filter((c) => c.studentId === student.userId);
      if (categoryFilter !== 'ALL') {
        const hasCategory = studentClaims.some(
          (claim) => skillCategoryFor(claim.skillCode) === categoryFilter,
        );
        if (!hasCategory && studentClaims.length > 0) return false;
      }
      if (skillFilter !== 'ALL') {
        if (!studentClaims.some((c) => c.skillCode === skillFilter)) return false;
      }
      if (proficiencyFilter !== 'ALL') {
        if (!studentClaims.some((c) => c.proficiency === proficiencyFilter)) return false;
      }
      return true;
    });
  }, [students, claims, searchQuery, categoryFilter, skillFilter, proficiencyFilter]);

  // Dynamic KPI calculations
  const totalCount = students.length;
  const verifiedCountTotal = useMemo(() => {
    const verifiedUserIds = new Set(
      claims.filter((c) => c.status === 'VERIFIED').map((c) => c.studentId),
    );
    return students.filter((s) => verifiedUserIds.has(s.userId)).length;
  }, [students, claims]);
  const pendingInvitesCount = useMemo(() => {
    return students.filter((s) => s.inviteStatus !== 'ACCEPTED').length;
  }, [students]);

  return (
    <div className="space-y-4 pb-12">
      {/* Bento Page Header */}
      <TpoBentoPageHeader
        icon={Users}
        title="Students"
        description="Search and review whitelisted students, verification progress, and verified skills."
        badge={
          <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-100/90 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
            {candidateCountLabel(students.length)}
          </span>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Candidates
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {totalCount.toLocaleString('en-US')}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {viewScope === 'MY' ? 'Assigned to your scope' : 'Enrolled institutional cohort'}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs">
            <Users className="size-5 stroke-[1.75]" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Skills Verified
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {verifiedCountTotal.toLocaleString('en-US')}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Certified candidates</span>
            </div>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200/80 bg-emerald-50 text-emerald-800 shadow-2xs">
            <ShieldCheck className="size-5 stroke-[1.75]" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pending Invites
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {pendingInvitesCount.toLocaleString('en-US')}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-700">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span>Awaiting acceptance</span>
            </div>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-50 text-amber-800 shadow-2xs">
            <Clock className="size-5 stroke-[1.75]" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-2xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Segmented Switcher */}
          <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/70 bg-zinc-100/90 p-1 w-fit shrink-0">
            <button
              type="button"
              onClick={() => setViewScope('ALL')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                viewScope === 'ALL'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All Candidates
            </button>
            <button
              type="button"
              onClick={() => setViewScope('MY')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                viewScope === 'MY'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              My Assigned Students
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Search candidates…"
                aria-label="Search candidates"
                className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/60 pl-8.5 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              aria-label="Filter by skill category"
              className="h-9 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 text-xs font-medium text-zinc-700 transition-all hover:bg-white focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {SKILL_CATEGORY_IDS.map((categoryId) => (
                <option key={categoryId} value={categoryId}>
                  {categoryLabel(categoryId)}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by Skills"
              className="h-9 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 text-xs font-medium text-zinc-700 transition-all hover:bg-white focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
            >
              <option value="ALL">All Skills</option>
              {SKILL_DEFINITIONS.map((skill) => (
                <option key={skill.code} value={skill.code}>
                  {skill.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by Proficiency"
              className="h-9 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 text-xs font-medium text-zinc-700 transition-all hover:bg-white focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              value={proficiencyFilter}
              onChange={(e) => setProficiencyFilter(e.target.value)}
            >
              <option value="ALL">All Levels</option>
              <option value="PROFESSIONAL">{proficiencyLevelUiLabel('PROFESSIONAL')}</option>
              <option value="ADVANCED">{proficiencyLevelUiLabel('ADVANCED')}</option>
              <option value="INTERMEDIATE">{proficiencyLevelUiLabel('INTERMEDIATE')}</option>
              <option value="BEGINNER">{proficiencyLevelUiLabel('BEGINNER')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/75 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Primary Skill Category</th>
                <th className="px-4 py-3">Onboarding Progress</th>
                <th className="px-4 py-3">Verification Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                      <span>Loading candidates…</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-rose-600">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold">{error}</p>
                      <button
                        type="button"
                        onClick={loadStudents}
                        className="rounded-lg bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-zinc-500">
                    {students.length === 0
                      ? viewScope === 'MY'
                        ? 'No students are currently assigned to your department or campus scope.'
                        : 'No candidates have been onboarded yet.'
                      : 'No candidates match the selected filters.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const studentClaims = claims.filter((c) => c.studentId === student.userId);
                  const verifiedCount = studentClaims.filter((c) => c.status === 'VERIFIED').length;
                  const firstClaim = studentClaims[0];
                  const candidateCategory = firstClaim
                    ? categoryNameForSkillCode(firstClaim.skillCode)
                    : categoryLabel('PROGRAMMING_LANGUAGES');

                  return (
                    <tr
                      key={student.userId}
                      className="transition-colors duration-150 hover:bg-zinc-50/70"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8.5 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                            {getInitials(student.fullName)}
                          </span>

                          <div className="min-w-0">
                            <div
                              onClick={() => setSelectedStudent(student)}
                              className="font-bold text-zinc-900 hover:underline cursor-pointer text-sm"
                            >
                              {student.fullName}
                            </div>

                            <div className="truncate text-[11px] text-zinc-500">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700">
                          {candidateCategory}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {student.inviteStatus === 'ACCEPTED' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                            Pending Invite
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {verifiedCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                            {verifiedCount} Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/90 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 shadow-2xs">
                            <span className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                            In Evaluation
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-2xs transition-all hover:bg-zinc-50 hover:border-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        >
                          View Details
                          <ChevronRight
                            className="size-3 text-zinc-400"
                            strokeWidth={2}
                            aria-hidden
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent ? (
        <CandidateDetailDrawer
          candidate={selectedStudent}
          isOpen={Boolean(selectedStudent)}
          onClose={() => setSelectedStudent(null)}
        />
      ) : null}
    </div>
  );
}
