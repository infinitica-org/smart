'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Search } from 'lucide-react';
import {
  SKILL_DEFINITIONS,
  skillFocusOptions,
  type SkillCategoryId,
  type SkillClaimDto,
} from '@smart/contracts';
import { Alert } from '@smart/ui';

import { api } from '@/lib/api';
import {
  SKILL_VERIFICATION_DIAGNOSTIC_PROFICIENCY,
  skillNameForCode,
} from '@/lib/skill-declarations';
import { CATEGORY_OPTIONS } from '@/lib/skills-catalog';
import {
  profileCardClass,
  profileHeadingClass,
  profileMutedTextClass,
  profilePrimaryButtonSmClass,
  profileSecondaryButtonClass,
  profileSecondaryTextClass,
} from '@/lib/profile-ui-classes';

type CategoryFilter = SkillCategoryId | 'ALL';

export function SkillsSection() {
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
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
        await refreshClaims();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load skills.');
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshClaims]);

  const claimByCode = useMemo(() => new Map(claims.map((row) => [row.skillCode, row])), [claims]);

  const selectedClaims = useMemo(
    () =>
      [...claims].sort((a, b) =>
        skillNameForCode(a.skillCode).localeCompare(skillNameForCode(b.skillCode)),
      ),
    [claims],
  );

  const availableSkills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SKILL_DEFINITIONS.filter((skill) => {
      if (category !== 'ALL' && skill.categoryId !== category) return false;
      if (!q) return true;
      return (
        skill.name.toLowerCase().includes(q) ||
        skill.code.toLowerCase().includes(q) ||
        skill.categoryName.toLowerCase().includes(q)
      );
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [category, search]);

  const toggleSkill = (skillCode: string, selected: boolean) => {
    if (selected) return;
    setError(null);
    setPendingCode(skillCode);
    startTransition(() => {
      void (async () => {
        try {
          const options = skillFocusOptions(skillCode);
          await api.assessment.declareSkillClaim({
            skillCode,
            proficiency: SKILL_VERIFICATION_DIAGNOSTIC_PROFICIENCY,
            skillFocus: options[0] || undefined,
          });
          await refreshClaims();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not select skill.');
        } finally {
          setPendingCode(null);
        }
      })();
    });
  };

  if (!hydrated) {
    return (
      <p className={`text-sm ${profileMutedTextClass}`} aria-live="polite">
        Loading skills…
      </p>
    );
  }

  return (
    <section className="space-y-8" aria-labelledby="skills-heading">
      <div>
        <h2
          id="skills-heading"
          className={`text-xl font-semibold tracking-tight ${profileHeadingClass}`}
        >
          Skills
        </h2>
        <p className={`mt-1 max-w-2xl text-sm leading-relaxed ${profileMutedTextClass}`}>
          Choose the skills you want to assess and build verified credentials for. Selected skills
          appear on your Assessment page.
        </p>
      </div>

      {selectedClaims.length > 0 ? (
        <div className="space-y-3">
          <h3
            className={`text-sm font-semibold uppercase tracking-[0.12em] ${profileMutedTextClass}`}
          >
            My selected skills
          </h3>
          <ul className="flex flex-wrap gap-2">
            {selectedClaims.map((claim) => (
              <li
                key={claim.claimId}
                className="inline-flex items-center rounded-full border border-[var(--student-success-border)] bg-[var(--student-accent-soft)] px-3 py-1 text-sm font-medium text-[var(--student-text-primary)]"
              >
                {skillNameForCode(claim.skillCode)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={`${profileCardClass} space-y-5 !p-5 md:!p-6`}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ds-text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search skills…"
            className="w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:border-[var(--ds-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-green)]/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory('ALL')}
            className={
              category === 'ALL'
                ? profilePrimaryButtonSmClass
                : `${profileSecondaryButtonClass} !py-1.5 !text-xs`
            }
          >
            All
          </button>
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setCategory(option.id)}
              className={
                category === option.id
                  ? profilePrimaryButtonSmClass
                  : `${profileSecondaryButtonClass} !py-1.5 !text-xs`
              }
            >
              {option.name}
            </button>
          ))}
        </div>

        <div>
          <h3 className={`mb-3 text-sm font-semibold ${profileHeadingClass}`}>Available skills</h3>
          <ul className="divide-y divide-[var(--ds-border)] rounded-xl border border-[var(--ds-border)]">
            {availableSkills.map((skill) => {
              const selected = claimByCode.has(skill.code);
              const busy = pendingCode === skill.code && isPending;
              return (
                <li
                  key={skill.code}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className={`font-medium ${profileHeadingClass}`}>{skill.name}</p>
                    <p className={`text-xs ${profileSecondaryTextClass}`}>{skill.categoryName}</p>
                  </div>
                  <button
                    type="button"
                    disabled={selected || busy}
                    onClick={() => toggleSkill(skill.code, selected)}
                    className={`${selected ? profileSecondaryButtonClass : profilePrimaryButtonSmClass} shrink-0 disabled:opacity-60`}
                  >
                    {busy ? 'Saving…' : selected ? 'Selected' : 'Select'}
                  </button>
                </li>
              );
            })}
          </ul>
          {availableSkills.length === 0 ? (
            <p className={`mt-3 text-sm ${profileMutedTextClass}`}>No skills match your search.</p>
          ) : null}
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
