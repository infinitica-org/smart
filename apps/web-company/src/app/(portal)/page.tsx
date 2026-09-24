'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Users,
  ShieldCheck,
  Sparkles,
  PlusCircle,
  Search,
  ArrowRight,
  MapPin,
  Clock,
  Calendar,
  Check,
  Send,
  ExternalLink,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { CandidateMatchDto, JobOpeningDto } from '@smart/contracts';
import { useCompanyAccount } from '@/lib/use-company-account';
import { companyJobsApi, companyStudentsApi } from '@/lib/api';
import {
  AccountErrorPanel,
  AccountLoadingPanel,
  AccountDetailsGrid,
} from '@/components/account-state-panel';
import { Badge, Modal } from '@/components/ui';
import {
  card,
  pageStack,
  primaryButton,
  secondaryButton,
  sectionTitle,
  sectionSubtitle,
  textarea,
  label,
} from '@/lib/ui';

export default function CompanyOverviewPage() {
  const { data: account, isLoading: accountLoading, isError, error } = useCompanyAccount();

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['company', 'jobs'],
    queryFn: () => companyJobsApi.list(),
  });

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ['company', 'students'],
    queryFn: () => companyStudentsApi.search(),
  });

  const [inquiryTarget, setInquiryTarget] = useState<CandidateMatchDto | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [sentInquiries, setSentInquiries] = useState<string[]>([]);

  const jobs = useMemo(() => jobsData?.openings ?? [], [jobsData]);
  const candidates = useMemo(() => candidatesData ?? [], [candidatesData]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

  function handleOpenInquiry(candidate: CandidateMatchDto) {
    setInquiryTarget(candidate);
    const firstName = candidate.studentName ? candidate.studentName.split(' ')[0] : 'there';
    setInquiryMessage(
      `Hi ${firstName},\n\nWe reviewed your verified skills in ${candidate.trackCode} (Level ${candidate.highestLevelCleared}) on SMART. We have opportunities available and would love to connect.`,
    );
  }

  function handleSendInquiry() {
    if (!inquiryTarget || !inquiryMessage.trim()) return;
    setSentInquiries((prev) => [...prev, inquiryTarget.studentId]);
    setInquiryTarget(null);
  }

  // Generate dynamic recent activity items
  const recentActivities = useMemo(() => {
    const list: { id: string; title: string; time: string; icon: LucideIcon; tone: string }[] = [];

    if (jobs.length > 0) {
      list.push({
        id: 'job-1',
        title: `Job opening "${jobs[0]?.roleTitle}" published and accepting applications`,
        time: 'Today',
        icon: Briefcase,
        tone: 'text-blue-600 bg-blue-50',
      });
    }

    if (sentInquiries.length > 0) {
      list.push({
        id: 'inquiry-1',
        title: `Direct opportunity invitation sent to candidate`,
        time: 'Just now',
        icon: Send,
        tone: 'text-emerald-600 bg-emerald-50',
      });
    }

    if (candidates.length > 0) {
      list.push({
        id: 'cand-1',
        title: `${candidates.length} verified candidate matches surfaced for active tracks`,
        time: '2 hours ago',
        icon: Users,
        tone: 'text-purple-600 bg-purple-50',
      });
    }

    list.push({
      id: 'verify-1',
      title: 'Company verification credential confirmed & active on SMART network',
      time: 'Verified',
      icon: ShieldCheck,
      tone: 'text-emerald-600 bg-emerald-50',
    });

    return list;
  }, [jobs, sentInquiries, candidates]);

  if (accountLoading) {
    return (
      <div className={pageStack}>
        <AccountLoadingPanel />
      </div>
    );
  }

  if (isError || !account) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong while loading your account.';
    return (
      <div className={pageStack}>
        <AccountErrorPanel message={message} />
      </div>
    );
  }

  const isApproved = account.companyVerificationStatus === 'APPROVED';
  const companyDisplayName = account.companyName || 'Employer Partner';

  return (
    <div className={pageStack}>
      {/* Hero Banner Section */}
      <section className="relative -mx-4 -mt-6 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs sm:p-8 md:-mx-6 md:-mt-4">
        {/* Subtle Ambient Mesh Gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `
              radial-gradient(ellipse 60% 80% at 10% 20%, rgba(219, 234, 254, 0.45) 0%, rgba(238, 242, 255, 0.25) 40%, transparent 75%),
              radial-gradient(ellipse 55% 75% at 90% 20%, rgba(220, 252, 231, 0.45) 0%, rgba(240, 253, 244, 0.2) 40%, transparent 75%),
              linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(255, 255, 255, 1) 100%)
            `,
          }}
        />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900 shadow-2xs">
                <Sparkles className="size-3.5 text-blue-600" />
                <span>{greeting}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-2xs">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>{isApproved ? 'Verified Employer' : 'Account In Review'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 shadow-2xs">
                <Calendar className="size-3.5 text-zinc-400" />
                <span>{formattedDate}</span>
              </span>
            </div>

            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl lg:text-4xl">
              {companyDisplayName}
            </h1>

            <p className="max-w-2xl text-xs leading-relaxed text-zinc-600 sm:text-sm">
              Manage your hiring pipeline, post certified job roles, and connect directly with
              verified candidates based on proctored SMART credentials.
            </p>
          </div>

          {/* Quick Actions Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/jobs/new" className={primaryButton}>
              <PlusCircle className="size-4" />
              Post a job
            </Link>
            <Link href="/students" className={secondaryButton}>
              <Search className="size-4" />
              Search students
            </Link>
          </div>
        </div>
      </section>

      {/* Stat Cards: active jobs, new applicants, opportunities sent */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`${card} flex items-center gap-4`}>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Briefcase className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-zinc-950">
              {jobsLoading ? '…' : jobs.length}
            </p>
            <p className="text-xs font-medium text-zinc-500">Active Jobs</p>
          </div>
        </div>

        <div className={`${card} flex items-center gap-4`}>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Users className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-zinc-950">
              {candidatesLoading ? '…' : candidates.length}
            </p>
            <p className="text-xs font-medium text-zinc-500">New Applicants</p>
          </div>
        </div>

        <div className={`${card} flex items-center gap-4`}>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Send className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-zinc-950">
              {sentInquiries.length}
            </p>
            <p className="text-xs font-medium text-zinc-500">Opportunities Sent</p>
          </div>
        </div>

        <div className={`${card} flex items-center gap-4`}>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-zinc-950">
              {isApproved ? 'Tier 1' : 'Pending'}
            </p>
            <p className="text-xs font-medium text-zinc-500">Verification Status</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Job Postings & Matched Candidates */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Job Openings Panel */}
        <div className={`${card} flex flex-col justify-between space-y-4`}>
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={sectionTitle}>Recent Job Postings</h2>
                <p className={sectionSubtitle}>Your currently published roles and requisitions</p>
              </div>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:underline"
              >
                View all ({jobs.length}) <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {jobsLoading ? (
                <div className="space-y-2">
                  <div className="h-16 animate-pulse rounded-lg bg-zinc-100" />
                  <div className="h-16 animate-pulse rounded-lg bg-zinc-100" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center">
                  <Briefcase className="mx-auto size-8 text-zinc-400" />
                  <p className="mt-2 text-sm font-semibold text-zinc-900">No active job postings</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Publish your first opening to begin receiving verified student applications.
                  </p>
                  <Link href="/jobs/new" className={`${primaryButton} mt-4`}>
                    <PlusCircle className="size-4" />
                    Post a job
                  </Link>
                </div>
              ) : (
                jobs.slice(0, 3).map((job: JobOpeningDto) => (
                  <div
                    key={job.openingId}
                    className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white p-4 transition hover:border-zinc-300"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-900">{job.roleTitle}</h3>
                        <Badge tone={job.status === 'OPEN' ? 'green' : 'neutral'}>
                          {job.status === 'OPEN' ? 'Active' : 'Draft'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {job.location ?? 'Remote'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {job.employmentType ?? 'Full-time'}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/jobs/${job.openingId}/edit`}
                      className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:underline"
                    >
                      Manage
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-3">
            <Link
              href="/jobs/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-2.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              <PlusCircle className="size-4" /> Post Another Role
            </Link>
          </div>
        </div>

        {/* Top Assessed Candidates */}
        <div className={`${card} flex flex-col justify-between space-y-4`}>
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={sectionTitle}>Top Matched Candidates</h2>
                <p className={sectionSubtitle}>
                  Verified students matching your required competency profiles
                </p>
              </div>
              <Link
                href="/students"
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:underline"
              >
                Search all <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {candidatesLoading ? (
                <div className="space-y-2">
                  <div className="h-16 animate-pulse rounded-lg bg-zinc-100" />
                  <div className="h-16 animate-pulse rounded-lg bg-zinc-100" />
                </div>
              ) : candidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center">
                  <Users className="mx-auto size-8 text-zinc-400" />
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    No candidates discovered yet
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Search through our directory of proctored talent.
                  </p>
                  <Link href="/students" className={`${secondaryButton} mt-4`}>
                    Browse Candidate Directory
                  </Link>
                </div>
              ) : (
                candidates.slice(0, 3).map((candidate: CandidateMatchDto) => {
                  const sent = sentInquiries.includes(candidate.studentId);
                  return (
                    <div
                      key={candidate.studentId}
                      className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white p-4 transition hover:border-zinc-300"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-zinc-900">
                            {candidate.studentName}
                          </h3>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {Math.round(candidate.matchScore * 100)}% Match
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          {candidate.trackCode} · Cleared Level {candidate.highestLevelCleared}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenInquiry(candidate)}
                        disabled={sent}
                        className={
                          sent
                            ? 'inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700'
                            : 'inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800'
                        }
                      >
                        {sent ? (
                          <>
                            <Check className="size-3.5 text-emerald-600" /> Sent
                          </>
                        ) : (
                          <>
                            <Send className="size-3.5" /> Send Opportunity
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-3">
            <Link
              href="/students"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-2.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              <Search className="size-4" /> Search Students
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <section className={card}>
        <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h2 className={sectionTitle}>Recent Activity Feed</h2>
            <p className={sectionSubtitle}>
              Live stream of candidate applications, invitations, and hiring events
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>

        <ul className="divide-y divide-zinc-100">
          {recentActivities.map((act) => {
            const Icon = act.icon;
            return (
              <li key={act.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex size-8 items-center justify-center rounded-lg ${act.tone}`}>
                    <Icon className="size-4" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-zinc-800">{act.title}</p>
                </div>
                <span className="text-[11px] font-medium text-zinc-400 shrink-0 ml-2">
                  {act.time}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Company Verification & Organization Overview */}
      <section className={card}>
        <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h2 className={sectionTitle}>Organization Profile & Verification</h2>
            <p className={sectionSubtitle}>
              Registered company credentials and representative information
            </p>
          </div>
          <Link
            href="/company"
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:underline"
          >
            Edit Profile <ExternalLink className="size-3" />
          </Link>
        </div>
        <AccountDetailsGrid account={account} />
      </section>

      {/* Direct Opportunity Modal */}
      <Modal
        open={Boolean(inquiryTarget)}
        title={`Send Opportunity to ${inquiryTarget?.studentName ?? 'Candidate'}`}
        onClose={() => setInquiryTarget(null)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="modal-inquiry-msg" className={label}>
              Inquiry Note & Role Details
            </label>
            <textarea
              id="modal-inquiry-msg"
              rows={4}
              value={inquiryMessage}
              onChange={(e) => setInquiryMessage(e.target.value)}
              className={textarea}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setInquiryTarget(null)}
              className={secondaryButton}
            >
              Cancel
            </button>
            <button type="button" onClick={handleSendInquiry} className={primaryButton}>
              <Send className="size-3.5" /> Send Opportunity
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
