'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { type ProficiencyLevel, type SkillStream } from '@smart/contracts';
import { Alert, Button, VerificationBadge } from '@smart/ui';
import {
  PROFICIENCY_LABELS,
  PROFICIENCY_OPTIONS,
  STREAM_LABELS,
  SOFTWARE_IT_DOMAIN_LABEL,
  createDeclarations,
  loadSkillDeclarations,
  queueSkillVerification,
  saveSkillDeclarations,
  skillsForStream,
  type DeclaredSkill,
  type SkillVerificationStatus,
} from '../../lib/skill-declarations';

const STREAM_OPTIONS = Object.keys(STREAM_LABELS) as SkillStream[];

function badgeStatus(status: SkillVerificationStatus): string {
  return status;
}

function formatCooldown(lockedUntil?: string): string | null {
  if (!lockedUntil) return null;
  const parsed = new Date(`${lockedUntil}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return lockedUntil;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function SkillsSection() {
  const [skills, setSkills] = useState<DeclaredSkill[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [stream, setStream] = useState<SkillStream>('UNIVERSAL');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('BEGINNER');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSkills(loadSkillDeclarations());
    setHydrated(true);
  }, []);

  const availableSkills = useMemo(() => skillsForStream(stream), [stream]);
  const declaredCodes = useMemo(() => new Set(skills.map((s) => s.skillCode)), [skills]);

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
      const { next, created } = createDeclarations({
        skillCodes: selectedCodes,
        proficiency,
        existing: skills,
      });

      if (created.length === 0) {
        setError('Those skills are already on your profile.');
        return;
      }

      setSkills(next);
      saveSkillDeclarations(next);
      setSelectedCodes([]);
      setNotice(
        created.length === 1
          ? `${created[0]?.skillName ?? 'Skill'} declared — verification queued.`
          : `${String(created.length)} skills declared — verification queued.`,
      );

      // SE-T01: enqueue each new declaration; UI stays Declared until verification starts.
      for (const skill of created) {
        void queueSkillVerification(skill.id);
      }
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
          Declare skills from the Software &amp; IT taxonomy (INF-05). Each declaration shows a live
          verification badge and queues SE-T01 verification.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Domain</span>
            <select
              className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5"
              value="SOFTWARE_IT"
              disabled
              aria-readonly="true"
            >
              <option value="SOFTWARE_IT">{SOFTWARE_IT_DOMAIN_LABEL}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Stream</span>
            <select
              className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5"
              value={stream}
              onChange={(e) => {
                setStream(e.target.value as SkillStream);
                setSelectedCodes([]);
              }}
            >
              {STREAM_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {STREAM_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Skills in this stream</legend>
          <p className="text-xs text-[var(--text-secondary)]">
            Select one or more skills, then choose a proficiency and declare.
          </p>
          <ul className="mt-1 grid gap-2 sm:grid-cols-2">
            {availableSkills.map((skill) => {
              const already = declaredCodes.has(skill.code);
              const checked = selectedCodes.includes(skill.code);
              return (
                <li key={skill.code}>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                      already
                        ? 'cursor-not-allowed border-[var(--surface-border)] opacity-50'
                        : checked
                          ? 'border-brand-600 bg-brand-600/5'
                          : 'border-[var(--surface-border)] bg-[var(--surface-muted)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      disabled={already}
                      checked={checked}
                      onChange={() => toggleCode(skill.code)}
                    />
                    <span>
                      <span className="font-medium">{skill.name}</span>
                      {already ? (
                        <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                          Already declared
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <label className="flex max-w-xs flex-col gap-1.5 text-sm">
          <span className="font-medium">Proficiency</span>
          <select
            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5"
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value as ProficiencyLevel)}
          >
            {PROFICIENCY_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {PROFICIENCY_LABELS[level]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={declareSelected} disabled={isPending}>
            Declare selected
          </Button>
          {selectedCodes.length > 0 ? (
            <span className="text-xs text-[var(--text-secondary)]">
              {String(selectedCodes.length)} selected
            </span>
          ) : null}
        </div>

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
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Your declared skills</h3>
        {skills.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No skills declared yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--surface-border)] rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)]">
            {skills.map((skill) => {
              const cooldown = formatCooldown(skill.lockedUntil);
              return (
                <li
                  key={skill.id}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{skill.skillName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {SOFTWARE_IT_DOMAIN_LABEL} · {STREAM_LABELS[skill.stream]}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {PROFICIENCY_LABELS[skill.proficiency]}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <VerificationBadge status={badgeStatus(skill.verificationStatus)} />
                    {skill.verificationStatus === 'LOCKED' && cooldown ? (
                      <span className="text-xs text-[var(--text-secondary)]">
                        Cooldown until {cooldown}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
