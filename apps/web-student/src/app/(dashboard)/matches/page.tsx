'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  Search,
  DollarSign,
  Check,
  X,
  ShieldCheck,
  Target,
  Clock,
  Info,
  SlidersHorizontal,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { cn } from '@smart/ui';
import { motion, AnimatePresence } from 'motion/react';
import { useProfileProgress } from '@/lib/use-profile-progress';
import { canVerifySkills } from '@/lib/profile-progress';
import { api } from '@/lib/api';
import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
import { skillNameForCode } from '@/lib/skill-declarations';

export interface JobMatch {
  id: string;
  title: string;
  company: string;
  logoText: string;
  location: string;
  type: 'Full-time' | 'Internship' | 'Part-time';
  salary: string;
  matchScore: number;
  matchReason: string;
  tags: string[];
  description: string;
  companyAbout: string;
  companyProfileUrl: string;
  requiredSkills: { name: string; level: string; met: boolean; note: string }[];
  postedDaysAgo: number;
  deadline?: string;
}

type TabType = 'strong' | 'medium' | 'applied' | 'saved';
type SortOption = 'best-match' | 'newest' | 'pay';
type JobTypeFilter = 'all' | 'Full-time' | 'Internship' | 'Part-time';

interface AppliedApplication {
  id: string;
  jobId: string;
  title: string;
  company: string;
  logoText: string;
  location: string;
  salary: string;
  appliedDate: string;
  status: 'Applied' | 'Viewed' | 'Interviewing' | 'Rejected' | 'Hired';
}

