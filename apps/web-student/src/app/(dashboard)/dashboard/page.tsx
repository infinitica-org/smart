'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Target,
  Sparkles,
  FileCheck,
  Eye,
  ArrowRight,
  Award,
  GraduationCap,
  Calendar,
  ShieldCheck,
  Briefcase,
  Layers,
  FileBadge,
} from 'lucide-react';
import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
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
import { useProfileProgress } from '@/lib/use-profile-progress';
import { skillNameForCode } from '@/lib/skill-declarations';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const {
    loading: profileLoading,
    progress,
    skillClaims,
    verifiedSkillCount,
    declaredSkillCount,
    input,
  } = useProfileProgress();

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: queryKeys.myApplications(),
    queryFn: () => api.placement.listMyApplications(),
  });

  const loading = userLoading || profileLoading || appsLoading;
  const firstName = firstNameOf(user?.fullName) || 'Candidate';
  const profilePercent = progress?.percent ?? 33;
  const realApplications = appsData?.applications ?? [];

  // Map real applications from API/DB to match items (strictly no static dummy items)
  const matchItems: MatchItem[] = useMemo(() => {
    return realApplications.map((app) => ({
      id: app.applicationId,
      roleTitle: app.roleTitle || 'Software Engineer',
      companyName: app.companyName || 'Placement Partner',
      location: app.location || 'Remote',
      matchPercentage: app.matchScore ? Math.round(app.matchScore * 100) : 85,
    }));
  }, [realApplications]);

  // Build real dynamic activity feed from live claims and application events
  const dynamicActivities: ActivityFeedItem[] = useMemo(() => {
    const items: ActivityFeedItem[] = [];

    realApplications.forEach((app) => {
      items.push({
        id: `app-${app.applicationId}`,
        icon: 'file',
        text: `Application submitted to ${app.roleTitle || 'Role'} at ${app.companyName || 'Company'}`,
      });
    });

    skillClaims.forEach((claim) => {
      items.push({
        id: `claim-${claim.claimId}`,
        icon: 'trending',
        text: `Skill claim recorded: "${skillNameForCode(claim.skillCode)}" (${claim.status})`,
      });
    });

    return items;
  }, [realApplications, skillClaims]);

  const kpis = [
    {
      label: 'Strong-fit matches',
      value: matchItems.filter((m) => m.matchPercentage >= 85).length,
      subtext: '85%+ skill match',
      icon: Target,
      href: '/matches',
    },
    {
      label: 'New opportunities',
      value: matchItems.length,
      subtext: 'Matching target roles',
      icon: Sparkles,
      href: '/opportunities',
    },
    {
      label: 'Active applications',
      value: realApplications.length || input?.experiences?.length || 0,
      subtext: 'In recruitment pipeline',
      icon: FileCheck,
      href: '/applications',
    },
    {
      label: 'Verified Skills',
      value: verifiedSkillCount,
      subtext: `${declaredSkillCount} total claims`,
      icon: Eye,
      href: '/skills',
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
      <StudentVerificationBanner percent={profilePercent} areaStatus={progress?.areaStatus} />

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
          <StudentTopMatchesPanel matches={matchItems} />
        </div>

        {/* Right Column (1/3): Your skills (Connected strictly to DB claims) */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-850">
              <h3 className="font-heading text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                Your Skills
              </h3>
              <span className="text-xs font-semibold text-zinc-400">
                {verifiedSkillCount} verified
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {skillClaims.length > 0 ? (
                skillClaims.slice(0, 5).map((claim) => (
                  <div
                    key={claim.claimId}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2 text-xs transition-colors hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/60"
                  >
                    <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate">
                      {skillNameForCode(claim.skillCode)}
                    </span>
                    <span
                      className={
                        claim.status === 'VERIFIED'
                          ? 'inline-flex items-center gap-1 rounded-md border border-emerald-200/90 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }
                    >
                      {claim.status === 'VERIFIED' ? 'Verified ✓' : 'Declared'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 mb-2 dark:bg-zinc-800 dark:text-zinc-400">
                    <Award className="size-4" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                    No skills declared yet
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 dark:text-zinc-400">
                    Select skills in your profile to build your certified credentials.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Link
              href="/skills"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-200"
            >
              Manage skills & proofs
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
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
                  {verifiedSkillCount} verified claims
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
                  {matchItems.length} active opportunities
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
      <StudentActivityFeedPanel activities={dynamicActivities} />
    </div>
  );
}
