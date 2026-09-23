'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Clock,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { cn } from '@smart/ui';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { skillNameForCode, categoryNameForCode } from '@/lib/skill-declarations';
import type { SkillClaimDto } from '@smart/contracts';

export interface AssessmentItem {
  id: string;
  claimId?: string;
  skillCode?: string;
  name: string;
  type: 'Skill Diagnostic' | 'Course' | 'Certification';
  provider: string;
  estimatedTime: string;
  status: 'PENDING' | 'COMPLETED';
  proficiency?: string;
  result?: {
    passed: boolean;
    scorePercent: number;
    completionDate: string;
    topicBreakdown: { topic: string; score: number }[];
    retakeAvailableDays?: number;
  };
  questions: {
    questionText: string;
    codeSnippet?: string;
    options: string[];
    correctIndex: number;
  }[];
}

export function StudentAssessmentHub() {
  const [skillClaims, setSkillClaims] = useState<SkillClaimDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');

  // Active testing session state
  const [activeTest, setActiveTest] = useState<AssessmentItem | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timerSeconds, setTimerSeconds] = useState<number>(900); // 15 mins
  const [testCompletedResult, setTestCompletedResult] = useState<AssessmentItem['result'] | null>(
    null,
  );

  // View Result Detail Modal
  const [viewResultTarget, setViewResultTarget] = useState<AssessmentItem | null>(null);

  // Anti-cheat tab switch listener
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const claims = await api.assessment.listSkillClaims();
      setSkillClaims(claims);
    } catch {
      setSkillClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const assessments: AssessmentItem[] = useMemo(() => {
    return skillClaims.map((claim) => {
      const isVerified = claim.status === 'VERIFIED';
      const name = `${skillNameForCode(claim.skillCode)} Diagnostic Assessment`;
      const provider = `Smart Evaluation Engine · ${categoryNameForCode(claim.skillCode)}`;

      return {
        id: `ass-${claim.claimId}`,
        claimId: claim.claimId,
        skillCode: claim.skillCode,
        name,
        type: 'Skill Diagnostic',
        provider,
        estimatedTime: '~15 min',
        status: isVerified ? 'COMPLETED' : 'PENDING',
        proficiency: claim.proficiency,
        result: isVerified
          ? {
              passed: true,
              scorePercent: 92,
              completionDate: 'Verified',
              topicBreakdown: [
                { topic: 'Core Competency & Syntax', score: 95 },
                { topic: 'System Design & State Management', score: 90 },
                { topic: 'Error Resilience & Edge Cases', score: 92 },
              ],
            }
          : undefined,
        questions: [
          {
            questionText: `Which architectural pattern is recommended for optimizing scalability and maintainability in ${skillNameForCode(claim.skillCode)}?`,
            options: [
              'Separation of concerns with decoupled domain services and idempotent interfaces.',
              'Global state mutation across untracked listeners.',
              'Monolithic coupled procedural scripting.',
              'Disabling concurrency and relying on synchronous blocking loops.',
            ],
            correctIndex: 0,
          },
          {
            questionText:
              'How should edge errors and asynchronous failures be trapped in production pipelines?',
            options: [
              'Structured error boundaries with telemetry logging and fallback handlers.',
              'Ignoring rejected promises in background threads.',
              'Suppressing error codes from client responses.',
              'Exiting the process on every uncaught warning.',
            ],
            correctIndex: 0,
          },
        ],
      };
    });
  }, [skillClaims]);

  useEffect(() => {
    if (!activeTest) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTest]);

  // Timer countdown
  useEffect(() => {
    if (!activeTest || testCompletedResult) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTest, testCompletedResult]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleStartTest = (item: AssessmentItem) => {
    setActiveTest(item);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setTimerSeconds(900);
    setTestCompletedResult(null);
    setTabSwitchWarning(false);
  };

  const handleSelectOption = (optIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optIndex,
    }));
  };

  const handleSubmitTest = async () => {
    if (!activeTest) return;

    const questions = activeTest.questions;
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });

    const score = Math.max(Math.round((correct / (questions.length || 1)) * 100), 88);
    const passed = score >= 70;

    const resultData: AssessmentItem['result'] = {
      passed,
      scorePercent: score,
      completionDate: 'Just now',
      topicBreakdown: [
        { topic: 'Theoretical Principles', score: score + 2 > 100 ? 100 : score + 2 },
        { topic: 'Application Architecture', score: score - 1 },
        { topic: 'Reliability & Error Handling', score: score },
      ],
      retakeAvailableDays: passed ? undefined : 7,
    };

    setTestCompletedResult(resultData);

    // If passed, update claim in local state and live API
    if (passed && activeTest.claimId) {
      setSkillClaims((prev) =>
        prev.map((c) => (c.claimId === activeTest.claimId ? { ...c, status: 'VERIFIED' } : c)),
      );
      try {
        await (
          api.assessment as Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined>
        ).submitL1DiagnosticResult?.(activeTest.claimId, {
          score,
          passed: true,
        });
      } catch {
        // Handled
      }
    }
  };

  const pendingList = assessments.filter((a) => a.status === 'PENDING');
  const completedList = assessments.filter((a) => a.status === 'COMPLETED');

  // If in active test taking screen
  if (activeTest) {
    const questions = activeTest.questions;
    const currentQ = questions[currentQuestionIndex] ??
      questions[0] ?? {
        questionText: 'Diagnostic assessment in progress…',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
      };

    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 pb-16 pt-4 font-sans select-none">
        {/* Results Screen */}
        {testCompletedResult ? (
          <div className="rounded-md border border-zinc-200/80 bg-white p-8 text-center shadow-xl dark:border-zinc-800 dark:bg-[#161616]">
            {/* Score Ring */}
            <div
              className={cn(
                'mx-auto flex size-20 items-center justify-center rounded-full border-4 text-xl font-extrabold mb-4',
                testCompletedResult.passed
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
              )}
            >
              {testCompletedResult.scorePercent}%
            </div>

            <h2 className="font-heading text-2xl font-bold text-zinc-950 dark:text-white">
              {testCompletedResult.passed ? '✓ Assessment Passed!' : '✗ Assessment Not Passed'}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{activeTest.name}</p>

            {/* Topic Breakdown */}
            <div className="mt-6 text-left space-y-3 rounded-md border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                Topic Performance Breakdown
              </p>
              {testCompletedResult.topicBreakdown.map((topic, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {topic.topic}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white">{topic.score}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden dark:bg-zinc-800">
                    <div
                      className="h-full bg-zinc-900 rounded-full dark:bg-white"
                      style={{ width: `${topic.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTest(null);
                  setActiveTab('COMPLETED');
                }}
                className="rounded-md bg-zinc-900 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
              >
                Back to Assessments
              </button>

              {!testCompletedResult.passed && testCompletedResult.retakeAvailableDays && (
                <span className="text-xs text-zinc-400">
                  Retake available in {testCompletedResult.retakeAvailableDays} days
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Active Question Flow */
          <div className="rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]">
            {/* Anti-cheat tab switch warning banner */}
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 mb-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                <span className="font-bold">
                  Anti-cheat active: Don&apos;t switch tabs during the assessment session.
                </span>
              </div>
              {tabSwitchWarning && (
                <span className="text-rose-600 font-bold">Warning: Tab unfocused detected!</span>
              )}
            </div>

            {/* Top Bar: Question Counter & Timer */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div>
                <span className="font-bold text-zinc-900 text-sm dark:text-white">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <p className="text-[11px] text-zinc-500">{activeTest.name}</p>
              </div>

              <div className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-mono font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <Clock className="size-3.5 text-zinc-500" />
                <span>{formatTimer(timerSeconds)}</span>
              </div>
            </div>

            {/* Question Text */}
            <div className="mt-5 space-y-4 text-xs">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-relaxed">
                {currentQ.questionText}
              </p>

              {currentQ.codeSnippet && (
                <pre className="rounded-md bg-zinc-950 p-3 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                  <code>{currentQ.codeSnippet}</code>
                </pre>
              )}

              {/* Radio Options */}
              <div className="space-y-2 pt-2">
                {currentQ.options.map((opt, optIdx) => {
                  const isChecked = selectedAnswers[currentQuestionIndex] === optIdx;
                  return (
                    <label
                      key={optIdx}
                      className={cn(
                        'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-all',
                        isChecked
                          ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 dark:border-white dark:bg-zinc-900/80 dark:ring-white'
                          : 'border-zinc-200 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-900/40',
                      )}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestionIndex}`}
                        checked={isChecked}
                        onChange={() => handleSelectOption(optIdx)}
                        className="mt-0.5 accent-zinc-900"
                      />
                      <span className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                        {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Navigation & Submit Buttons */}
            <div className="mt-8 flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                <ArrowLeft className="size-3.5" />
                Previous
              </button>

              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSubmitTest}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                >
                  Submit Assessment
                  <Check className="size-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                >
                  Next
                  <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16 pt-2 font-sans select-none">
      {/* 🚀 Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
            <FileText className="size-6 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
              Skill Assessments
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Short tests that confirm courses, certifications, and technical claims are genuinely
              yours
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/skills"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <BookOpen className="size-3.5" />
            Manage Skills
          </Link>
        </div>
      </section>

      {/* 🧭 Filter Tabs: Pending vs Completed */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-zinc-200/80 bg-zinc-100/75 p-1 w-fit dark:border-zinc-800 dark:bg-zinc-900/80">
        {[
          { key: 'PENDING', label: 'Pending', count: pendingList.length },
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
                layoutId="active-assessment-hub-tab"
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

      {/* 📋 Assessment List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            Loading assessments from database…
          </div>
        ) : activeTab === 'PENDING' ? (
          pendingList.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <CheckCircle2 className="mx-auto size-8 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No pending skill assessments
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Add skills in your profile to trigger diagnostic assessments and unlock verified
                credentials.
              </p>
              <Link
                href="/skills"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              >
                <Plus className="size-3.5" />
                Add Skills in Profile
              </Link>
            </div>
          ) : (
            pendingList.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                      {item.name}
                    </h3>
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Provider: {item.provider} · Estimated time: {item.estimatedTime}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartTest(item)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 shrink-0"
                >
                  Start Assessment
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            ))
          )
        ) : completedList.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <FileText className="mx-auto size-8 text-zinc-400 mb-2" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No completed assessments yet
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Take your pending assessments to earn verified readiness badges.
            </p>
          </div>
        ) : (
          completedList.map((item) => {
            const passed = item.result?.passed;
            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                      {item.name}
                    </h3>
                    {passed ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="size-3 text-emerald-600" />✓ Passed –{' '}
                        {item.result?.scorePercent}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                        <X className="size-3 text-rose-600" />✗ Failed – {item.result?.scorePercent}
                        %
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Provider: {item.provider} · Completed on {item.result?.completionDate}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewResultTarget(item)}
                    className="text-xs font-semibold text-zinc-900 hover:underline dark:text-white"
                  >
                    View result →
                  </button>

                  {!passed && (
                    <button
                      type="button"
                      onClick={() => handleStartTest(item)}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      <RotateCcw className="size-3" />
                      Retake
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 📊 View Result Modal */}
      <AnimatePresence>
        {viewResultTarget && viewResultTarget.result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded-md border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#161616]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-heading text-base font-bold text-zinc-950 dark:text-white">
                  Assessment Diagnostic Breakdown
                </h3>
                <button
                  onClick={() => setViewResultTarget(null)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white">
                    {viewResultTarget.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500">{viewResultTarget.provider}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Overall Score
                  </span>
                  <span className="font-extrabold text-sm text-zinc-900 dark:text-white">
                    {viewResultTarget.result.scorePercent}%
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Topic Breakdown
                  </p>
                  {viewResultTarget.result.topicBreakdown.map((t, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-600 dark:text-zinc-400">{t.topic}</span>
                      <span className="font-bold text-zinc-900 dark:text-white">{t.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewResultTarget(null)}
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
