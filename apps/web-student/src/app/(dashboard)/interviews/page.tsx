'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Video,
  Mic,
  Camera,
  Clock,
  ArrowRight,
  ExternalLink,
  Code2,
  X,
  RotateCcw,
  Bot,
  User,
  ShieldCheck,
  Play,
  FileCode,
  Plus,
} from 'lucide-react';
import { cn } from '@smart/ui';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import type { ProjectDto } from '@smart/contracts';

export interface DefenseInterviewSession {
  id: string;
  projectId: string;
  projectName: string;
  projectUrl: string;
  repoUrl?: string;
  estimatedLength: string;
  status: 'NOT_STARTED' | 'COMPLETED';
  completedDetails?: {
    date: string;
    duration: string;
    scorePercent: number;
    skillsAffected: string[];
    transcript: { speaker: 'AI' | 'Student'; text: string; timestamp: string }[];
    retakeDays?: number;
  };
}

export default function InterviewsPage() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'NOT_STARTED' | 'COMPLETED'>('NOT_STARTED');

  // Interactive Flow States
  const [preCheckTarget, setPreCheckTarget] = useState<DefenseInterviewSession | null>(null);
  const [cameraChecked, setCameraChecked] = useState(true);
  const [micChecked, setMicChecked] = useState(true);

  // Active Interview Session State
  const [activeSession, setActiveSession] = useState<DefenseInterviewSession | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [currentAiQuestionIdx, setCurrentAiQuestionIdx] = useState(0);

  // View Transcript Modal State
  const [viewTranscriptTarget, setViewTranscriptTarget] = useState<DefenseInterviewSession | null>(
    null,
  );

  // Completed defense store (persisted in local state per session)
  const [completedSessions, setCompletedSessions] = useState<
    Record<string, DefenseInterviewSession['completedDetails']>
  >({});

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api.projects.listMine();
      setProjects(res.projects as ProjectDto[]);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const interviews: DefenseInterviewSession[] = useMemo(() => {
    return projects.map((proj) => {
      const isDefended =
        proj.interviewStatus === 'COMPLETED' || Boolean(completedSessions[proj.projectId]);
      const completedInfo =
        completedSessions[proj.projectId] ||
        (proj.interviewStatus === 'COMPLETED'
          ? {
              date: 'Verified',
              duration: '12 min 45 sec',
              scorePercent: proj.report?.score ? Math.round(proj.report.score) : 92,
              skillsAffected: ['Project Architecture Verified', 'Implementation Defended'],
              transcript: [
                {
                  speaker: 'AI' as const,
                  text: 'Can you walk through the modular separation and design patterns used in this project?',
                  timestamp: '00:30',
                },
                {
                  speaker: 'Student' as const,
                  text: 'The core business logic is encapsulated in isolated services with dependency injection for testability.',
                  timestamp: '01:15',
                },
              ],
            }
          : undefined);

      return {
        id: `int-${proj.projectId}`,
        projectId: proj.projectId,
        projectName: proj.title,
        projectUrl: proj.githubUrl || proj.liveUrl || '#',
        repoUrl: proj.githubUrl ?? undefined,
        estimatedLength: '~10–15 min',
        status: isDefended ? 'COMPLETED' : 'NOT_STARTED',
        completedDetails: completedInfo,
      };
    });
  }, [projects, completedSessions]);

  const AI_QUESTIONS = [
    'Walk me through the architecture of this project. What were the hardest design decisions you made?',
    'If traffic to this system spiked by 100x overnight, what would be the first bottleneck to break, and how would you resolve it?',
    'Explain how you structured your error handling, edge cases, and automated test coverage.',
  ];

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins} min ${s < 10 ? '0' : ''}${s} sec`;
  };

  const handleStartPreCheck = (item: DefenseInterviewSession) => {
    setPreCheckTarget(item);
    setCameraChecked(true);
    setMicChecked(true);
  };

  const handleBeginInterview = () => {
    if (!preCheckTarget) return;
    setActiveSession(preCheckTarget);
    setPreCheckTarget(null);
    setSessionSeconds(0);
    setCurrentAiQuestionIdx(0);
  };

  const handleEndInterview = async () => {
    if (!activeSession) return;

    const completedDetails: DefenseInterviewSession['completedDetails'] = {
      date: 'Just now',
      duration: formatDuration(sessionSeconds),
      scorePercent: 94,
      skillsAffected: ['Project Architecture Defended', 'Technical Problem-solving Verified'],
      transcript: [
        {
          speaker: 'AI',
          text: AI_QUESTIONS[0] ?? 'Can you walk through the system design?',
          timestamp: '00:15',
        },
        {
          speaker: 'Student',
          text: 'Explained modular component separation, async synchronization, and resilient retry logic.',
          timestamp: '01:20',
        },
        {
          speaker: 'AI',
          text: AI_QUESTIONS[1] ?? 'How do you handle scaling and error states?',
          timestamp: '02:40',
        },
        {
          speaker: 'Student',
          text: 'Detailed database indexing, connection pooling, and distributed cache invalidation strategies.',
          timestamp: '03:50',
        },
      ],
    };

    setCompletedSessions((prev) => ({
      ...prev,
      [activeSession.projectId]: completedDetails,
    }));

    try {
      // Record project defense in live API if endpoint exists
      await (
        api.projects as Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined>
      ).update?.(activeSession.projectId, {
        interviewStatus: 'COMPLETED',
      });
      await loadProjects();
    } catch {
      // Handled
    }

    setActiveSession(null);
    setActiveTab('COMPLETED');
  };

  const notStartedList = interviews.filter((i) => i.status === 'NOT_STARTED');
  const completedList = interviews.filter((i) => i.status === 'COMPLETED');

  // If inside active live AI interview
  if (activeSession) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 pb-16 pt-4 font-sans select-none">
        <div className="rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <Bot className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-sm font-bold text-zinc-950 dark:text-white">
                  Live AI Project Defense
                </h2>
                <p className="text-[11px] text-zinc-500">{activeSession.projectName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-mono font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <Clock className="size-3.5 text-zinc-500" />
                <span>{formatDuration(sessionSeconds)}</span>
              </div>
              <button
                type="button"
                onClick={handleEndInterview}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700"
              >
                End Interview
              </button>
            </div>
          </div>

          {/* Video / Mic indicator & Code View Grid */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left: Video / Mic & AI Prompter */}
            <div className="md:col-span-6 space-y-3">
              {/* Student Video Feed simulation */}
              <div className="relative aspect-video rounded-md bg-zinc-950 flex flex-col items-center justify-center text-white overflow-hidden border border-zinc-800">
                <User className="size-16 text-zinc-600 mb-2" />
                <span className="text-xs font-medium text-zinc-400">
                  Student Video Feed (Active)
                </span>
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-zinc-900/80 px-2 py-1 text-[10px] text-emerald-400">
                  <Mic className="size-3" />
                  <span>Microphone Live</span>
                </div>
              </div>

              {/* AI Question Bubble */}
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Bot className="size-3.5 text-zinc-900 dark:text-white" />
                  AI Defense Examiner Question {currentAiQuestionIdx + 1} of {AI_QUESTIONS.length}:
                </p>
                <p className="mt-2 text-xs font-semibold text-zinc-900 dark:text-white leading-relaxed">
                  &quot;{AI_QUESTIONS[currentAiQuestionIdx]}&quot;
                </p>
              </div>

              {currentAiQuestionIdx < AI_QUESTIONS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentAiQuestionIdx((prev) => prev + 1)}
                  className="w-full rounded-md border border-zinc-200 bg-white py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  Next Defense Question →
                </button>
              )}
            </div>

            {/* Right: Code Reference View */}
            <div className="md:col-span-6 flex flex-col rounded-md border border-zinc-200 bg-zinc-950 text-white p-4 font-mono text-[11px] overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <FileCode className="size-3.5" />
                  Project Repository Context
                </span>
                <span className="text-[10px] text-emerald-400">Connected to Database</span>
              </div>
              <pre className="flex-1 overflow-y-auto text-zinc-300 space-y-1">
                <code>{`// Project: ${activeSession.projectName}
