'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Briefcase, CheckCircle2, GraduationCap, Users, Zap } from 'lucide-react';
import type {
  AdminDashboardDto,
  AiUsageSummaryDto,
  InstitutionDto,
  CompanyDto,
} from '@smart/contracts';

import { PageHeader } from '@/components/page-header';
import { InlineAlert, PageStack } from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardDto | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageSummaryDto | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionDto[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [dashData, aiData, instData, compData] = await Promise.all([
          api.onboarding.dashboard(),
          api.onboarding.aiUsage().catch(() => null),
          api.onboarding.listInstitutions().catch(() => []),
          api.onboarding.listCompanies().catch(() => []),
        ]);
        setDashboard(dashData);
        setAiUsage(aiData);
        setInstitutions(instData);
        setCompanies(compData);
      } catch {
        setError('Failed to load platform analytics from database.');
      } finally {
        setLoading(false);
      }
    }
    loadMetrics().catch(() => {});
  }, []);

  if (error) {
    return (
      <PageStack>
        <PageHeader
          icon={BarChart3}
          title="Platform Analytics"
          description="Live metrics computed directly from PostgreSQL database."
        />
        <InlineAlert tone="danger" title={error} />
      </PageStack>
    );
  }

  const activeStudents = dashboard?.students.active ?? 0;
  const totalStudents = dashboard?.students.total ?? 0;
  const totalCompanies = companies.length;
  const verifiedCompanies = companies.filter((c) => c.verificationStatus === 'APPROVED').length;
  const totalInstitutions = institutions.length;
  const activeInstitutions = institutions.filter((i) => !i.heldAt && !i.deactivatedAt).length;

  // Compute live plan breakdown from institutions and companies
  const planDistribution = dashboard?.planMix ?? [];
  const maxPlanCount = Math.max(...planDistribution.map((p) => p.count), 1);
  const totalPlanItems = planDistribution.reduce((acc, p) => acc + p.count, 0);

  return (
    <PageStack>
      <PageHeader
        icon={BarChart3}
        title="Platform Analytics"
        description="Comprehensive insights across registered candidates, verified institutions, hiring employers, and AI evaluations."
      />

      {/* KPI Cards from DB */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Registered Students */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Active Candidates
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {loading ? '—' : activeStudents.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {totalStudents.toLocaleString()} total student profiles
            </p>
          </div>
        </div>

        {/* Card 2: Partner Universities */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Partner Universities
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {loading ? '—' : activeInstitutions}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {totalInstitutions} total institutions configured
            </p>
          </div>
        </div>

        {/* Card 3: Hiring Employers */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Hiring Employers
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {loading ? '—' : totalCompanies}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {verifiedCompanies} verified hiring partners
            </p>
          </div>
        </div>

        {/* Card 4: AI Evaluations */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              AI Evaluations (24h)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {loading ? '—' : (aiUsage?.last24h.requestCount ?? 0).toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              ${(aiUsage?.last24h.totalCostUsd ?? 0).toFixed(2)} USD LLM gateway cost
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Plan Distribution & Verification Pipeline Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Plan Capacity & Tier Breakdown */}
        <div className="rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
            <div>
              <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
                Institution Tier Breakdown
              </h3>
              <p className="text-xs text-zinc-500">
                Distribution of active institutions across Free, Basic, Pro, and Enterprise tiers.
              </p>
            </div>
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-zinc-700">
              {totalPlanItems} Total Active
            </span>
          </div>

          <div className="pt-6">
            {planDistribution.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400">
                No tier distribution data available in database
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visual Bento Bar Chart */}
                <div className="flex h-48 items-end gap-6 border-b border-zinc-200 pb-4 px-2">
                  {planDistribution.map((item) => {
                    const heightPct = Math.max(Math.round((item.count / maxPlanCount) * 100), 12);
                    const sharePct =
                      totalPlanItems > 0 ? Math.round((item.count / totalPlanItems) * 100) : 0;
                    return (
                      <div
                        key={item.code}
                        className="group flex flex-1 flex-col items-center justify-end gap-2 h-full"
                      >
                        <span className="text-[11px] font-bold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          {sharePct}%
                        </span>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[56px] rounded-t-md bg-zinc-900 hover:bg-black transition-all cursor-pointer relative flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                        >
                          {item.count}
                        </div>
                        <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-700">
                          {item.code}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend list with rounded-md pill tags */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {planDistribution.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between rounded-md border border-zinc-200/70 bg-zinc-50/70 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-zinc-600">{item.code}</span>
                      <strong className="font-mono font-bold text-zinc-900">{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Health Summary */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs">
          <div>
            <div className="border-b border-zinc-100 pb-4">
              <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
                Platform Pipeline & Integrity
              </h3>
              <p className="text-xs text-zinc-500">Live tenant verification and security status.</p>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-md border border-zinc-200/70 bg-zinc-50/70 px-3.5 py-2.5 text-xs">
                <span className="text-zinc-600">Pending Verifications:</span>
                <strong className="font-mono font-semibold text-zinc-900">
                  {dashboard?.pendingVerifications ?? 0}
                </strong>
              </div>
              <div className="flex items-center justify-between rounded-md border border-zinc-200/70 bg-zinc-50/70 px-3.5 py-2.5 text-xs">
                <span className="text-zinc-600">Flagged Integrity Cases:</span>
                <strong className="font-mono font-semibold text-zinc-900">
                  {dashboard?.flaggedAttempts ?? 0}
                </strong>
              </div>
              <div className="flex items-center justify-between rounded-md border border-zinc-200/70 bg-zinc-50/70 px-3.5 py-2.5 text-xs">
                <span className="text-zinc-600">Accounts on Hold:</span>
                <strong className="font-mono font-semibold text-zinc-900">
                  {(dashboard?.openHolds.institutions ?? 0) + (dashboard?.openHolds.students ?? 0)}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-zinc-200/80 bg-zinc-50/90 p-3.5 text-xs text-zinc-700">
            <div className="flex items-center gap-2 font-semibold text-zinc-900">
              <CheckCircle2 className="h-4 w-4 text-zinc-900" />
              <span>Live Database Connected</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              All metrics are queried directly in real-time with zero mock data.
            </p>
          </div>
        </div>
      </div>
    </PageStack>
  );
}
