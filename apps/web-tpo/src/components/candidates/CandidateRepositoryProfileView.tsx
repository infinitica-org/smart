'use client';

import {
  Mail,
  ExternalLink,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Award,
  Layers,
  Calendar,
} from 'lucide-react';
import {
  SKILL_DEFINITIONS,
  proficiencyLevelUiLabel,
  type InstitutionStudentDto,
  type SkillClaimDto,
} from '@smart/contracts';
import { VerificationBadge } from '@smart/ui';
import { categoryNameForSkillCode } from '../../lib/skill-taxonomy';
import { CompetencyBreakdown } from '../competency-breakdown';

function skillDisplayName(code: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === code)?.name ?? code;
}

function formatProficiency(value: string): string {
  return proficiencyLevelUiLabel(value);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || 'ST').toUpperCase();
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-2xs transition-all hover:bg-zinc-100 hover:border-zinc-300 hover:text-zinc-900"
    >
      {label}
      <ExternalLink className="size-3 text-zinc-400" aria-hidden />
    </a>
  );
}

export function CandidateRepositoryProfileView({
  candidate,
  claims,
  claimsLoading,
  claimsError,
}: {
  candidate: InstitutionStudentDto;
  claims: SkillClaimDto[] | null;
  claimsLoading: boolean;
  claimsError: string | null;
}) {
  const verifiedCount = claims?.filter((c) => c.status === 'VERIFIED').length ?? 0;
  const firstClaim = claims?.[0];
  const primaryCategory = firstClaim ? categoryNameForSkillCode(firstClaim.skillCode) : null;
  const onboardingComplete = candidate.inviteStatus === 'ACCEPTED';

  return (
    <div className="space-y-4">
      {/* Primary Profile Card */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-900 font-mono text-base font-bold text-white shadow-2xs"
              aria-hidden
            >
              {getInitials(candidate.fullName)}
            </div>

            <div className="min-w-0 space-y-1.5">
              <h3 className="font-heading text-lg font-bold tracking-tight text-zinc-900">
                {candidate.fullName}
              </h3>

              <a
                href={`mailto:${candidate.email}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <Mail className="size-3.5 shrink-0 text-zinc-400" aria-hidden />
                {candidate.email}
              </a>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onboardingComplete ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
                    <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    Onboarding Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                    <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                    Invite Pending
                  </span>
                )}

                {candidate.heldAt ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/90 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 shadow-2xs">
                    <span className="size-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
                    Hold Active
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Invitation Timestamps */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end sm:gap-1.5">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200/70 bg-zinc-50/70 px-3 py-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Invite sent:
              </span>
              <span className="font-mono font-semibold text-zinc-800">
                {formatDate(candidate.lastSentAt)}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-zinc-200/70 bg-zinc-50/70 px-3 py-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Accepted:
              </span>
              <span className="font-mono font-semibold text-zinc-800">
                {formatDate(candidate.acceptedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Candidate metadata summary */}
        <div className="mt-5 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200/70 bg-zinc-50/50 p-3">
            <div className="flex size-8.5 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-white text-zinc-800 shadow-2xs">
              <GraduationCap className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Cohort Batch
              </p>
              <p className="mt-0.5 truncate text-xs font-bold text-zinc-900">
                {candidate.batchName ?? 'Not assigned'}
              </p>
            </div>
          </div>

          {primaryCategory ? (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200/70 bg-zinc-50/50 p-3">
              <div className="flex size-8.5 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-white text-zinc-800 shadow-2xs">
                <Sparkles className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Primary Category
                </p>
                <p className="mt-0.5 truncate text-xs font-bold text-zinc-900">{primaryCategory}</p>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3 rounded-lg border border-zinc-200/70 bg-zinc-50/50 p-3">
            <div className="flex size-8.5 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-white text-zinc-800 shadow-2xs">
              <Award className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Skill Credentials
              </p>
              <p className="mt-0.5 text-xs font-bold text-zinc-900">
                {claimsLoading
                  ? 'Loading…'
                  : `${verifiedCount} verified · ${claims?.length ?? 0} claims`}
              </p>
            </div>
          </div>
        </div>

        {candidate.linkedinUrl || candidate.githubUrl ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            {candidate.linkedinUrl ? (
              <SocialLink href={candidate.linkedinUrl} label="LinkedIn Profile" />
            ) : null}
            {candidate.githubUrl ? (
              <SocialLink href={candidate.githubUrl} label="GitHub Profile" />
            ) : null}
          </div>
        ) : null}
      </div>

      {claimsError ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 shadow-2xs"
          role="alert"
        >
          {claimsError}
        </div>
      ) : null}

      {/* Skill Claims Section */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-2xs">
        <div className="mb-4 flex items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-zinc-900" />
            <h4 className="text-sm font-bold text-zinc-900">Skill claims</h4>
          </div>
          {!claimsLoading && claims ? (
            <span className="rounded-md border border-zinc-200/80 bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
              {claims.length} total
            </span>
          ) : null}
        </div>

        {claimsLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-xs text-zinc-500">
            <div className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
            <span>Loading skills…</span>
          </div>
        ) : !claims || claims.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center">
            <div className="mx-auto mb-2.5 flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 border border-zinc-200/80">
              <ShieldCheck className="size-5 stroke-[1.5]" />
            </div>
            <p className="text-xs font-bold text-zinc-800">No skill claims yet</p>
            <p className="mt-1 text-[11px] text-zinc-500 max-w-sm mx-auto">
              The candidate has not declared or verified skills in the assessment repository yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {claims.map((claim) => (
              <li key={claim.claimId} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-900">
                      {skillDisplayName(claim.skillCode)}
                    </p>
                    <p className="text-xs font-medium text-zinc-500 mt-0.5">
                      {formatProficiency(claim.proficiency)} proficiency
                    </p>
                  </div>
                  <VerificationBadge status={claim.status} variant="outline" />
                </div>
                {claim.latestAssessmentResult ? (
                  <CompetencyBreakdown
                    skillCode={claim.skillCode}
                    assessmentResult={claim.latestAssessmentResult}
                    tone="light"
                    compact
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
