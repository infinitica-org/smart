'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Search,
  Check,
  X,
  ShieldCheck,
  MessageSquare,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { cn } from '@smart/ui';
import { motion, AnimatePresence } from 'motion/react';
import { useProfileProgress } from '@/lib/use-profile-progress';
import { skillNameForCode } from '@/lib/skill-declarations';

export interface OpportunityItem {
  id: string;
  company: string;
  logoText: string;
  role: string;
  location: string;
  salary: string;
  matchScore: number;
  whyPicked: string;
  recruiterMessagePreview: string;
  recruiterName: string;
  dateReceived: string;
  status: 'NEW' | 'ACCEPTED' | 'DECLINED';
  declineReason?: string;
  hideSimilar?: boolean;
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const { skillClaims } = useProfileProgress();
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'NEW' | 'ACCEPTED' | 'DECLINED'>('NEW');
  const [searchQuery, setSearchQuery] = useState('');

  // Decline modal state
  const [declineTarget, setDeclineTarget] = useState<OpportunityItem | null>(null);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState<string>('Not interested');
  const [dontShowSimilar, setDontShowSimilar] = useState<boolean>(false);

  // Detail Modal State
  const [viewDetailTarget, setViewDetailTarget] = useState<OpportunityItem | null>(null);

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      // Map verified database skill claims to active reach-out opportunities
      if (skillClaims.length > 0) {
        const verifiedClaims = skillClaims.filter((c) => c.status === 'VERIFIED');
        const items: OpportunityItem[] = verifiedClaims.map((claim) => {
          const name = skillNameForCode(claim.skillCode);
          return {
            id: `opp-${claim.claimId}`,
            company: 'Campus Partner Placement Unit',
            logoText: name.slice(0, 2).toUpperCase(),
            role: `${name} Engineer Specialist`,
            location: 'Bangalore / Hybrid',
            salary: '₹15 - 22 LPA',
            matchScore: 94,
            whyPicked: `Shortlisted based on your verified ${name} skill claim and evaluated code defense.`,
            recruiterMessagePreview: `Hi! Your verified ${name} credentials caught our attention. We invite you to interview for our enterprise engineering team.`,
            recruiterName: 'Campus Hiring Team',
            dateReceived: 'Active',
            status: 'NEW',
          };
        });
        setOpportunities(items);
      } else {
        setOpportunities([]);
      }
    } catch {
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [skillClaims]);

  const handleAccept = (opp: OpportunityItem) => {
    setOpportunities((prev) =>
      prev.map((item) => (item.id === opp.id ? { ...item, status: 'ACCEPTED' } : item)),
    );
    router.push(
      `/messages?recipient=${encodeURIComponent(opp.company)}&role=${encodeURIComponent(opp.role)}`,
    );
  };

  const handleConfirmDecline = () => {
    if (!declineTarget) return;
    setOpportunities((prev) =>
      prev.map((item) =>
        item.id === declineTarget.id
          ? {
              ...item,
              status: 'DECLINED',
              declineReason: selectedDeclineReason,
              hideSimilar: dontShowSimilar,
            }
          : item,
      ),
    );
    setDeclineTarget(null);
  };

  const currentList = opportunities.filter((o) => o.status === activeTab);
  const filteredList = currentList.filter(
    (o) =>
      o.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.whyPicked.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const newCount = opportunities.filter((o) => o.status === 'NEW').length;
  const acceptedCount = opportunities.filter((o) => o.status === 'ACCEPTED').length;
  const declinedCount = opportunities.filter((o) => o.status === 'DECLINED').length;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16 pt-2 font-sans select-none">
      {/* 🚀 Top Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
            <Sparkles className="size-6 stroke-[1.75] text-amber-500" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
              Opportunities Inbox
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Direct employer reach-outs and shortlist invitations sent to you based on your
              verified credentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <ShieldCheck className="size-3.5" />
            Verified Profile Active
          </span>
        </div>
      </section>

      {/* 🧭 Top Bar: Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-zinc-200/80 bg-zinc-100/75 p-1 dark:border-zinc-800 dark:bg-zinc-900/80">
          {[
            { key: 'NEW', label: 'New', count: newCount },
            { key: 'ACCEPTED', label: 'Accepted', count: acceptedCount },
            { key: 'DECLINED', label: 'Declined', count: declinedCount },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                'relative z-10 flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150',
                activeTab === tab.key
                  ? 'font-bold text-zinc-950 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
              )}
            >
              {activeTab === tab.key && (
                <motion.span
                  layoutId="active-opportunity-tab"
                  className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span>{tab.label}</span>
              <span className="rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opportunities..."
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>

      {/* 📋 Opportunity List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            Loading opportunities from database…
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <Sparkles className="mx-auto size-8 text-zinc-400 mb-2" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No opportunities yet
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              Fully verified profiles get 3× more reach-outs. Verify more skills and defend projects
              to unlock employer invitations.
            </p>
            <Link
              href="/skills"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              <Plus className="size-3.5" />
              Verify Skills
            </Link>
          </div>
        ) : (
          filteredList.map((opp) => (
            <div
              key={opp.id}
              className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 font-bold text-xs text-zinc-800 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {opp.logoText}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                          {opp.role}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          {opp.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {opp.company} · {opp.location} · {opp.salary}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-600 shrink-0" />
                      Why you were picked:
                    </p>
                    <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                      {opp.whyPicked}
                    </p>
                  </div>

                  <div className="rounded-md border border-zinc-100 bg-zinc-50/80 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                    <p className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquare className="size-3.5 text-zinc-400" />
                      Message from {opp.recruiterName}:
                    </p>
                    <p className="mt-1 text-[11px] italic text-zinc-600 dark:text-zinc-400">
                      &quot;{opp.recruiterMessagePreview}&quot;
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span>Received: {opp.dateReceived}</span>
                    <button
                      type="button"
                      onClick={() => setViewDetailTarget(opp)}
                      className="font-semibold text-zinc-900 hover:underline dark:text-white flex items-center gap-1"
                    >
                      View job details
                      <ExternalLink className="size-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  {opp.status === 'ACCEPTED' ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <Check className="size-3.5" />
                        Accepted & Applied
                      </span>
                      <Link
                        href={`/messages?recipient=${encodeURIComponent(opp.company)}`}
                        className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 underline dark:text-zinc-400"
                      >
                        Open chat in Messages →
                      </Link>
                    </div>
                  ) : opp.status === 'DECLINED' ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-500">
                        Declined
                      </span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setDeclineTarget(opp)}
                        className="rounded-md border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccept(opp)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                      >
                        Accept & Apply
                        <ArrowRight className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🛑 Decline Modal */}
      <AnimatePresence>
        {declineTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]"
            >
              <h2 className="font-heading text-lg font-bold text-zinc-950 dark:text-white">
                Decline Opportunity?
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Let {declineTarget.company} know why you are declining the role of{' '}
                <span className="font-semibold">{declineTarget.role}</span>.
              </p>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Optional reason:</p>
                {['Not interested', 'Wrong location', 'Already placed'].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2.5 rounded-md border border-zinc-200 p-2.5 text-xs font-medium cursor-pointer hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <input
                      type="radio"
                      name="declineReason"
                      value={reason}
                      checked={selectedDeclineReason === reason}
                      onChange={(e) => setSelectedDeclineReason(e.target.value)}
                      className="accent-zinc-900"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dontShowSimilar}
                    onChange={(e) => setDontShowSimilar(e.target.checked)}
                    className="rounded-sm accent-zinc-900"
                  />
                  <span>Don&apos;t show similar roles</span>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDeclineTarget(null)}
                  className="rounded-md border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  className="rounded-md bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700"
                >
                  Confirm Decline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📄 Quick View Job Details Modal */}
      <AnimatePresence>
        {viewDetailTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]"
            >
              <button
                type="button"
                onClick={() => setViewDetailTarget(null)}
                className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="size-4" />
              </button>

              <h2 className="font-heading text-lg font-bold text-zinc-950 dark:text-white">
                {viewDetailTarget.role}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {viewDetailTarget.company} · {viewDetailTarget.location} · {viewDetailTarget.salary}
              </p>

              <div className="mt-4 space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="rounded-md bg-zinc-50 p-3 border border-zinc-100 dark:bg-zinc-900/60 dark:border-zinc-800">
                  <p className="font-bold text-zinc-900 dark:text-white">
                    Candidate Selection Match:
                  </p>
                  <p className="mt-1 text-[11px]">{viewDetailTarget.whyPicked}</p>
                </div>
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">Recruiter Note:</p>
                  <p className="mt-1 text-[11px]">{viewDetailTarget.recruiterMessagePreview}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setViewDetailTarget(null)}
                  className="rounded-md border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAccept(viewDetailTarget);
                    setViewDetailTarget(null);
                  }}
                  className="rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                >
                  Accept & Apply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
