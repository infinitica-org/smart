'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type SkillCategoryId, type SkillClaimDto, skillFocusOptions } from '@smart/contracts';
import { Alert } from '@smart/ui';
import { api } from '../../lib/api';
import { SkillVerifyRow } from '../assessment/skill-verify-row';
import { SkillVerificationInstructions } from '../assessment/skill-verification-instructions';
import { nativeOptionClass, nativeSelectClass } from '@/lib/native-select';
import {
  CATEGORY_LABELS,
  SKILL_VERIFICATION_DIAGNOSTIC_PROFICIENCY,
  SOFTWARE_IT_DOMAIN_LABEL,
  skillsForCategory,
  viewForFocus,
} from '../../lib/skill-declarations';
import { CATEGORY_OPTIONS } from '../../lib/skills-catalog';

function emptyFoci(codes: readonly string[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const code of codes) {
    const options = skillFocusOptions(code);
    if (options[0]) next[code] = options[0];
  }
  return next;
}

export function SkillsSection() {
  const router = useRouter();
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [domain, setDomain] = useState<'SOFTWARE_IT'>('SOFTWARE_IT');
  const [categoryId, setCategoryId] = useState<SkillCategoryId>('PROGRAMMING_LANGUAGES');
  const [foci, setFoci] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshClaims = useCallback(async () => {
    const rows = await api.assessment.listSkillClaims();
    setClaims(rows);
    return rows;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await api.assessment.listSkillClaims();
        if (!cancelled) setClaims(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load skill claims.');
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categorySkills = useMemo(() => skillsForCategory(categoryId), [categoryId]);

  useEffect(() => {
    setFoci((prev) => {
      const next = emptyFoci(categorySkills.map((skill) => skill.code));
      for (const skill of categorySkills) {
        const options = skillFocusOptions(skill.code);
        next[skill.code] = prev[skill.code] ?? options[0] ?? '';
      }
      return next;
    });
  }, [categorySkills]);

  const claimByCode = useMemo(() => new Map(claims.map((row) => [row.skillCode, row])), [claims]);

  const verifySkill = (skillCode: string) => {
    setError(null);
    setPendingCode(skillCode);
    startTransition(() => {
      void (async () => {
        try {
          let claim = claimByCode.get(skillCode);
          if (!claim || claim.status === 'DECLARED' || claim.status === 'BEGINNER_REATTEMPT') {
            claim = await api.assessment.declareSkillClaim({
              skillCode,
              proficiency: SKILL_VERIFICATION_DIAGNOSTIC_PROFICIENCY,
              skillFocus: foci[skillCode] || undefined,
            });
            await refreshClaims();
          }
          const view = viewForFocus(claim, skillCode, foci[skillCode]);
          if (view.blockMessage && !view.canStart) {
            setError(view.blockMessage);
            return;
          }
          if (!view.hasForm || !claim) {
            setError('This skill does not have a verification challenge yet.');
            return;
          }
          router.push(`/assessments/skills/${claim.claimId}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not start verification.');
        } finally {
          setPendingCode(null);
        }
      })();
    });
  };

  if (!hydrated) {
    return (
      <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">
        Loading skills…
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-8" aria-labelledby="skills-heading">
      <div>
        <h2 id="skills-heading" className="text-xl font-semibold tracking-tight">
          Skills
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
          Choose a category and focus area, then start verification. For the full skill catalog with
          search and status filters, use the Skill Repository.
        </p>
        <Link
          href="/assessments"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#00967c] hover:underline"
        >
          Open Skill Repository
        </Link>
      </div>

      <SkillVerificationInstructions />

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-gray-900">Domain</span>
            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value as 'SOFTWARE_IT')}
              className={`${nativeSelectClass} py-2`}
              aria-label="Domain"
            >
              <option value="SOFTWARE_IT" className={nativeOptionClass}>
                {SOFTWARE_IT_DOMAIN_LABEL}
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-gray-900">Category</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value as SkillCategoryId)}
              className={`${nativeSelectClass} py-2`}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id} className={nativeOptionClass}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            {CATEGORY_LABELS[categoryId]} skills
          </h3>
          <ul className="flex flex-col gap-2">
            <li className="hidden px-3 text-[11px] font-semibold tracking-wider text-gray-400 uppercase lg:grid lg:grid-cols-[minmax(12rem,1.5fr)_8.5rem_10rem_8.5rem] lg:gap-3">
              <span>Skill</span>
              <span className="text-center">Status</span>
              <span>Focus</span>
              <span>Action</span>
            </li>
            {categorySkills.map((skill) => {
              const claim = claimByCode.get(skill.code);
              const busy = pendingCode === skill.code;
              return (
                <SkillVerifyRow
                  key={skill.code}
                  skillCode={skill.code}
                  skillName={skill.name}
                  claim={claim}
                  focus={foci[skill.code] ?? ''}
                  onFocus={(value: string) => setFoci((prev) => ({ ...prev, [skill.code]: value }))}
                  onVerify={() => verifySkill(skill.code)}
                  pending={busy || isPending}
                />
              );
            })}
          </ul>
        </div>
      </div>

      {error ? (
        <Alert tone="danger" title="Error">
          {error}
        </Alert>
      ) : null}
    </section>
  );
}
