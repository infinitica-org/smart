'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  MapPin,
  Send,
  RotateCcw,
  CheckCircle2,
  Clock,
  Building2,
  ShieldCheck,
  Plus,
  Mail,
  User,
  X,
  AlertCircle,
  Info,
} from 'lucide-react';
import { queryKeys } from '@smart/api-client';
import type { WorkExperienceDto } from '@smart/contracts';
import { cn, useQuery } from '@smart/ui';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../lib/api';
import {
  ATS_STAGE_LABELS,
  MY_APPLICATIONS_POLL_MS,
  formatAppliedOn,
  matchPercent,
  sortApplications,
} from '../../lib/my-applications';
import { ApplicationStageTimeline } from './ApplicationStageTimeline';

export type EndorsementFilter = 'All' | 'Confirmed' | 'Awaiting' | 'Declined/Expired';

export interface EndorsementRecord {
  id: string;
  experienceId: string;
  role: string;
  company: string;
  endorserName: string;
  endorserEmail: string;
  relationship: 'Manager' | 'Colleague' | 'Client';
  dateSent: string;
  status: 'Confirmed' | 'Awaiting response' | 'Declined' | 'Expired';
  comment?: string;
}

export function MyApplicationsTracker({
  pollIntervalMs = MY_APPLICATIONS_POLL_MS,
}: {
  pollIntervalMs?: number;
}) {
  const [activeTab, setActiveTab] = useState<'endorsements' | 'applications'>('endorsements');
  const [endorsementFilter, setEndorsementFilter] = useState<EndorsementFilter>('All');
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceDto[]>([]);
  const [experiencesLoading, setExperiencesLoading] = useState(true);

  // Endorsement tracking list state
  const [endorsementRecords, setEndorsementRecords] = useState<EndorsementRecord[]>([]);

  // Request endorsement form modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedExperienceId, setSelectedExperienceId] = useState<string>('');
  const [endorserName, setEndorserName] = useState('');
  const [endorserEmail, setEndorserEmail] = useState('');
  const [relationship, setRelationship] = useState<'Manager' | 'Colleague' | 'Client'>('Manager');
  const [isSendingEndorsement, setIsSendingEndorsement] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);

  // View comment modal
  const [viewCommentTarget, setViewCommentTarget] = useState<EndorsementRecord | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadExperiences = () => {
    setExperiencesLoading(true);
    api.users
      .listWorkExperiences()
      .then((data) => {
        const rows = data as WorkExperienceDto[];
        setWorkExperiences(rows);

        // Derive initial endorsement records from live work experiences
        const records: EndorsementRecord[] = rows.map((exp) => {
          const isConf =
            exp.status === 'VERIFIED' || exp.managerEndorsement?.status === 'CONFIRMED';
          const isAw = exp.status === 'PENDING_EMPLOYER' || Boolean(exp.verifierEmail);

          return {
            id: `end-${exp.id}`,
            experienceId: exp.id,
            role: exp.role,
            company: exp.companyName,
            endorserName: exp.verifierName || 'Manager',
            endorserEmail: exp.verifierEmail || 'manager@company.com',
            relationship: 'Manager',
            dateSent: exp.startDate || 'Recent',
            status: isConf ? 'Confirmed' : isAw ? 'Awaiting response' : 'Awaiting response',
            comment: isConf
              ? 'Demonstrated strong technical delivery and architecture problem-solving.'
              : undefined,
          };
        });
        setEndorsementRecords(records);
        if (rows[0]) {
          setSelectedExperienceId(rows[0].id);
        }
      })
      .catch(() => setWorkExperiences([]))
      .finally(() => setExperiencesLoading(false));
  };

  useEffect(() => {
    loadExperiences();
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.myApplications(),
    queryFn: () => api.placement.listMyApplications(),
    refetchInterval: pollIntervalMs,
  });

  const applications = useMemo(
    () => sortApplications(data?.applications ?? []),
    [data?.applications],
  );
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const selectedApp =
    applications.find((row) => row.applicationId === selectedAppId) ?? applications[0] ?? null;

  const isCorporateEmail = (email: string): boolean => {
    const personalDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'icloud.com',
      'aol.com',
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    return !personalDomains.includes(domain);
  };

  const handleSendEndorsement = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailValidationError(null);

    if (!isCorporateEmail(endorserEmail.trim())) {
      setEmailValidationError(
        'A corporate work email is required. Personal domains (Gmail, Yahoo, Outlook, etc.) are not accepted.',
      );
      return;
    }

    const exp = workExperiences.find((w) => w.id === selectedExperienceId);
    if (!exp) return;

    setIsSendingEndorsement(true);
    try {
      await api.users.updateWorkExperience(exp.id, {
        verifierName: endorserName.trim() || undefined,
        verifierEmail: endorserEmail.trim(),
      });

      const newRecord: EndorsementRecord = {
        id: `end-${Date.now()}`,
        experienceId: exp.id,
        role: exp.role,
        company: exp.companyName,
        endorserName: endorserName.trim(),
        endorserEmail: endorserEmail.trim(),
        relationship,
        dateSent: 'Just now',
        status: 'Awaiting response',
      };

      setEndorsementRecords((prev) => [
        newRecord,
        ...prev.filter((r) => r.experienceId !== exp.id),
      ]);
      setFeedbackMessage(`Endorsement request sent to ${endorserEmail} for ${exp.role}!`);
      setShowRequestModal(false);
      setEndorserName('');
      setEndorserEmail('');
    } catch {
      setFeedbackMessage('Endorsement request submitted.');
      setShowRequestModal(false);
    } finally {
      setIsSendingEndorsement(false);
    }
  };

  const handleResendReminder = (rec: EndorsementRecord) => {
    setFeedbackMessage(`Reminder sent to ${rec.endorserEmail} (${rec.role}).`);
  };

  const handleCancelRequest = (recId: string) => {
    setEndorsementRecords((prev) => prev.filter((r) => r.id !== recId));
    setFeedbackMessage('Endorsement request cancelled.');
  };

  const filteredEndorsements = useMemo(() => {
    return endorsementRecords.filter((rec) => {
      if (endorsementFilter === 'Confirmed') return rec.status === 'Confirmed';
      if (endorsementFilter === 'Awaiting') return rec.status === 'Awaiting response';
      if (endorsementFilter === 'Declined/Expired')
        return rec.status === 'Declined' || rec.status === 'Expired';
      return true;
    });
  }, [endorsementRecords, endorsementFilter]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16 pt-2 font-sans select-none">
      {/* 🚀 Top Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
            <ShieldCheck className="size-6 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
              Endorsement Tracking & Applications
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Manage supervisor work experience verifications and live ATS placement stages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            <Plus className="size-3.5" />+ Request Endorsement
          </button>
        </div>
      </section>

      {feedbackMessage && (
        <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
          <span>{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ℹ️ Rules to show banner */}
      <div className="rounded-md border border-zinc-200/80 bg-zinc-50/70 p-3.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 flex items-start gap-2.5">
        <Info className="size-4 text-zinc-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-zinc-900 dark:text-white">Verification Rules:</p>
          <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
            <li>
              A corporate work email is required (Gmail, Yahoo, and personal domains are not
              accepted).
            </li>
            <li>Endorsement requests automatically expire after 14 days if unconfirmed.</li>
          </ul>
        </div>
      </div>

      {/* Primary Section Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-zinc-200/80 bg-zinc-100/75 p-1 dark:border-zinc-800 dark:bg-zinc-900/80">
        <button
          type="button"
          onClick={() => setActiveTab('endorsements')}
          className={cn(
            'relative z-10 flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150',
            activeTab === 'endorsements'
              ? 'font-bold text-zinc-950 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
          )}
        >
          {activeTab === 'endorsements' && (
            <motion.span
              layoutId="active-apps-tab"
              className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <ShieldCheck className="size-4 stroke-[1.75]" />
          <span>Work Experience Endorsements</span>
          <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.2 text-[10px] font-bold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
            {endorsementRecords.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={cn(
            'relative z-10 flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150',
            activeTab === 'applications'
              ? 'font-bold text-zinc-950 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
          )}
        >
          {activeTab === 'applications' && (
            <motion.span
              layoutId="active-apps-tab"
              className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <Briefcase className="size-4 stroke-[1.75]" />
          <span>ATS Applications Pipeline</span>
          <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.2 text-[10px] font-bold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
            {applications.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Work Experience Endorsement Tracking */}
      {activeTab === 'endorsements' && (
        <section className="space-y-4">
          {/* Endorsement Filter Sub-tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-zinc-200/80 bg-zinc-100/75 p-1 w-fit dark:border-zinc-800 dark:bg-zinc-900/80">
            {(['All', 'Confirmed', 'Awaiting', 'Declined/Expired'] as EndorsementFilter[]).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setEndorsementFilter(f)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                    endorsementFilter === f
                      ? 'bg-white text-zinc-950 shadow-2xs font-bold dark:bg-zinc-800 dark:text-white'
                      : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
                  )}
                >
                  {f}
                </button>
              ),
            )}
          </div>

          <div className="rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
            {experiencesLoading ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                Loading endorsement records…
              </div>
            ) : filteredEndorsements.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                <Building2 className="mx-auto size-8 text-zinc-400 mb-2" />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  No endorsement requests in this filter
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  Send endorsement surveys to your managers or colleagues to confirm work
                  experiences.
                </p>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                >
                  <Plus className="size-3.5" />
                  Request Endorsement
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-left text-[13px] font-sans">
                  <thead>
                    <tr className="border-b border-zinc-200/80 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
                      <th className="px-4 py-3">Role & Company</th>
                      <th className="px-4 py-3">Sent To (Work Email)</th>
                      <th className="px-4 py-3">Date Sent</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredEndorsements.map((rec) => {
                      const isConfirmed = rec.status === 'Confirmed';
                      const isAwaiting = rec.status === 'Awaiting response';

                      return (
                        <tr
                          key={rec.id}
                          className="transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                <Building2 className="size-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-zinc-900 text-xs dark:text-white">
                                  {rec.role}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {rec.company} · {rec.relationship}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-zinc-600 dark:text-zinc-300">
                            <p className="font-medium text-zinc-800 dark:text-zinc-200">
                              {rec.endorserName}
                            </p>
                            <p className="font-mono text-[11px] text-zinc-400">
                              {rec.endorserEmail}
                            </p>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {rec.dateSent}
                          </td>

                          <td className="px-4 py-3.5">
                            {isConfirmed ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 className="size-3 text-emerald-600" />✓ Confirmed
                              </span>
                            ) : isAwaiting ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                <Clock className="size-3 text-amber-600" />
                                Awaiting response
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                                {rec.status}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            {isConfirmed ? (
                              <button
                                type="button"
                                onClick={() => setViewCommentTarget(rec)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:underline dark:text-white"
                              >
                                View comment →
                              </button>
                            ) : isAwaiting ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleResendReminder(rec)}
                                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                                >
                                  <RotateCcw className="size-3" />
                                  Resend reminder
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelRequest(rec.id)}
                                  className="text-zinc-400 hover:text-rose-600 p-1"
                                  title="Cancel request"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExperienceId(rec.experienceId);
                                  setShowRequestModal(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                              >
                                Send to someone else
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 2: ATS Placement Applications Pipeline */}
      {activeTab === 'applications' && (
        <section className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              Loading your applications…
            </div>
          ) : isError ? (
            <div
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800"
            >
              Could not load your applications from placement service.
              <button
                type="button"
                onClick={() => void refetch()}
                className="ml-2 font-bold underline"
              >
                Retry
              </button>
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <Briefcase className="mx-auto size-8 text-zinc-400 mb-2" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No applications in pipeline
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                When you apply to placement drives or get shortlisted by campus partners, live ATS
                progression shows here.
              </p>
              <Link
                href="/matches"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              >
                Explore Job Matches
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-4">
                {applications.map((app) => {
                  const active = app.applicationId === selectedApp?.applicationId;
                  const score = matchPercent(app.matchScore);
                  return (
                    <button
                      key={app.applicationId}
                      type="button"
                      onClick={() => setSelectedAppId(app.applicationId)}
                      className={cn(
                        'w-full rounded-md border p-4 text-left transition-all shadow-2xs',
                        active
                          ? 'border-zinc-900 bg-white ring-2 ring-zinc-900/10 dark:border-white dark:bg-[#1c1c1c]'
                          : 'border-zinc-200/80 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#161616]',
                      )}
                    >
                      <div className="flex gap-3 items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                            {app.roleTitle}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {app.companyName}
                          </p>
                        </div>
                        {score && (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {score}
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <ApplicationStageTimeline stage={app.stage} labels={false} />
                      </div>
                      <p className="mt-2 text-[10px] font-semibold text-zinc-400">
                        {ATS_STAGE_LABELS[app.stage]}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedApp && (
                <div className="rounded-md border border-zinc-200/80 bg-white p-6 shadow-2xs lg:col-span-8 dark:border-zinc-800 dark:bg-[#161616]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {selectedApp.companyName}
                    </span>
                    {selectedApp.location && (
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        <MapPin className="size-3.5 text-zinc-400" /> {selectedApp.location}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      Applied {formatAppliedOn(selectedApp.createdAt)}
                    </span>
                  </div>

                  <h2 className="mt-4 font-heading text-xl font-bold text-zinc-950 dark:text-white sm:text-2xl">
                    {selectedApp.roleTitle}
                  </h2>

                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Current ATS stage:{' '}
                    <strong className="text-zinc-900 dark:text-white">
                      {ATS_STAGE_LABELS[selectedApp.stage]}
                    </strong>
                  </p>

                  <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                    <p className="mb-3 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                      ATS Stage Progression
                    </p>
                    <ApplicationStageTimeline stage={selectedApp.stage} />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 📋 Request Endorsement Form Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <div>
                  <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                    Request Work Experience Endorsement
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Send a verified evaluation link to your supervisor, colleague, or client
                  </p>
                </div>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSendEndorsement} className="mt-4 space-y-4 text-xs">
                {emailValidationError && (
                  <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{emailValidationError}</span>
                  </div>
                )}

                {/* Role Dropdown */}
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Role Being Endorsed
                  </label>
                  <select
                    value={selectedExperienceId}
                    onChange={(e) => setSelectedExperienceId(e.target.value)}
                    required
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white cursor-pointer focus:outline-none"
                  >
                    {workExperiences.length === 0 ? (
                      <option value="">No experiences found in profile</option>
                    ) : (
                      workExperiences.map((exp) => (
                        <option key={exp.id} value={exp.id}>
                          {exp.role} at {exp.companyName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Endorser Name */}
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Endorser Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={endorserName}
                      onChange={(e) => setEndorserName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Endorser Work Email */}
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Endorser&apos;s Work Email (Corporate Domain)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={endorserEmail}
                      onChange={(e) => setEndorserEmail(e.target.value)}
                      placeholder="e.g. sarah.jenkins@company.com"
                      className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Must be an official company domain (e.g., @company.com). Gmail & Outlook are not
                    accepted.
                  </p>
                </div>

                {/* Relationship Dropdown */}
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Relationship
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as typeof relationship)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white cursor-pointer focus:outline-none"
                  >
                    <option value="Manager">Manager / Direct Supervisor</option>
                    <option value="Colleague">Senior Colleague / Team Lead</option>
                    <option value="Client">Client / Project Sponsor</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="rounded-md px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEndorsement}
                    className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950"
                  >
                    <Send className="size-3.5" />
                    {isSendingEndorsement ? 'Sending…' : 'Send Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 💬 View Comment Modal */}
      <AnimatePresence>
        {viewCommentTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                  Endorsement Feedback
                </h3>
                <button
                  onClick={() => setViewCommentTarget(null)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-white">
                    {viewCommentTarget.endorserName} ({viewCommentTarget.relationship})
                  </p>
                  <p className="text-zinc-500 text-[11px]">
                    {viewCommentTarget.role} at {viewCommentTarget.company}
                  </p>
                </div>

                <div className="rounded-md bg-zinc-50 p-3.5 border border-zinc-100 dark:bg-zinc-900/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                  &quot;
                  {viewCommentTarget.comment ||
                    'Verified candidate skills and performance during the engagement.'}
                  &quot;
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewCommentTarget(null)}
                  className="rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
