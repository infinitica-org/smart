'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowRight } from 'lucide-react';
import type { EvidenceRecordDto, SkillClaimDto } from '@smart/contracts';
import { Alert } from '@smart/ui';

import { AssessmentSkillLinkedProjects } from '@/components/assessment/AssessmentSkillLinkedProjects';
import { api } from '@/lib/api';
import type { SkillEvidenceContextView } from '@/lib/skill-evidence-context';
import {
  linkedEvidenceContextForSkill,
  loadProfileLinkedEvidenceBundle,
  type ProfileLinkedEvidenceBundle,
} from '@/lib/skill-linked-evidence-bundle';
import {
  categoryNameForCode,
  skillNameForCode,
  takeAssessmentBlockMessage,
} from '@/lib/skill-declarations';
import { canVerifySkills } from '@/lib/profile-progress';
import { assessmentCardStateForClaim } from '@/lib/student-assessment-ui';
import { profileSectionHref } from '@/lib/profile-sections';
import { useProfileProgress } from '@/lib/use-profile-progress';
import {
  profileCardClass,
  profileHeadingClass,
  profileMutedTextClass,
  profilePrimaryButtonClass,
} from '@/lib/profile-ui-classes';

export function StudentAssessmentHub() {
  const router = useRouter();
  const { progress, loading: profileLoading } = useProfileProgress();
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [evidenceBundle, setEvidenceBundle] = useState<ProfileLinkedEvidenceBundle | null>(null);
  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [rows, bundle, records] = await Promise.all([
          api.assessment.listSkillClaims(),
          loadProfileLinkedEvidenceBundle(),
          api.evidence.list().catch(() => [] as EvidenceRecordDto[]),
        ]);
        if (!cancelled) {
          setClaims(rows);
          setEvidenceBundle(bundle);
          setEvidenceRecords(records);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load assessments.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedClaims = useMemo(
    () =>
      [...claims].sort((a, b) =>
        skillNameForCode(a.skillCode).localeCompare(skillNameForCode(b.skillCode)),
      ),
    [claims],
  );

  const linkedContextBySkill = useMemo(() => {
    const map = new Map<string, SkillEvidenceContextView>();
    if (!evidenceBundle) return map;
    for (const claim of claims) {
      map.set(
        claim.skillCode,
        linkedEvidenceContextForSkill(claim.skillCode, evidenceBundle, evidenceRecords),
      );
    }
    return map;
  }, [claims, evidenceBundle, evidenceRecords]);

  const profileUnlocked = canVerifySkills(progress?.percent);

  const openAssessment = (claim: SkillClaimDto) => {
    setError(null);
    setPendingClaimId(claim.claimId);
    startTransition(() => {
      void (async () => {
        try {
          const block = takeAssessmentBlockMessage(claim);
          if (block) {
            setError(block);
            return;
          }
          router.push(`/assessments/skills/${claim.claimId}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not open assessment.');
        } finally {
          setPendingClaimId(null);
        }
      })();
    });
  };

  return (
    <div className="min-h-full bg-[var(--ds-canvas)]">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
        <header className="max-w-2xl space-y-2">
          <h1
            className={`text-[28px] font-semibold tracking-tight md:text-[32px] ${profileHeadingClass}`}
          >
            Assessment
          </h1>
          <p className={`text-base leading-relaxed ${profileMutedTextClass}`}>
            Build verified credentials through autonomous skill assessments for the skills you
            selected in your profile.
          </p>
        </header>

        {error ? (
          <Alert tone="danger" title="Error" className="mt-6">
            {error}
          </Alert>
        ) : null}

        {loading || profileLoading ? (
          <p className={`mt-8 text-sm ${profileMutedTextClass}`} aria-live="polite">
            Loading assessments…
          </p>
        ) : sortedClaims.length === 0 ? (
          <div className={`${profileCardClass} mt-8 max-w-lg space-y-4`}>
            <h2 className={`text-lg font-semibold ${profileHeadingClass}`}>
              No skills selected yet
            </h2>
            <p className={`text-sm leading-relaxed ${profileMutedTextClass}`}>
              Select skills from your Profile to start your skill assessments.
            </p>
            <Link href={profileSectionHref('skills')} className={profilePrimaryButtonClass}>
              Choose Skills
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-muted)]">
              My assessments
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedClaims.map((claim) => {
                const card = assessmentCardStateForClaim(claim);
                const busy = isPending && pendingClaimId === claim.claimId;
                const blocked =
                  !profileUnlocked && claim.status !== 'VERIFIED'
                    ? 'Complete at least 50% of your profile to start assessments.'
                    : takeAssessmentBlockMessage(claim);
                const disabled = card.disabled || Boolean(blocked) || busy;

                return (
                  <li key={claim.claimId}>
                    <article className={`${profileCardClass} flex h-full flex-col gap-4 !p-5`}>
                      <div className="space-y-1">
                        <h3 className={`text-lg font-semibold ${profileHeadingClass}`}>
                          {skillNameForCode(claim.skillCode)}
                        </h3>
                        <p className={`text-sm ${profileMutedTextClass}`}>
                          {categoryNameForCode(claim.skillCode)}
                        </p>
                      </div>
                      <AssessmentSkillLinkedProjects
                        context={linkedContextBySkill.get(claim.skillCode)}
                      />
                      <div className="mt-auto space-y-3">
                        <p
                          className={`text-xs font-medium uppercase tracking-wide ${profileMutedTextClass}`}
                        >
                          Skill assessment
                        </p>
                        <p className={`text-sm font-medium ${profileHeadingClass}`}>
                          {card.statusLabel}
                        </p>
                        {blocked ? (
                          <p className={`text-xs leading-snug ${profileMutedTextClass}`}>
                            {blocked}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => openAssessment(claim)}
                          className={`${profilePrimaryButtonClass} w-full justify-center disabled:opacity-50`}
                        >
                          {busy ? 'Loading…' : card.buttonLabel}
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!profileUnlocked && sortedClaims.length > 0 ? (
          <p className={`mt-6 text-sm ${profileMutedTextClass}`}>
            Complete more profile sections to unlock new skill assessments. Verified skills can
            still be practiced anytime.
          </p>
        ) : null}
      </div>
    </div>
  );
}
