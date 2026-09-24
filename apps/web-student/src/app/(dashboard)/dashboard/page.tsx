'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Target,
  Sparkles,
  FileCheck,
  Eye,
  ArrowRight,
  GraduationCap,
  Calendar,
  ShieldCheck,
  Briefcase,
  Layers,
  FileBadge,
} from 'lucide-react';
import type { DashboardActivityKind, DashboardAttentionState } from '@smart/contracts';
import {
  DashboardListPanel,
  type DashboardBadgeTone,
} from '@/components/dashboard/DashboardListPanel';
import { StudentNextActionCard } from '@/components/dashboard/StudentNextActionCard';
import { StudentVerificationBanner } from '@/components/dashboard/StudentVerificationBanner';
import {
  StudentTopMatchesPanel,
  type MatchItem,
} from '@/components/dashboard/StudentTopMatchesPanel';
import {
  StudentActivityFeedPanel,
  type ActivityFeedItem,
} from '@/components/dashboard/StudentActivityFeedPanel';
import { firstNameOf, useCurrentUser } from '@/lib/candidate-identity';
import { useStudentDashboard } from '@/lib/use-student-dashboard';

const ATTENTION_BADGE: Record<
  DashboardAttentionState,
  { label: string; tone: DashboardBadgeTone }
> = {
  FAILED: { label: 'Failed', tone: 'danger' },
  NEEDS_ACTION: { label: 'Needs action', tone: 'warning' },
  PROCESSING: { label: 'In progress', tone: 'neutral' },
};

const ACTIVITY_ICON: Record<DashboardActivityKind, ActivityFeedItem['icon']> = {
  PROFILE: 'eye',
  VERIFICATION: 'trending',
  APPLICATION: 'file',
};

