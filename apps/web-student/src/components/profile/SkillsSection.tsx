'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { type SkillClaimDto, type SkillProficiency, type SkillStream } from '@smart/contracts';
import { Alert, Button, VerificationBadge } from '@smart/ui';
import { api } from '../../lib/api';
import {
  PROFICIENCY_LABELS,
  PROFICIENCY_OPTIONS,
  SOFTWARE_IT_DOMAIN_LABEL,
  STREAM_LABELS,
  buildDeclareSkillClaimRequest,
  claimToBadgeStatus,
  formatCooldown,
  skillNameForCode,
  skillsForStream,
} from '../../lib/skill-declarations';

const STREAM_OPTIONS = Object.keys(STREAM_LABELS) as SkillStream[];

export function SkillsSection() {
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [stream, setStream] = useState<SkillStream>('UNIVERSAL');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [proficiency, setProficiency] = useState<SkillProficiency>('BEGINNER');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshClaims = useCallback(async () => {
    const rows = await api.assessment.listSkillClaims();
    setClaims(rows);
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

  const availableSkills = useMemo(() => skillsForStream(stream), [stream]);
  const declaredCodes = useMemo(() => new Set(claims.map((c) => c.skillCode)), [claims]);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const declareSelected = () => {
    setError(null);
    setNotice(null);
    if (selectedCodes.length === 0) {
      setError('Select at least one skill from the taxonomy.');
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const created: SkillClaimDto[] = [];
          for (const skillCode of selectedCodes) {
            if (declaredCodes.has(skillCode)) continue;
            const row = await api.assessment.declareSkillClaim(
              buildDeclareSkillClaimRequest(skillCode, proficiency),
            );
            created.push(row);
          }
          if (created.length === 0) {
            setError('Those skills are already on your profile.');
            return;
          }
          await refreshClaims();
          setSelectedCodes([]);
          setNotice(
            created.length === 1
              ? `${skillNameForCode(created[0]?.skillCode ?? '')} declared.`
              : `${String(created.length)} skills declared.`,
          );
        } catch (err) {
          const issues =
            typeof err === 'object' &&
            err !== null &&
            'issues' in err &&
            Array.isArray((err as { issues: unknown }).issues)
              ? (err as { issues: { message: string }[] }).issues
              : null;
          if (issues?.[0]?.message) {
            setError(issues[0].message);
            return;
          }
          setError(err instanceof Error ? err.message : 'Failed to declare skill.');
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
          Declare skills from the Software &amp; IT taxonomy (INF-05). Declaring writes a SkillClaim
          at Declared and feeds SE-T01 verification.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Domain</span>
            <input
              readOnly
              value={SOFTWARE_IT_DOMAIN_LABEL}
              className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Stream</span>
            <select
              value={stream}
              onChange={(e) => {
                setStream(e.target.value as SkillStream);
                setSelectedCodes([]);
              }}
              className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2"
            >
              {STREAM_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {STREAM_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Skills</legend>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-xl border border-[var(--surface-border)] p-3">
            {availableSkills.map((skill) => {
              const already = declaredCodes.has(skill.code);
              const checked = selectedCodes.includes(skill.code);
              return (
                <label
                  key={skill.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 text-sm ${
                    already ? 'opacity-50' : 'hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    disabled={already || isPending}
                    checked={checked}
                    onChange={() => toggleCode(skill.code)}
                  />
                  <span>
                    <span className="font-medium">{skill.name}</span>
                    {already ? (
                      <span className="ml-2 text-xs text-[var(--text-secondary)]">
                        Already claimed
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="flex max-w-xs flex-col gap-1.5 text-sm">
          <span className="font-medium">Proficiency</span>
          <select
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value as SkillProficiency)}
            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2"
          >
            {PROFICIENCY_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {PROFICIENCY_LABELS[level]}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <Alert tone="danger" title="Could not declare">
            {error}
          </Alert>
        ) : null}
        {notice ? (
          <Alert tone="success" title="Declared">
            {notice}
          </Alert>
        ) : null}

        <div>
          <Button type="button" disabled={isPending} onClick={declareSelected}>
            {isPending ? 'Declaring…' : 'Declare selected'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-[var(--text-secondary)] uppercase">
          Your claims
        </h3>
        {claims.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No skills declared yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {claims.map((claim) => {
              const cooldown = formatCooldown(claim.lockedUntil);
              return (
                <li
                  key={claim.claimId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{skillNameForCode(claim.skillCode)}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {PROFICIENCY_LABELS[claim.proficiency] ?? claim.proficiency}
                      {cooldown ? ` · Locked until ${cooldown}` : null}
                    </p>
                  </div>
                  <VerificationBadge status={claimToBadgeStatus(claim)} variant="outline" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
