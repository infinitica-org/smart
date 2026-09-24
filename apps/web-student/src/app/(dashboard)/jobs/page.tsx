'use client';

import { useState, useMemo } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  Search,
  Sparkles,
  MapPin,
  DollarSign,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@smart/ui';
import { motion } from 'motion/react';

interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Internship' | 'Remote';
  salary: string;
  matchScore: number;
  tags: string[];
  description: string;
  requirements: string[];
  shortlistReason?: string;
  deadline?: string;
}

const SAMPLE_JOBS: JobOpportunity[] = [
  {
    id: 'job-1',
    title: 'Junior Frontend Engineer',
    company: 'Regal Corp',
    location: 'Bangalore / Hybrid',
    type: 'Full-time',
    salary: '₹14 - 18 LPA',
    matchScore: 94,
    tags: ['React', 'TypeScript', 'TailwindCSS'],
    description:
      'Looking for high-readiness frontend engineers to build next-generation real-time collaboration dashboards.',
    requirements: [
      'Verified React claim at Intermediate+',
      'TypeScript proficiency',
      'Strong UI/UX fundamentals',
    ],
    shortlistReason:
      'Your verified React & TypeScript claims ranked in the top 5% of candidate batch.',
    deadline: 'In 3 days',
  },
  {
    id: 'job-2',
    title: 'Software Development Engineer - Backend',
    company: 'Bellstone Technologies',
    location: 'Hyderabad / Remote',
    type: 'Full-time',
    salary: '₹18 - 22 LPA',
    matchScore: 89,
    tags: ['Node.js', 'PostgreSQL', 'Docker'],
    description:
      'Design distributed microservices and event-driven data ingestion pipelines handling high volume telemetry.',
    requirements: [
      'Node.js backend verification',
      'SQL relational database modeling',
      'REST/gRPC services',
    ],
    shortlistReason:
      'Automated campus shortlist based on verified Backend skills and defense project score.',
    deadline: 'In 5 days',
  },
  {
    id: 'job-3',
    title: 'Full Stack Associate',
    company: 'Finova Cloud Systems',
    location: 'Pune / Onsite',
    type: 'Full-time',
    salary: '₹12 - 16 LPA',
    matchScore: 86,
    tags: ['React', 'Node.js', 'AWS'],
    description:
      'Join our fintech core engineering unit developing secure transaction routing systems and verified audit trails.',
    requirements: [
      'Full-stack readiness',
      'Basic cloud deployments',
      'Problem-solving certification',
    ],
    shortlistReason: 'Matches your preferred location and verified engineering profile.',
    deadline: 'In 7 days',
  },
  {
    id: 'job-4',
    title: 'AI/ML Research Intern',
    company: 'Cognitive Nexus',
    location: 'Remote',
    type: 'Internship',
    salary: '₹50,000 / month',
    matchScore: 78,
    tags: ['Python', 'PyTorch', 'LLMs'],
    description:
      'Assist our AI safety team with fine-tuning evaluation harnesses and prompt red-teaming frameworks.',
    requirements: ['Python proficiency', 'Deep learning fundamentals', 'Defended AI project'],
    deadline: 'In 2 weeks',
  },
  {
    id: 'job-5',
    title: 'Data Platform Engineer',
    company: 'AcroData Labs',
    location: 'Chennai / Hybrid',
    type: 'Full-time',
    salary: '₹15 - 20 LPA',
    matchScore: 72,
    tags: ['SQL', 'Python', 'Kafka'],
    description:
      'Build robust data transformations and analytics pipelines powering enterprise intelligence systems.',
    requirements: ['Advanced SQL', 'Python scripting', 'ETL pipelines'],
    deadline: 'In 10 days',
  },
];

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<'strong' | 'medium' | 'opportunities' | 'saved'>(
    'strong',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set(['job-1']));
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<JobOpportunity | null>(null);
  const [showAppliedModal, setShowAppliedModal] = useState(false);
  const [appliedJobTitle, setAppliedJobTitle] = useState('');

  const toggleSave = (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleApply = (job: JobOpportunity, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAppliedJobIds((prev) => new Set(prev).add(job.id));
    setAppliedJobTitle(`${job.title} at ${job.company}`);
    setShowAppliedModal(true);
  };

  const strongFitJobs = SAMPLE_JOBS.filter((j) => j.matchScore >= 85);
  const mediumFitJobs = SAMPLE_JOBS.filter((j) => j.matchScore < 85 && j.matchScore >= 60);
  const opportunityJobs = SAMPLE_JOBS.filter((j) => j.shortlistReason);
  const savedJobs = SAMPLE_JOBS.filter((j) => savedJobIds.has(j.id));

  const currentList = useMemo(() => {
    let list: JobOpportunity[] = [];
    if (activeTab === 'strong') list = strongFitJobs;
    else if (activeTab === 'medium') list = mediumFitJobs;
    else if (activeTab === 'opportunities') list = opportunityJobs;
    else if (activeTab === 'saved') list = savedJobs;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [activeTab, searchQuery, savedJobIds]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-12 pt-2 font-sans select-none">
      {/* 🚀 Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
            <Briefcase className="size-6 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
              Placement Matches & Opportunities
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Curated campus opportunities matched against your verified skills and defense
              readiness
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

      {/* Tabs and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-zinc-200/80 bg-zinc-100/75 p-1 dark:border-zinc-800 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={() => setActiveTab('strong')}
            className={cn(
              'relative z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
              activeTab === 'strong'
                ? 'font-bold text-zinc-950 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
            )}
          >
            {activeTab === 'strong' && (
              <motion.span
                layoutId="active-jobs-tab"
                className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span>Strong fit</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {strongFitJobs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('medium')}
            className={cn(
              'relative z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
              activeTab === 'medium'
                ? 'font-bold text-zinc-950 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
            )}
          >
            {activeTab === 'medium' && (
              <motion.span
                layoutId="active-jobs-tab"
                className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span>Medium fit</span>
            <span className="rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {mediumFitJobs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('opportunities')}
            className={cn(
              'relative z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
              activeTab === 'opportunities'
                ? 'font-bold text-zinc-950 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
            )}
          >
            {activeTab === 'opportunities' && (
              <motion.span
                layoutId="active-jobs-tab"
                className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <Sparkles className="size-3 text-amber-500" />
            <span>Opportunities Inbox</span>
            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {opportunityJobs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={cn(
              'relative z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
              activeTab === 'saved'
                ? 'font-bold text-zinc-950 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
            )}
          >
            {activeTab === 'saved' && (
              <motion.span
                layoutId="active-jobs-tab"
                className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <Bookmark className="size-3 text-zinc-400" />
            <span>Saved jobs</span>
            <span className="rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {savedJobs.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or skills..."
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>

      {/* Main Jobs Grid & Detail Modal/Split */}
      <div className="grid gap-4">
        {currentList.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <Briefcase className="mx-auto size-8 text-zinc-400 mb-2" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No jobs in this category
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Verify additional skills in your profile to expand your automated job match portfolio.
            </p>
          </div>
        ) : (
          currentList.map((job) => {
            const isSaved = savedJobIds.has(job.id);
            const isApplied = appliedJobIds.has(job.id);

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="group relative flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-[#161616] cursor-pointer"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        <Building2 className="size-4.5" />
                      </div>
                      <div>
                        <h3 className="font-heading text-base font-bold tracking-tight text-zinc-950 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400 transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {job.company} · <span className="text-zinc-400">{job.location}</span>
                        </p>
                      </div>
                    </div>

                    {activeTab === 'opportunities' && job.shortlistReason && (
                      <div className="mt-2 rounded-md border border-amber-200/80 bg-amber-50/80 p-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        <p className="font-semibold flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-amber-600" />
                          Shortlist Invitation Reason:
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          {job.shortlistReason}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-zinc-600 line-clamp-2 dark:text-zinc-300 pt-1">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {job.salary}
                      </span>
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right Action Block */}
                  <div className="flex flex-row sm:flex-col items-end justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {job.matchScore}% Match
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleSave(job.id, e)}
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                        title={isSaved ? 'Remove from saved' : 'Save job'}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="size-4 text-zinc-900 dark:text-white" />
                        ) : (
                          <Bookmark className="size-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {isApplied ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                          <Check className="size-3.5" />
                          Applied
                        </span>
                      ) : activeTab === 'opportunities' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              /* decline */
                            }}
                            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleApply(job, e)}
                            className="rounded-md bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                          >
                            Accept & Apply
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleApply(job, e)}
                          className="rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 📋 Job Detail Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[min(90vh,680px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#161616]">
            <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-zinc-950 dark:text-white">
                    {selectedJob.title}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedJob.company} · {selectedJob.location}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 font-semibold text-zinc-900 dark:text-white">
                  <DollarSign className="size-3.5 text-zinc-500" />
                  {selectedJob.salary}
                </span>
                <span className="inline-flex items-center gap-1 text-zinc-500">
                  <MapPin className="size-3.5" />
                  {selectedJob.location}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {selectedJob.matchScore}% Match Score
                </span>
              </div>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <h4 className="font-bold text-zinc-900 dark:text-white mb-1">Role Description</h4>
                <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {selectedJob.description}
                </p>
              </div>

              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <h4 className="font-bold text-zinc-900 dark:text-white mb-2">
                  Required Skills & Verification Criteria
                </h4>
                <ul className="space-y-1.5">
                  {selectedJob.requirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
              <button
                type="button"
                onClick={(e) => toggleSave(selectedJob.id, e)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {savedJobIds.has(selectedJob.id) ? (
                  <>
                    <BookmarkCheck className="size-4 text-zinc-900 dark:text-white" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="size-4" />
                    Save Job
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="rounded-md px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    handleApply(selectedJob, e);
                    setSelectedJob(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                >
                  Apply with Verified Credential
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 Application Submitted Toast/Modal */}
      {showAppliedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-2xl dark:border-zinc-800 dark:bg-[#161616]">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 dark:bg-emerald-950 dark:text-emerald-400">
              <Check className="size-6" strokeWidth={3} />
            </div>
            <h3 className="font-heading text-lg font-bold text-zinc-950 dark:text-white">
              Application Submitted!
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Your verified candidate readiness portfolio was transmitted directly to the recruiting
              team for{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">{appliedJobTitle}</strong>.
            </p>

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAppliedModal(false)}
                className="rounded-md bg-zinc-900 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
              >
                Back to Matches
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