function stageText(stage: string): string {
  const text = stage.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: summary, isLoading: summaryLoading, isError, refetch } = useStudentDashboard();

  const loading = userLoading || summaryLoading;
  const firstName = firstNameOf(user?.fullName) || 'Candidate';
  const profilePercent = summary?.completion.percent ?? 0;

  const areaStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    summary?.completion.completedAreas.forEach((area) => (status[area] = true));
    summary?.completion.incompleteAreas.forEach((area) => (status[area] = false));
    return status;
  }, [summary]);

  const matchItems: MatchItem[] = useMemo(
    () =>
      (summary?.topMatches ?? []).map((match) => ({
        id: match.applicationId ?? match.openingId,
        roleTitle: match.roleTitle,
        companyName: match.companyName,
        location: match.location ?? 'Location not specified',
        matchPercentage: match.matchPercent,
      })),
    [summary],
  );

  const activities: ActivityFeedItem[] = useMemo(
    () =>
      (summary?.recentActivity ?? []).map((item) => ({
        id: item.id,
        icon: ACTIVITY_ICON[item.kind],
        text: item.label,
      })),
    [summary],
  );

  const profileViews = summary?.profileViews;
  const kpis = [
    {
      label: 'Top matches',
      value: summary?.topMatches.length ?? 0,
      subtext: 'Skills-based fit',
      icon: Target,
      href: '/matches',
    },
    {
      label: 'New opportunities',
      value: summary?.opportunities.total ?? 0,
      subtext: 'Open at your institution',
      icon: Sparkles,
      href: '/opportunities',
    },
    {
      label: 'Active applications',
      value: summary?.activeApplications.total ?? 0,
      subtext: 'In recruitment pipeline',
      icon: FileCheck,
      href: '/applications',
    },
    {
      label: 'Employer profile views',
      value: profileViews?.visible ? (profileViews.employerViews ?? 0) : '—',
      subtext: profileViews?.visible
        ? `Last ${profileViews.windowDays} days`
        : 'Hidden. Turn on in Settings',
      icon: Eye,
      href: profileViews?.visible ? '/public-profile' : '/settings',
    },
  ];

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-12 pt-2 font-sans select-none">
      {/* 🚀 Top SaaS Admin Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
            <GraduationCap className="size-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
                {loading ? 'Welcome' : `Welcome, ${firstName}`}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                Active Candidate
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live candidate readiness profile, placement opportunities, and verified credentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200/80 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-2xs dark:border-zinc-800 dark:bg-[#161616] dark:text-zinc-300">
            <Calendar className="size-3.5 text-zinc-500" strokeWidth={1.5} />
            {formattedDate}
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <ShieldCheck className="size-3.5" />
            Complete Profile
          </Link>
        </div>
      </section>

      {/* Hero Verification Ring Banner connected to DB % and dynamic areaStatus */}
      {isError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <span>Could not load your dashboard. Your data is safe; try again.</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-md border border-rose-300 px-3 py-1.5 font-bold hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-950"
          >
            Retry
          </button>
        </div>
      ) : null}

      <StudentVerificationBanner percent={profilePercent} areaStatus={areaStatus} />

      {summary ? <StudentNextActionCard action={summary.nextAction} /> : null}

      {/* 📊 4 KPI Tiles (Matching SaaS Admin KpiTile Bento Pattern) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-[#161616] dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {kpi.label}
                </p>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-white dark:group-hover:text-zinc-950">
                  <Icon className="size-5 stroke-[1.75]" />
                </div>
              </div>

              <div className="mt-2">
                <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {kpi.subtext}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 📊 2-Column Section: Top Matches & Your Skills */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left Column (2/3): Top matches for you */}
        <div className="lg:col-span-2">
          {summary ? <StudentTopMatchesPanel matches={matchItems} /> : null}
        </div>

        {/* Right Column (1/3): verification steps that need attention */}
        <DashboardListPanel
          testId="attention-panel"
          loading={summaryLoading}
          title="Needs your attention"
          viewAllHref="/profile"
          viewAllLabel="Open profile"
          items={(summary?.attentionItems ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.detail,
            href: item.href,
            badge: ATTENTION_BADGE[item.state],
          }))}
          emptyTitle="Nothing needs your attention"
          emptyBody="Every verification step is up to date."
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DashboardListPanel
          testId="opportunities-panel"
          loading={summaryLoading}
          title="New employer opportunities"
          viewAllHref="/opportunities"
          total={summary?.opportunities.total}
          items={(summary?.opportunities.items ?? []).map((item) => ({
            id: item.openingId,
            title: item.roleTitle,
            subtitle: [item.companyName, item.location].filter(Boolean).join(' · '),
            meta: item.lastDateToApply ? `Apply by ${item.lastDateToApply}` : undefined,
            href: '/opportunities',
          }))}
          emptyTitle="No new opportunities"
          emptyBody="Open roles at your institution that you have not applied to appear here."
        />
        <DashboardListPanel
          testId="applications-panel"
          loading={summaryLoading}
          title="Active applications"
          viewAllHref="/applications"
          total={summary?.activeApplications.total}
          items={(summary?.activeApplications.items ?? []).map((item) => ({
            id: item.applicationId,
            title: item.roleTitle,
            subtitle: item.companyName,
            href: '/applications',
            badge: { label: stageText(item.stage), tone: 'neutral' as const },
          }))}
          emptyTitle="No active applications"
          emptyBody="Applications in progress will appear here."
        />
      </div>

      {/* 🚀 Operational Queues / Quick Launchpad (Matching SaaS Admin Pattern) */}
      <section className="relative overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-850">
          <div>
            <h2 className="font-heading text-base font-bold tracking-tight text-zinc-900 dark:text-white">
              Readiness Launchpad
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Direct access to candidate profile modules, assessments, and placement drives
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/skills"
            className="group flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/70 p-4 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-white dark:group-hover:text-zinc-950">
                <Layers className="size-5 stroke-[1.75]" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Skills & Claims</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Verify and manage your skills
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all dark:group-hover:text-white" />
          </Link>

          <Link
            href="/matches"
            className="group flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/70 p-4 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-white dark:group-hover:text-zinc-950">
                <Briefcase className="size-5 stroke-[1.75]" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Job Matches</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {summary?.opportunities.total ?? 0} new opportunities
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all dark:group-hover:text-white" />
          </Link>

          <Link
            href="/profile"
            className="group flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/70 p-4 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-white dark:group-hover:text-zinc-950">
                <ShieldCheck className="size-5 stroke-[1.75]" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Profile Readiness</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {profilePercent}% completed
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all dark:group-hover:text-white" />
          </Link>

          <Link
            href="/assessments"
            className="group flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/70 p-4 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-white dark:group-hover:text-zinc-950">
                <FileBadge className="size-5 stroke-[1.75]" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Assessments</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Certify skills</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all dark:group-hover:text-white" />
          </Link>
        </div>
      </section>

      {/* Recent activity feed connected strictly to live DB events */}
      {summary ? <StudentActivityFeedPanel activities={activities} /> : null}
    </div>
  );
}
