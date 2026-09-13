'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  Award,
  Calendar,
  UserCheck,
  Code2,
  Cpu,
  BarChart2,
  ArrowRight,
} from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { type InstitutionStudentDto, type SkillClaimDto } from '@smart/contracts';
import { api } from '../../lib/api';
import {
  categoryLabel,
  categoryNameForSkillCode,
  skillCategoryFor,
} from '../../lib/skill-taxonomy';

export default function DashboardPage() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.onboarding.listTpoStudents().catch(() => [] as InstitutionStudentDto[]),
      api.assessment.listSkillClaims().catch(() => [] as SkillClaimDto[]),
    ])
      .then(([studentList, claimList]) => {
        if (!active) return;
        setStudents(studentList);
        setClaims(claimList);
      })
      .catch((err) => {
        if (!active) return;
        setError(isSmartApiError(err) ? err.message : 'Failed to load cohort telemetry.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Compute Read-Only Cohort KPIs
  const totalProvisioned = students.length;
  const invitesAccepted = students.filter((s) => s.inviteStatus === 'ACCEPTED').length;
  const onboardingRate =
    totalProvisioned > 0 ? Math.round((invitesAccepted / totalProvisioned) * 100) : 0;
  const verifiedClaimsCount = claims.filter((c) => c.status === 'VERIFIED').length;

  const categoryCounts = new Map<string, number>();

  claims
    .filter((c) => c.status === 'VERIFIED')
    .forEach((claim) => {
      const categoryId = skillCategoryFor(claim.skillCode);
      if (!categoryId) return;
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
    });

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <main className="max-w-[1400px] mx-auto space-y-6 font-sans select-none pb-12 text-zinc-100">
      {/* Header Banner Card */}
      <div className="bg-zinc-900/90 p-6 md:p-7 rounded-xl border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Welcome back, Pilot TPO!
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm font-medium mt-1">
            Read-only cohort telemetry, candidate onboarding progress, and autonomous skill
            verification.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-zinc-950 text-zinc-300 border border-zinc-800 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2">
            <Calendar className="size-4 text-zinc-400" />
            {formattedDate}
          </div>
          <Link
            href="/provisioning"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-emerald-500/50 shadow-sm"
          >
            + Onboard Candidates
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs font-bold">
          {error}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 shadow-xs hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Total Onboarded
            </span>
            <div className="size-8 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '...' : totalProvisioned}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium">
            Total candidate accounts onboarded
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 shadow-xs hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Invites Accepted
            </span>
            <div className="size-8 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center">
              <UserCheck className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '...' : invitesAccepted}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium">
            Candidates active on platform
          </p>
        </div>

        {/* KPI 3 */}
        <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 shadow-xs hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Onboarding Completion
            </span>
            <div className="size-8 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '...' : `${onboardingRate}%`}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium">Onboarding flow completed</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 shadow-xs hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Verified Skills
            </span>
            <div className="size-8 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center">
              <Award className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '...' : verifiedClaimsCount}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium">
            Autonomous certified credentials
          </p>
        </div>
      </div>

      {/* Domain Readiness Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Domain 1 */}
        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800/90 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
              <Code2 className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Software Engineering</h3>
              <p className="text-[10px] text-zinc-500 font-medium">Programming & DSA</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
            <span className="text-zinc-400 font-medium">Verified Credentials:</span>
            <span className="font-extrabold text-white">
              {categoryCounts.get('PROGRAMMING_LANGUAGES') ?? 0}
            </span>
          </div>
        </div>

        {/* Domain 2 */}
        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800/90 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
              <Cpu className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">AI & Machine Learning</h3>
              <p className="text-[10px] text-zinc-500 font-medium">ML & Neural Networks</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
            <span className="text-zinc-400 font-medium">Verified Credentials:</span>
            <span className="font-extrabold text-white">
              {categoryCounts.get('AI_ML_DATA_SCIENCE') ?? 0}
            </span>
          </div>
        </div>

        {/* Domain 3 */}
        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800/90 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
              <BarChart2 className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Data & Analytics</h3>
              <p className="text-[10px] text-zinc-500 font-medium">SQL & Visualization</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
            <span className="text-zinc-400 font-medium">Verified Credentials:</span>
            <span className="font-extrabold text-white">
              {categoryCounts.get('DATA_ENGINEERING_BIG_DATA') ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Cohort Overview Table Container */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        {/* Table Header Section */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">
              Candidate Cohort Observability Overview
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              Read-only view of candidate stream choices, onboarding completion, and verified
              skills.
            </p>
          </div>
          <Link
            href="/students"
            className="text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            View Full Candidate Roster <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-zinc-900 text-zinc-300 font-semibold border-b border-zinc-800 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Candidate</th>
                <th className="px-5 py-3">Primary Skill Category</th>
                <th className="px-5 py-3">Onboarding Progress</th>
                <th className="px-5 py-3">Verified Skills</th>
                <th className="px-5 py-3">Autonomous Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {students.slice(0, 5).map((student) => {
                const studentClaims = claims.filter((c) => c.studentId === student.userId);
                const verifiedClaims = studentClaims.filter((c) => c.status === 'VERIFIED');
                const firstClaim = studentClaims[0];
                const candidateCategory = firstClaim
                  ? categoryNameForSkillCode(firstClaim.skillCode)
                  : categoryLabel('PROGRAMMING_LANGUAGES');

                return (
                  <tr key={student.userId} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white">{student.fullName}</div>
                      <div className="text-zinc-500 font-mono text-[11px]">{student.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700">
                        {candidateCategory}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {student.inviteStatus === 'ACCEPTED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <CheckCircle2 className="size-3" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          Pending Invitation
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-200">
                      {verifiedClaims.length > 0 ? (
                        <span className="text-white font-bold">
                          {verifiedClaims.length} verified credential(s)
                        </span>
                      ) : (
                        <span className="text-zinc-500">0 verified</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
                        Autonomous Evaluation
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
