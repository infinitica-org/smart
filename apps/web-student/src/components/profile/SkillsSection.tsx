'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  type SkillClaimDto,
  type SkillProficiency,
  type SkillStream,
  skillFocusOptions,
} from '@smart/contracts';
import { Alert } from '@smart/ui';
import { api } from '../../lib/api';
import { SkillVerifyRow } from '../assessment/skill-verify-row';
import { nativeOptionClass, nativeSelectClass } from '@/lib/native-select';
import {
  SOFTWARE_IT_DOMAIN_LABEL,
  STREAM_LABELS,
  mandatorySkillsForStream,
  viewForFocus,
} from '../../lib/skill-declarations';

const STREAM_OPTIONS = Object.keys(STREAM_LABELS) as SkillStream[];

function emptyFoci(codes: readonly string[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const code of codes) {
    const options = skillFocusOptions(code);
    if (options[0]) next[code] = options[0];
  }
  return next;
}

function emptyProficiencies(codes: readonly string[]): Record<string, SkillProficiency> {
  const next: Record<string, SkillProficiency> = {};
  for (const code of codes) next[code] = 'BEGINNER';
  return next;
}

export function SkillsSection() {
  const router = useRouter();
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [domain, setDomain] = useState<'SOFTWARE_IT'>('SOFTWARE_IT');
  const [stream, setStream] = useState<SkillStream>('SOFTWARE_DEVELOPMENT');
  const [proficiencies, setProficiencies] = useState<Record<string, SkillProficiency>>({});
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

  const mandatorySkills = useMemo(() => mandatorySkillsForStream(stream), [stream]);

  useEffect(() => {
    const claimed = new Map(claims.map((row) => [row.skillCode, row]));
    setProficiencies((prev) => {
      const next = emptyProficiencies(mandatorySkills.map((skill) => skill.code));
      for (const skill of mandatorySkills) {
        next[skill.code] = claimed.get(skill.code)?.proficiency ?? prev[skill.code] ?? 'BEGINNER';
      }
      return next;
    });
    setFoci((prev) => {
      const next = emptyFoci(mandatorySkills.map((skill) => skill.code));
      for (const skill of mandatorySkills) {
        const options = skillFocusOptions(skill.code);
        next[skill.code] = prev[skill.code] ?? options[0] ?? '';
      }
      return next;
    });
  }, [mandatorySkills, claims]);

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
              proficiency: proficiencies[skillCode] ?? 'BEGINNER',
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
            setError('This skill does not have a verification assessment yet.');
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
          Choose your domain and stream, set a proficiency and focus, then verify. Cooldown applies
          only to the focus you sat, not every sub-skill.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Domain</span>
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
            <span className="font-medium">Stream</span>
            <select
              value={stream}
              onChange={(e) => setStream(e.target.value as SkillStream)}
              className={`${nativeSelectClass} py-2`}
            >
              {STREAM_OPTIONS.map((key) => (
                <option key={key} value={key} className={nativeOptionClass}>
                  {STREAM_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Required skills</h3>
          <ul className="flex flex-col gap-2">
            <li className="hidden px-3 text-[11px] font-medium tracking-wide text-[var(--text-secondary)] uppercase lg:grid lg:grid-cols-[minmax(12rem,1.5fr)_8.5rem_9rem_10rem_8.5rem] lg:gap-3">
              <span>Skill</span>
              <span className="text-center">Status</span>
              <span>Proficiency</span>
              <span>Focus</span>
              <span>Action</span>
            </li>
            {mandatorySkills.map((skill) => {
              const claim = claimByCode.get(skill.code);
              const focusOptions = skillFocusOptions(skill.code);
              const busy = pendingCode === skill.code;
              return (
                <SkillVerifyRow
                  key={skill.code}
                  skillCode={skill.code}
                  skillName={skill.name}
                  claim={claim}
                  proficiency={proficiencies[skill.code] ?? 'BEGINNER'}
                  focus={foci[skill.code] ?? focusOptions[0] ?? ''}
                  pending={busy || (isPending && pendingCode === skill.code)}
                  onProficiency={(value) =>
                    setProficiencies((prev) => ({ ...prev, [skill.code]: value }))
                  }
                  onFocus={(value) => setFoci((prev) => ({ ...prev, [skill.code]: value }))}
                  onVerify={() => verifySkill(skill.code)}
                />
              );
            })}
          </ul>
        </div>

        {error ? (
          <Alert tone="danger" title="Could not verify">
            {error}
          </Alert>
        ) : null}
      </div>
    </section>
  );
}
