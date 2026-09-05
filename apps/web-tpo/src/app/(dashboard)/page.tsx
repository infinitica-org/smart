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
      {/* Header Bar / Welcome Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-[#F0FDFA] via-[#F8FAFC] to-white p-6 md:p-8 rounded-2xl border border-[#CCFBF1]/80 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#004C63]/10 text-[#004C63] text-xs font-bold mb-3 border border-[#004C63]/20">
            <Sparkles className="size-3.5" /> SMART TPO Operations
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Institution Operations Dashboard
          </h1>
          <p className="text-slate-600 text-xs md:text-sm mt-1.5 font-medium leading-relaxed">
            Real-time telemetry for candidate enrollment, verified skill credentials, and active job
            placement applications across all departments.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <Link href="/batches">
            <Button className="rounded-xl bg-[#004C63] text-white hover:bg-[#0A4D5C] font-bold text-xs px-5 py-3 flex items-center gap-2 shadow-sm transition-all">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Row 1: KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Candidates */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#004C63]/30 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Candidates
                </span>
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#004C63] border border-[#CCFBF1]">
                  <Users className="size-5" />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {stats.totalCandidates.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Enrolled candidates</p>
              </div>
            </div>

            {/* Verified Skills */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Verified Skills
                </span>
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="size-5" />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {stats.verifiedSkills.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Verified credentials</p>
              </div>
            </div>

            {/* Active Placements */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Placements
                </span>
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <TrendingUp className="size-5" />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {stats.activePlacements.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Offers issued</p>
              </div>
            </div>

            {/* Needs Attention */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Needs Attention
                </span>
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <AlertCircle className="size-5" />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {stats.needsAttention.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Candidates on hold</p>
              </div>
            </div>
          </div>

          {/* Row 2: Placement Pipeline */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-6 md:p-8 shadow-xs">
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Placement Pipeline</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Application distribution across active recruitment drives.
                </p>
              </div>
            </div>

            {/* Pipeline Stage Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 hover:bg-white hover:shadow-xs transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Applied</span>
                  <div className="size-8 rounded-lg bg-slate-200/60 flex items-center justify-center text-slate-500">
                    <Inbox className="size-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-4 tabular-nums">
                  {stats.applied}
                </p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full w-full" />
                </div>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-5 hover:bg-white hover:shadow-xs transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900">Shortlisted</span>
                  <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                    <FileText className="size-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-purple-950 mt-4 tabular-nums">
                  {stats.shortlisted}
                </p>
                <div className="w-full bg-purple-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full w-full" />
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-5 hover:bg-white hover:shadow-xs transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Interviewing</span>
                  <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                    <Activity className="size-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-amber-950 mt-4 tabular-nums">
                  {stats.interviewing}
                </p>
                <div className="w-full bg-amber-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full w-full" />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 hover:bg-white hover:shadow-xs transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Offered / Placed</span>
                  <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Briefcase className="size-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-emerald-950 mt-4 tabular-nums">
                  {stats.offered}
                </p>
                <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Feature Telemetry Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 md:p-8 shadow-xs hover:border-[#004C63]/30 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004C63] bg-[#F0FDFA] px-3 py-1 rounded-full border border-[#CCFBF1]">
                    <BarChart3 className="size-3.5" /> Batch Readiness
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 pt-1">Batch Readiness Scoring</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Batch readiness telemetry calculates automatically when candidates complete
                  certified level assessments across active cohorts.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 md:p-8 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                    <Sparkles className="size-3.5" /> Skill Telemetry
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 pt-1">Skill Gap Telemetry</h3>
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
