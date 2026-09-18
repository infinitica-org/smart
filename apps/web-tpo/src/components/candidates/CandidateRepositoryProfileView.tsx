'use client';

import { Mail, ExternalLink, GraduationCap, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import {
  SKILL_DEFINITIONS,
  proficiencyLevelUiLabel,
  type InstitutionStudentDto,
  type SkillClaimDto,
} from '@smart/contracts';
import { VerificationBadge } from '@smart/ui';
import {
  bentoCompactCardClass,
  dashboardMintBadgeClass,
  dashboardPendingBadgeClass,
  dashboardPillClass,
} from '../../lib/tpo-dashboard-ui';
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

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ds-link)] hover:underline"
    >
      {label}
      <ExternalLink className="size-3 opacity-70" aria-hidden />
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
      <div className={bentoCompactCardClass}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#eef2f6] text-sm font-semibold text-[var(--ds-text-secondary)]"
              aria-hidden
            >
              {candidate.fullName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 space-y-1">
              <h3 className="text-lg font-semibold text-[var(--ds-text)]">{candidate.fullName}</h3>
              <a
                href={`mailto:${candidate.email}`}
                className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ds-text-muted)] hover:text-[var(--ds-link)]"
              >
                <Mail className="size-3.5 shrink-0" aria-hidden />
                {candidate.email}
              </a>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onboardingComplete ? (
                  <span className={dashboardMintBadgeClass}>
                    <CheckCircle2 className="size-3" aria-hidden />
                    Onboarding complete
                  </span>
                ) : (
                  <span className={dashboardPendingBadgeClass}>
                    <Clock className="size-3" aria-hidden />
                    Invite pending
                  </span>
                )}
                {candidate.heldAt ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--ds-coral-border)] bg-[#fef3f2] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-coral)]">
                    <AlertCircle className="size-3" aria-hidden />
                    Hold active
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-[12px] text-[var(--ds-text-muted)] sm:justify-end">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-subtle)]">
                Invite sent
              </span>
              <span className="font-medium text-[var(--ds-text-secondary)]">
                {formatDate(candidate.lastSentAt)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-subtle)]">
                Accepted
              </span>
              <span className="font-medium text-[var(--ds-text-secondary)]">
                {formatDate(candidate.acceptedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-[var(--ds-border-subtle)] pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-2.5">
            <GraduationCap
              className="mt-0.5 size-4 shrink-0 text-[var(--ds-text-subtle)]"
              aria-hidden
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-subtle)]">
                Batch
              </p>
              <p className="text-[13px] font-medium text-[var(--ds-text)]">
                {candidate.batchName ?? 'Not assigned'}
              </p>
            </div>
          </div>
          {primaryCategory ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-subtle)]">
                Primary skill category
              </p>
              <p className="mt-0.5">
                <span className={dashboardPillClass}>{primaryCategory}</span>
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-subtle)]">
              Skill credentials
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-[var(--ds-text)]">
              {claimsLoading
                ? 'Loading…'
                : `${verifiedCount} verified · ${claims?.length ?? 0} claims`}
            </p>
          </div>
        </div>

        {candidate.linkedinUrl || candidate.githubUrl ? (
          <div className="mt-4 flex flex-wrap gap-4 border-t border-[var(--ds-border-subtle)] pt-4">
            {candidate.linkedinUrl ? (
              <SocialLink href={candidate.linkedinUrl} label="LinkedIn" />
            ) : null}
            {candidate.githubUrl ? <SocialLink href={candidate.githubUrl} label="GitHub" /> : null}
          </div>
        ) : null}
      </div>

      {claimsError ? (
        <div
          className="rounded-[12px] border border-[var(--ds-coral-border)] bg-[#fef3f2] px-4 py-3 text-[13px] text-[var(--ds-coral)]"
          role="alert"
        >
          {claimsError}
        </div>
      ) : null}

      <div className={bentoCompactCardClass}>
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--ds-border-subtle)] pb-3">
          <h4 className="text-[13px] font-semibold text-[var(--ds-text)]">Skill claims</h4>
          {!claimsLoading && claims ? (
            <span className="text-[11px] text-[var(--ds-text-muted)]">{claims.length} total</span>
          ) : null}
        </div>

        {claimsLoading ? (
          <p className="py-6 text-center text-[13px] text-[var(--ds-text-muted)]">
            Loading skills…
          </p>
        ) : !claims || claims.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--ds-text-muted)]">
            No skill claims yet. The candidate has not declared or verified skills.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--ds-border-subtle)]">
            {claims.map((claim) => (
              <li key={claim.claimId} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--ds-text)]">
                      {skillDisplayName(claim.skillCode)}
                    </p>
                    <p className="text-[12px] text-[var(--ds-text-muted)]">
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
