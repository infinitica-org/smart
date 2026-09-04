'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  Inbox,
  Briefcase,
  Activity,
  FileText,
  AlertCircle,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { Alert, Button } from '@smart/ui';
import { applicationsApi, openingsApi, api } from '../../lib/api';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

interface DashboardStats {
  totalCandidates: number;
  needsAttention: number;
  verifiedSkills: number;
  activePlacements: number;
  applied: number;
  shortlisted: number;
  interviewing: number;
  offered: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.onboarding.listTpoStudents(),
      openingsApi.list(),
      api.assessment.listSkillClaims().catch(() => []),
    ])
      .then(async ([students, openingsRes, claims]) => {
        const perOpening = await Promise.all(
          openingsRes.openings.map((opening) =>
            applicationsApi.listForOpening(opening.openingId).catch(() => ({ applications: [] })),
          ),
        );
        const applications = perOpening.flatMap((res) => res.applications);
        if (cancelled) return;
        setStats({
          totalCandidates: students.length,
          needsAttention: students.filter((s) => s.heldAt !== null).length,
          verifiedSkills: claims.filter((c) => c.status === 'VERIFIED').length,
          activePlacements: applications.filter((a) => a.stage === 'OFFER').length,
          applied: applications.filter((a) => a.stage === 'APPLIED').length,
          shortlisted: applications.filter((a) => a.stage === 'SHORTLISTED').length,
          interviewing: applications.filter((a) => a.stage === 'INTERVIEW').length,
          offered: applications.filter((a) => a.stage === 'OFFER').length,
        });
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught, 'Could not load your dashboard.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full font-sans pb-12 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-md border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Real-time analytics for candidate enrollment, verified skill credentials, and placement
            applications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/batches">
            <Button className="rounded-md bg-[#004c63] text-white hover:bg-[#003a4d] font-bold text-xs px-4 py-2.5 flex items-center gap-2 shadow-sm">
              <Layers className="size-4" /> Manage Batches
            </Button>
          </Link>
        </div>
      </div>

      {error ? (
        <Alert tone="danger" title="Dashboard unavailable">
          {error}
        </Alert>
      ) : loading || !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-md bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Row 1: Neat & Premium SaaS Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Candidates */}
            <div className="rounded-md bg-white p-6 border border-slate-200/80 shadow-sm hover:border-[#004c63]/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Candidates
                </span>
                <div className="flex size-9 items-center justify-center rounded-full bg-[#004c63]/10 text-[#004c63] border border-[#004c63]/20">
                  <Users className="size-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {stats.totalCandidates.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Enrolled in institution</p>
              </div>
            </div>

            {/* Verified Skills */}
            <div className="rounded-md bg-white p-6 border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Verified Skills
                </span>
                <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {stats.verifiedSkills.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Verified credentials</p>
              </div>
            </div>

            {/* Active Placements */}
            <div className="rounded-md bg-white p-6 border border-slate-200/80 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Placements
                </span>
                <div className="flex size-9 items-center justify-center rounded-full bg-sky-50 text-sky-600 border border-sky-200">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {stats.activePlacements.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Offers issued</p>
              </div>
            </div>

            {/* Needs Attention */}
            <div className="rounded-md bg-white p-6 border border-slate-200/80 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Needs Attention
                </span>
                <div className="flex size-9 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  <AlertCircle className="size-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {stats.needsAttention.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Candidates on hold</p>
              </div>
            </div>
          </div>

          {/* Row 2: Placement Pipeline */}
          <div className="rounded-md bg-white border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Placement Pipeline</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Application distribution across active recruitment drives.
                </p>
              </div>
            </div>

            {/* Pipeline Stage Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-md border border-slate-200/80 bg-slate-50/70 p-4 hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Applied</span>
                  <Inbox className="size-4 text-slate-400" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-3 tabular-nums">
                  {stats.applied}
                </p>
              </div>

              <div className="rounded-md border border-slate-200/80 bg-slate-50/70 p-4 hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Shortlisted</span>
                  <FileText className="size-4 text-slate-400" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-3 tabular-nums">
                  {stats.shortlisted}
                </p>
              </div>

              <div className="rounded-md border border-slate-200/80 bg-slate-50/70 p-4 hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Interviewing</span>
                  <Activity className="size-4 text-slate-400" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-3 tabular-nums">
                  {stats.interviewing}
                </p>
              </div>

              <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-4 hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Offered / Placed</span>
                  <Briefcase className="size-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-extrabold text-emerald-950 mt-3 tabular-nums">
                  {stats.offered}
                </p>
              </div>
            </div>
          </div>

          {/* Row 3: Feature Telemetry Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md bg-white border border-slate-200/80 p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004c63] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                    <BarChart3 className="size-3.5" /> Batch Readiness
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 pt-1">Batch Readiness Scoring</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Batch readiness telemetry calculates automatically when candidates complete
                  certified level assessments across active cohorts.
                </p>
              </div>
            </div>

            <div className="rounded-md bg-white border border-slate-200/80 p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    <Sparkles className="size-3.5" /> Skill Telemetry
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 pt-1">Skill Gap Telemetry</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Skill gap analytics compute dynamically as candidate assessment attempt data is
                  recorded across track competencies.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
