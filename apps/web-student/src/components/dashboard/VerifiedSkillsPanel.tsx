'use client';

import Link from 'next/link';

import { ArrowRight, Award } from 'lucide-react';

import type { SkillClaimDto } from '@smart/contracts';

import { VerificationBadge } from '@smart/ui';

import {
  claimToBadgeStatus,
  proficiencyLabelForClaim,
  skillNameForCode,
} from '@/lib/skill-declarations';

interface VerifiedSkillsPanelProps {
  claims: SkillClaimDto[] | undefined;
}

export function VerifiedSkillsPanel({ claims }: VerifiedSkillsPanelProps) {
  const verifiedClaims = (claims ?? []).filter((claim) => claim.status === 'VERIFIED');

  const loading = claims === undefined;

  return (
    <section
      aria-labelledby="verified-skills-heading"

      data-tour="skills-panel"

      className="flex h-full flex-col rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-6"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="verified-skills-heading" className="text-lg font-semibold text-[var(--ds-text)]">
            Verified Skills
          </h2>

          <p className="mt-1 text-sm font-medium text-[var(--ds-text)]">Skills you have verified</p>

          <p className="mt-1 text-sm leading-relaxed text-[var(--ds-text-muted)]">
            Only evidence-backed skills appear here. Select skills in your profile, then assess them
            from Assessment.
          </p>
        </div>

        <Link
          href="/profile?section=skills"

          data-tour="manage-skills-link"

          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--ds-link)] transition hover:underline"
        >
          Manage skills
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ds-text-muted)]">Loading verified skills…</p>
      ) : verifiedClaims.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
          <Award className="mb-3 h-11 w-11 text-[var(--ds-empty-icon)]" aria-hidden="true" />

          <p className="text-sm font-semibold text-[var(--ds-text)]">No verified skills yet</p>

          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--ds-text-muted)]">
            Complete your profile, select skills under Profile, then start assessments when ready.
          </p>

          <Link
            href="/profile?section=skills"

            className="mt-5 inline-flex h-10 items-center gap-2 rounded-[9px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 text-sm font-medium text-[var(--ds-icon)] transition hover:bg-[var(--ds-surface-hover)]"
          >
            Choose skills
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {verifiedClaims.map((claim) => {
            const proficiency = proficiencyLabelForClaim(claim);

            return (
              <li
                key={claim.claimId}

                className="rounded-[10px] border border-[var(--ds-border-inner)] bg-[var(--ds-surface-muted)] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ds-text)]">
                      {skillNameForCode(claim.skillCode)}
                    </p>

                    {proficiency ? (
                      <p className="mt-0.5 text-xs text-[var(--ds-text-muted)]">{proficiency}</p>
                    ) : null}
                  </div>

                  <VerificationBadge status={claimToBadgeStatus(claim)} variant="outline" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
