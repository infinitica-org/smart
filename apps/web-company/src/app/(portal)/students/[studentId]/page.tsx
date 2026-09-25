'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, Check, Send, ShieldCheck, Sparkles, User } from 'lucide-react';
import { companyStudentsApi } from '../../../../lib/api';
import type { CandidateMatchDto } from '@smart/contracts';
import { card, pageStack, primaryButton, secondaryButton, sectionTitle } from '../../../../lib/ui';

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;

  const [candidate, setCandidate] = useState<CandidateMatchDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCandidate() {
      setLoading(true);
      try {
        const results = await companyStudentsApi.search();
        const found = results.find((c) => c.studentId === studentId);
        setCandidate(found ?? null);
      } catch {
        setCandidate(null);
      } finally {
        setLoading(false);
      }
    }
    loadCandidate();
  }, [studentId]);

  if (loading) {
    return (
      <div className={pageStack}>
        <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-white" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className={pageStack}>
        <div className={`${card} py-12 text-center`}>
          <User className="mx-auto size-12 text-zinc-400" />
          <h2 className="mt-3 text-lg font-bold text-zinc-900">Candidate Not Found</h2>
          <p className="mt-1 text-sm text-zinc-500">
            This student profile may be private or no longer available.
          </p>
          <div className="mt-4">
            <Link href="/students" className={secondaryButton}>
              <ArrowLeft className="mr-1.5 size-4" /> Back to Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageStack}>
      <div>
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="size-3.5" /> Back to candidate search
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-zinc-900">{candidate.studentName}</h1>
          <p className="text-sm text-zinc-500">
            Verified candidate profile · {candidate.trackCode} Track
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/students" className={primaryButton}>
            <Send className="mr-1.5 size-4" /> Reach Out
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${card} p-4`}>
          <span className="text-xs font-medium text-zinc-500">Headline Readiness</span>
          <div className="mt-2 flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-600" />
            <span className="text-lg font-bold text-zinc-900">{candidate.headlineTier} Tier</span>
          </div>
        </div>

        <div className={`${card} p-4`}>
          <span className="text-xs font-medium text-zinc-500">Highest Defense / Level</span>
          <div className="mt-2 flex items-center gap-2">
            <ShieldCheck className="size-5 text-blue-600" />
            <span className="text-lg font-bold text-zinc-900">
              Level {candidate.highestLevelCleared} Cleared
            </span>
          </div>
        </div>

        <div className={`${card} p-4`}>
          <span className="text-xs font-medium text-zinc-500">Match Affinity Score</span>
          <div className="mt-2 flex items-center gap-2">
            <Award className="size-5 text-purple-600" />
            <span className="text-lg font-bold text-zinc-900">
              {Math.round(candidate.matchScore * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Verified Skills & Competencies */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={`${card} space-y-4`}>
          <h2 className={sectionTitle}>Verified Skill Proofs</h2>
          {candidate.explanation.verifiedSkills?.length ? (
            <div className="divide-y divide-zinc-100">
              {candidate.explanation.verifiedSkills.map((sk) => (
                <div key={sk.skillCode} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-zinc-900">{sk.skillName}</span>
                    <span className="block text-xs text-zinc-500 font-mono">{sk.skillCode}</span>
                  </div>
                  <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {sk.proficiency}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No verified skills explicitly tagged.</p>
          )}
        </div>

        <div className={`${card} space-y-4`}>
          <h2 className={sectionTitle}>Demonstrated Competencies</h2>
          {candidate.explanation.strongCompetencies?.length ? (
            <div className="space-y-2">
              {candidate.explanation.strongCompetencies.map((comp, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5 text-xs text-emerald-900 flex items-start gap-2"
                >
                  <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{comp}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Competency model observations pending.</p>
          )}

          {candidate.explanation.gapCompetencies?.length ? (
            <div className="pt-2">
              <h3 className="text-xs font-semibold text-amber-800 mb-2">Areas for Growth / Gaps</h3>
              <div className="space-y-1.5">
                {candidate.explanation.gapCompetencies.map((gap, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-amber-100 bg-amber-50/50 p-2 text-xs text-amber-900"
                  >
                    ⚠ {gap}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Summarized Competency Evidence (INT-01 / I296: Privacy-Preserving Summaries Without Restricted Recordings) */}
      {candidate.explanation.competencyEvidenceSummaries?.length ? (
        <div className={`${card} space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className={sectionTitle}>Competency Evidence Summaries</h2>
            <span className="text-[11px] font-medium text-zinc-500">
              Privacy-safe observation digests · No video/audio recordings exposed
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {candidate.explanation.competencyEvidenceSummaries.map((evidence, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">{evidence.capabilityLabel}</span>
                  {evidence.skillCode && (
                    <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-mono text-zinc-700">
                      {evidence.skillCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                  <span>
                    Proficiency: <strong className="text-zinc-800">{evidence.proficiency}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Confidence:{' '}
                    <strong className="text-zinc-800">
                      {Math.round(evidence.confidenceScore * 100)}%
                    </strong>
                  </span>
                </div>
                {evidence.evidenceSnippets && evidence.evidenceSnippets.length > 0 && (
                  <ul className="mt-1 list-disc list-inside text-xs text-zinc-600 space-y-0.5">
                    {evidence.evidenceSnippets.map((snippet, sIdx) => (
                      <li key={sIdx}>{snippet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Recruiter / Match Narrative */}
      {candidate.explanation.recruiterSummary ? (
        <div className={`${card} bg-blue-50/40 border-blue-100 p-5 space-y-2`}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900">
            Recruiter Match Summary
          </h2>
          <p className="text-sm text-zinc-700 italic leading-relaxed">
            &ldquo;{candidate.explanation.recruiterSummary}&rdquo;
          </p>
        </div>
      ) : null}

      {/* Responsible AI Gate */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-600">
        <strong>Governance Notice:</strong> Candidate ratings are calculated strictly from proctored
        evaluations and verified evidence. All hiring and shortlisting decisions remain solely with
        the employer.
      </div>
    </div>
  );
}