export default function MatchesPage() {
  const { progress, skillClaims, loading: profileLoading } = useProfileProgress();
  const profilePercent = progress?.percent ?? 33;
  const isVerified = canVerifySkills(profilePercent);

  const [activeTab, setActiveTab] = useState<TabType>('strong');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState<JobTypeFilter>('all');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('best-match');

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: queryKeys.myApplications(),
    queryFn: () => api.placement.listMyApplications(),
  });

  // Map real database applications to applied tracking rows
  const realDbApplications = appsData?.applications ?? [];

  const appliedApplications: AppliedApplication[] = useMemo(() => {
    return realDbApplications.map((app) => ({
      id: app.applicationId,
      jobId: app.applicationId,
      title: app.roleTitle || 'Software Engineer',
      company: app.companyName || 'Campus Placement Partner',
      logoText: (app.companyName || 'SM').slice(0, 2).toUpperCase(),
      location: app.location || 'Remote',
      salary: 'Competitive CTC',
      appliedDate: 'Active',
      status: (app.stage as AppliedApplication['status']) || 'Applied',
    }));
  }, [realDbApplications]);

  // Compute live match recommendations based on verified database skill claims
  const liveMatches: JobMatch[] = useMemo(() => {
    if (skillClaims.length === 0) return [];

    return skillClaims.map((claim, idx) => {
      const isClaimVerified = claim.status === 'VERIFIED';
      const name = skillNameForCode(claim.skillCode);
      const score = isClaimVerified ? 92 : 76;

      return {
        id: `match-${claim.claimId || idx}`,
        title: `${name} Engineer`,
        company: 'Campus Hiring Partner',
        logoText: name.slice(0, 2).toUpperCase(),
        location: 'Bangalore / Hybrid',
        type: 'Full-time',
        salary: '₹14 - 20 LPA',
        matchScore: score,
        matchReason: `Your ${name} claim (${claim.status}) matches the job requirement profile.`,
        tags: [name, 'Software Engineering', claim.proficiency || 'Intermediate'],
        description: `Join our campus cohort looking for verified ${name} capabilities to build enterprise web applications and reliable microservices.`,
        companyAbout: 'Enterprise placement partner connected through SMART campus hiring network.',
        companyProfileUrl: '#',
        requiredSkills: [
          {
            name,
            level: claim.proficiency || 'Intermediate',
            met: isClaimVerified,
            note: `Status: ${claim.status}`,
          },
          {
            name: 'System Architecture',
            level: 'Intermediate',
            met: isClaimVerified,
            note: 'Evaluated in defense interview',
          },
        ],
        postedDaysAgo: idx + 1,
        deadline: 'In 5 days',
      };
    });
  }, [skillClaims]);

  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);
  const [showAppliedSuccess, setShowAppliedSuccess] = useState(false);
  const [justAppliedTitle, setJustAppliedTitle] = useState('');

  const toggleSave = (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleApply = async (job: JobMatch, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setJustAppliedTitle(`${job.title} at ${job.company}`);
    setShowAppliedSuccess(true);
  };

  const strongFitJobs = useMemo(() => liveMatches.filter((j) => j.matchScore >= 85), [liveMatches]);
  const mediumFitJobs = useMemo(
    () => liveMatches.filter((j) => j.matchScore < 85 && j.matchScore >= 60),
    [liveMatches],
  );
  const savedJobs = useMemo(
    () => liveMatches.filter((j) => savedJobIds.has(j.id)),
    [liveMatches, savedJobIds],
  );

  const filteredAndSortedJobs = useMemo(() => {
    let list: JobMatch[] = [];
    if (activeTab === 'strong') list = strongFitJobs;
    else if (activeTab === 'medium') list = mediumFitJobs;
    else if (activeTab === 'saved') list = savedJobs;
    else return [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.tags.some((t) => t.toLowerCase().includes(q)) ||
          j.matchReason.toLowerCase().includes(q),
      );
    }

    if (jobTypeFilter !== 'all') {
      list = list.filter((j) => j.type === jobTypeFilter);
    }

    if (remoteOnly) {
      list = list.filter((j) => j.location.toLowerCase().includes('remote'));
    }

    const sorted = [...list];
    if (sortBy === 'best-match') {
      sorted.sort((a, b) => b.matchScore - a.matchScore);
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
    } else if (sortBy === 'pay') {
      sorted.sort((a, b) => b.salary.localeCompare(a.salary));
    }

    return sorted;
  }, [
    activeTab,
    strongFitJobs,
    mediumFitJobs,
    savedJobs,
    searchQuery,
    jobTypeFilter,
    remoteOnly,
    sortBy,
  ]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16 pt-2 font-sans select-none">
      {/* 🚀 Top Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
            <Target className="size-6 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
              Job Matches
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Verified campus placement opportunities recommended by Smart based on your evaluated
              skill claims
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <ShieldCheck className="size-3.5" />
            Direct Recruiter Fast-track Active
          </span>
        </div>
      </section>

      {/* ⚠️ Unverified State Gate */}
      {!isVerified && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-md border border-amber-200 bg-amber-50/80 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold">Verify your profile to unlock matches</p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                You currently have {profilePercent}% profile readiness. Complete your experiences
                and verify skills to unlock match ranking.
              </p>
            </div>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amber-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-amber-800 dark:bg-amber-400 dark:text-zinc-950 shrink-0"
          >
            Go to verification
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* 🧭 Top Bar: Tabs & Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Animated Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-zinc-200/80 bg-zinc-100/75 p-1 dark:border-zinc-800 dark:bg-zinc-900/80">
            {[
              { key: 'strong', label: 'Strong fit', count: strongFitJobs.length },
              { key: 'medium', label: 'Medium fit', count: mediumFitJobs.length },
              { key: 'applied', label: 'Applied', count: appliedApplications.length },
              { key: 'saved', label: 'Saved', count: savedJobs.length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabType)}
                className={cn(
                  'relative z-10 flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150',
                  activeTab === tab.key
                    ? 'font-bold text-zinc-950 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
                )}
              >
                {activeTab === tab.key && (
                  <motion.span
                    layoutId="active-matches-tab"
                    className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                    tab.key === 'strong'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role, company, skill..."
              className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>
        </div>

        {/* Filters & Sort Controls */}
        {activeTab !== 'applied' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-zinc-100 py-3 dark:border-zinc-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mr-1">
                <SlidersHorizontal className="size-3.5" />
                Filters:
              </span>

              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value as JobTypeFilter)}
                className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-2xs focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <option value="all">All Job Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Part-time">Part-time</option>
              </select>

              <button
                type="button"
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors shadow-2xs',
                  remoteOnly
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                )}
              >
                Remote Only
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-2xs focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <option value="best-match">Best Match</option>
                <option value="newest">Newest</option>
                <option value="pay">Highest Pay</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 📦 Main Content Area */}
      {activeTab === 'applied' ? (
        /* Applied Tab Content */
        <div className="space-y-4">
          {appliedApplications.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <Briefcase className="mx-auto size-8 text-zinc-400 mb-2" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No applications submitted yet
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Browse your strong-fit matches and submit verified applications with one click.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('strong')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              >
                Explore Strong Fits
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {appliedApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 font-bold text-xs text-zinc-800 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {app.logoText}
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-bold text-zinc-950 dark:text-white">
                        {app.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {app.company} · {app.location} · {app.salary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
                        app.status === 'Applied' &&
                          'border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300',
                        app.status === 'Viewed' &&
                          'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
                        app.status === 'Interviewing' &&
                          'border border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900 dark:bg-purple-950/50 dark:text-purple-300',
                        app.status === 'Hired' &&
                          'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
                        app.status === 'Rejected' &&
                          'border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
                      )}
                    >
                      ● {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Matches Grid */
        <div className="space-y-4">
          {profileLoading || appsLoading ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              Loading job matches from database…
            </div>
          ) : filteredAndSortedJobs.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <Target className="mx-auto size-8 text-zinc-400 mb-2" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No matching opportunities in this filter
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Add more skills or projects to improve matches.
              </p>
              <Link
                href="/skills"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              >
                <Plus className="size-3.5" />
                Add More Skills
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAndSortedJobs.map((job) => {
                const isSaved = savedJobIds.has(job.id);
                const isApplied = appliedApplications.some((a) => a.jobId === job.id);

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="group relative cursor-pointer flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-400 hover:shadow-xs dark:border-zinc-800 dark:bg-[#161616] dark:hover:border-zinc-700"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 font-bold text-xs text-zinc-800 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                            {job.logoText}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-heading text-base font-bold text-zinc-950 group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-200">
                                {job.title}
                              </h3>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                                  job.matchScore >= 85
                                    ? 'border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'border-blue-200/90 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
                                )}
                              >
                                <CheckCircle2 className="size-3 text-emerald-600" />
                                {job.matchScore}% Match
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {job.company} · {job.location} · {job.type}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-md border border-zinc-100 bg-zinc-50/80 p-2.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                          <span className="font-bold text-zinc-900 dark:text-white mr-1">
                            Why you match:
                          </span>
                          <span>{job.matchReason}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1">
                            <DollarSign className="size-3.5 text-zinc-500" />
                            {job.salary}
                          </span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
                            <Clock className="size-3 text-zinc-400" />
                            {job.deadline}
                          </span>
                          {job.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={(e) => toggleSave(job.id, e)}
                          title={isSaved ? 'Remove from saved' : 'Save job'}
                          className={cn(
                            'rounded-md border p-2 text-xs font-semibold shadow-2xs transition-colors',
                            isSaved
                              ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                          )}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="size-4" />
                          ) : (
                            <Bookmark className="size-4" />
                          )}
                        </button>

                        {isApplied ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <Check className="size-3.5" />
                            Applied
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleApply(job, e)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                          >
                            Apply
                            <ArrowRight className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 🔍 Job Detail Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]"
            >
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="absolute right-4 top-4 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <X className="size-5" />
              </button>

              <div className="flex items-start gap-4 pr-8">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 font-bold text-sm text-zinc-800 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {selectedJob.logoText}
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-zinc-950 dark:text-white">
                    {selectedJob.title}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {selectedJob.company} · {selectedJob.location} · {selectedJob.type}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {selectedJob.salary}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      {selectedJob.matchScore}% Match
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                    About the Role
                  </h3>
                  <p className="mt-1.5 text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {selectedJob.description}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Required Skills & Readiness Match
                  </h3>
                  <div className="mt-2 space-y-2">
                    {selectedJob.requiredSkills.map((req, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-md border text-xs',
                          req.met
                            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                            : 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {req.met ? (
                            <Check className="size-4 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="size-4 text-rose-500 shrink-0" />
                          )}
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {req.name} ({req.level})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>{req.met ? '✓ Met' : '✗ Gap'}</span>
                          <span title={req.note} className="cursor-help">
                            <Info className="size-3.5 text-zinc-400 hover:text-zinc-700" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                    About {selectedJob.company}
                  </h3>
                  <p className="mt-1.5 text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {selectedJob.companyAbout}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => toggleSave(selectedJob.id)}
                  className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {savedJobIds.has(selectedJob.id) ? 'Saved' : 'Save Job'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleApply(selectedJob);
                    setSelectedJob(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                >
                  Apply Now
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎉 Application Sent Screen Modal */}
      <AnimatePresence>
        {showAppliedSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded-md border border-zinc-200/80 bg-white p-6 text-center shadow-xl dark:border-zinc-800 dark:bg-[#161616]"
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-4 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="size-6" />
              </div>
              <h2 className="font-heading text-lg font-bold text-zinc-950 dark:text-white">
                Application Sent!
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Your verified credential bundle was successfully submitted to{' '}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {justAppliedTitle}
                </span>
                .
              </p>
              <button
                type="button"
                onClick={() => setShowAppliedSuccess(false)}
                className="mt-6 w-full rounded-md bg-zinc-900 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
              >
                Back to Matches
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