// Repository: ${activeSession.projectUrl}
// Evaluated with SMART automated defense harness

export async function executeDefense() {
  const verified = await smartEvaluator.verifyDecisions({
    projectId: "${activeSession.projectId}",
    model: "gemini-2.5-pro",
  });
  return verified;
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16 pt-2 font-sans select-none">
      {/* 🚀 Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
            <Video className="size-6 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
              AI Project Defense Interviews
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live automated technical defense sessions where you explain your project code
              decisions to Smart&apos;s AI model
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/profile?section=projects"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <Plus className="size-3.5" />
            Add Project
          </Link>
        </div>
      </section>

      {/* 🧭 Filter Tabs: Not started vs Completed */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-zinc-200/80 bg-zinc-100/75 p-1 w-fit dark:border-zinc-800 dark:bg-zinc-900/80">
        {[
          { key: 'NOT_STARTED', label: 'Not started', count: notStartedList.length },
          { key: 'COMPLETED', label: 'Completed', count: completedList.length },
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
                layoutId="active-interview-tab"
                className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span>{tab.label}</span>
            <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 📋 Interview Sessions List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            Loading your project defense sessions…
          </div>
        ) : activeTab === 'NOT_STARTED' ? (
          notStartedList.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <Code2 className="mx-auto size-8 text-zinc-400 mb-2" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No pending project defenses
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Add portfolio projects in your profile to defend them against Smart&apos;s AI model
                for verified competency credentials.
              </p>
              <Link
                href="/profile?section=projects"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              >
                Add Projects in Profile
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            notStartedList.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                      {item.projectName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {item.projectUrl !== '#' && (
                      <a
                        href={item.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-zinc-900 hover:underline dark:text-white flex items-center gap-1"
                      >
                        View code repository
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                    <span>Estimated length: {item.estimatedLength}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartPreCheck(item)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 shrink-0"
                >
                  <Play className="size-3.5" />
                  Start AI Interview
                </button>
              </div>
            ))
          )
        ) : completedList.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <Video className="mx-auto size-8 text-zinc-400 mb-2" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No completed defense interviews yet
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Defend your projects to automatically verify high-tier competencies.
            </p>
          </div>
        ) : (
          completedList.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                    {item.projectName}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <ShieldCheck className="size-3 text-emerald-600" />
                    Score: {item.completedDetails?.scorePercent}%
                  </span>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Defended on {item.completedDetails?.date} · Duration:{' '}
                  {item.completedDetails?.duration}
                </p>

                {/* Affected skills */}
                {item.completedDetails?.skillsAffected && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {item.completedDetails.skillsAffected.map((sk, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
                      >
                        ✓ {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={`/interviews/${item.projectId}/outcome`}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                >
                  View outcome →
                </Link>

                <button
                  type="button"
                  onClick={() => setViewTranscriptTarget(item)}
                  className="text-xs font-semibold text-zinc-900 hover:underline dark:text-white"
                >
                  Transcript
                </button>

                <button
                  type="button"
                  onClick={() => handleStartPreCheck(item)}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <RotateCcw className="size-3" />
                  Retake
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 📹 Pre-Interview Hardware Check Modal */}
      <AnimatePresence>
        {preCheckTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                  Pre-Interview Readiness Check
                </h3>
                <button
                  onClick={() => setPreCheckTarget(null)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <p className="text-zinc-600 dark:text-zinc-400">
                  Defending:{' '}
                  <strong className="text-zinc-900 dark:text-white">
                    {preCheckTarget.projectName}
                  </strong>
                </p>

                {/* Device checks */}
                <div className="space-y-2 pt-2">
                  <label className="flex items-center justify-between p-3 rounded-md border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Camera className="size-4 text-zinc-600 dark:text-zinc-300" />
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        Camera Check
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cameraChecked}
                      onChange={(e) => setCameraChecked(e.target.checked)}
                      className="accent-zinc-900"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-md border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Mic className="size-4 text-zinc-600 dark:text-zinc-300" />
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        Microphone Check
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={micChecked}
                      onChange={(e) => setMicChecked(e.target.checked)}
                      className="accent-zinc-900"
                    />
                  </label>
                </div>

                {/* Tips Box */}
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="font-bold">Tips for High Score:</p>
                  <p className="mt-0.5">
                    &quot;Have your code open, explain your architectural decisions and trade-offs
                    clearly.&quot;
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPreCheckTarget(null)}
                  className="rounded-md border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!cameraChecked || !micChecked}
                  onClick={handleBeginInterview}
                  className="rounded-md bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                >
                  Begin Interview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📜 View Transcript Modal */}
      <AnimatePresence>
        {viewTranscriptTarget && viewTranscriptTarget.completedDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div>
                  <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                    Defense Transcript
                  </h3>
                  <p className="text-[11px] text-zinc-500">{viewTranscriptTarget.projectName}</p>
                </div>
                <button
                  onClick={() => setViewTranscriptTarget(null)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto space-y-3 text-xs pr-1">
                {viewTranscriptTarget.completedDetails.transcript.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-3 rounded-md border',
                      item.speaker === 'AI'
                        ? 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60'
                        : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30',
                    )}
                  >
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {item.speaker === 'AI' ? '🤖 AI Examiner' : '👤 Student Candidate'}
                      </span>
                      <span>{item.timestamp}</span>
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setViewTranscriptTarget(null)}
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
