'use client';

import { useState, type ReactNode } from 'react';
import {
  COMPETENCY_GAP_DEMONSTRATION_LEVEL,
  competencyDemonstrationLevel,
  proficiencyLevelNumber,
  proficiencyLevelUiLabel,
  type CapabilityFitRow,
  type CandidateMatchDto,
  type SkillFitRow,
  type VerifiedSkillSummary,
} from '@smart/contracts';
import { Rocket, Sparkles } from 'lucide-react';
import { ProficiencyLevelCircles, ProficiencyLevelLegend } from './proficiency-level-ui';
import { sectionLabelClass, mutedTextClass, cardClass } from '../../lib/tpo-ui';
import { EmployerSkillInspectionPanel } from './EmployerSkillInspectionPanel';

type GapTab = 'skills' | 'competencies';

function countSkillGaps(rows: readonly SkillFitRow[]): number {
  return rows.filter((row) => row.status !== 'MET').length;
}

function countCompetencyGaps(rows: readonly CapabilityFitRow[]): number {
  return rows.filter((row) => row.hitScore < 0.5).length;
}

function otherVerifiedSkills(
  required: readonly SkillFitRow[],
  verified: readonly VerifiedSkillSummary[] | undefined,
): VerifiedSkillSummary[] {
  const requiredCodes = new Set(required.map((row) => row.skillCode));
  return (verified ?? []).filter((skill) => !requiredCodes.has(skill.skillCode));
}

function RequirementSkillRow({ row, onInspect }: { row: SkillFitRow; onInspect?: () => void }) {
  const required = proficiencyLevelNumber(row.requiredProficiency);
  const actual = row.actualProficiency ? proficiencyLevelNumber(row.actualProficiency) : 0;
  const met = row.status === 'MET';

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--ds-text)]">{row.skillName}</p>
        <span
          className={[
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            met ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800',
          ].join(' ')}
        >
          {met ? 'Meets opening' : row.status === 'MISSING' ? 'Not verified' : 'Partial'}
        </span>
      </div>
      <p className={`text-xs ${mutedTextClass}`}>
        Opening requires {proficiencyLevelUiLabel(row.requiredProficiency)}
        {row.actualProficiency
          ? ` · Candidate verified at ${proficiencyLevelUiLabel(row.actualProficiency)}`
          : ' · No verified level on profile'}
      </p>
      <ProficiencyLevelCircles actualLevel={actual} requiredLevel={required} />
      {onInspect ? (
        <button
          type="button"
          onClick={onInspect}
          className="mt-1 text-xs font-semibold text-[var(--ds-green)] hover:underline"
        >
          Inspect skill evidence
        </button>
      ) : null}
    </li>
  );
}

function OtherSkillRow({ skill }: { skill: VerifiedSkillSummary }) {
  const actual = proficiencyLevelNumber(skill.proficiency);
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-3">
      <p className="text-sm font-medium text-[var(--ds-text)]">{skill.skillName}</p>
      <p className={`text-xs ${mutedTextClass}`}>
        Verified at {proficiencyLevelUiLabel(skill.proficiency)} — not listed as required on this
        opening
      </p>
      <ProficiencyLevelCircles actualLevel={actual} requiredLevel={actual} mode="verified-only" />
    </li>
  );
}

function RequirementCompetencyRow({ row }: { row: CapabilityFitRow }) {
  const actual = competencyDemonstrationLevel(row.hitScore);
  const required = COMPETENCY_GAP_DEMONSTRATION_LEVEL;
  const met = row.hitScore >= 0.5;

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--ds-text)]">{row.capability}</p>
        <span
          className={[
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            met ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800',
          ].join(' ')}
        >
          {met ? 'Demonstrated' : 'Gap'}
        </span>
      </div>
      <p className={`text-xs ${mutedTextClass}`}>
        Opening expects demonstration through level {required} (from assessment / evidence signals)
      </p>
      <ProficiencyLevelCircles actualLevel={actual} requiredLevel={required} />
    </li>
  );
}

function GapTabButton({
  active,
  onClick,
  label,
  gapCount,
  total,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  gapCount: number;
  total: number;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`View ${label}`}
      className={[
        `${cardClass} flex w-full items-center gap-3 p-4 text-left transition`,
        active
          ? 'border-[var(--tpo-accent-border)] ring-2 ring-[var(--tpo-accent)]/30'
          : 'hover:border-[var(--ds-border-hover)]',
      ].join(' ')}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)]">
        {icon}
      </span>
      <div>
        <p className={sectionLabelClass}>{label}</p>
        <p className="text-2xl font-bold tabular-nums text-[var(--ds-text)]">
          {gapCount}/{total || gapCount}
        </p>
        <p className={`mt-0.5 text-[11px] ${mutedTextClass}`}>
          {active ? 'Showing below' : 'Click to view'}
        </p>
      </div>
    </button>
  );
}

export function CandidateSkillGapPanel({
  candidate,
  roleTitle,
  variant = 'inline',
}: {
  candidate: CandidateMatchDto;
  roleTitle: string;
  variant?: 'inline' | 'drawer';
}) {
  const skillFit = candidate.explanation.skillFit ?? [];
  const capabilityFit = candidate.explanation.capabilityFit ?? [];
  const verifiedSkills = candidate.explanation.verifiedSkills;
  const skillGapCount = countSkillGaps(skillFit);
  const competencyGapCount = countCompetencyGaps(capabilityFit);
  const otherSkills = otherVerifiedSkills(skillFit, verifiedSkills);

  const hasSkills = skillFit.length > 0 || otherSkills.length > 0;
  const hasCompetencies = capabilityFit.length > 0;

  const [tab, setTab] = useState<GapTab>(
    hasSkills ? 'skills' : hasCompetencies ? 'competencies' : 'skills',
  );
  const [inspectSkillCode, setInspectSkillCode] = useState<string | null>(null);
  const inspectSkillName =
    skillFit.find((row) => row.skillCode === inspectSkillCode)?.skillName ?? inspectSkillCode;

  if (!hasSkills && !hasCompetencies) {
    return null;
  }

  const sectionClass =
    variant === 'drawer'
      ? 'flex flex-col gap-5'
      : 'flex flex-col gap-5 border-t border-[var(--ds-border-subtle)] pt-4';

  return (
    <section aria-label="Candidate skill gap" className={sectionClass}>
      {variant === 'inline' ? (
        <h3 className="text-sm font-semibold text-[var(--ds-text)]">Match gap summary</h3>
      ) : (
        <ProficiencyLevelLegend />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <GapTabButton
          active={tab === 'competencies'}
          onClick={() => setTab('competencies')}
          label="Competency gap"
          gapCount={competencyGapCount}
          total={capabilityFit.length}
          icon={<Sparkles className="size-5 text-rose-600" aria-hidden />}
        />
        <GapTabButton
          active={tab === 'skills'}
          onClick={() => setTab('skills')}
          label="Skill gap"
          gapCount={skillGapCount}
          total={skillFit.length}
          icon={<Rocket className="size-5 text-sky-700" aria-hidden />}
        />
      </div>

      {tab === 'skills' ? (
        <div className="flex flex-col gap-6">
          {skillFit.length > 0 ? (
            <div>
              <p className={`mb-3 text-sm font-semibold text-[var(--ds-text)]`}>
                Skills required by this opening
              </p>
              <p className={`mb-3 text-xs ${mutedTextClass}`}>
                Parsed from the job description for {roleTitle}. Green circles show verified levels
                through what the role requires.
              </p>
              <ul className="flex flex-col gap-3">
                {skillFit.map((row) => (
                  <RequirementSkillRow
                    key={row.skillCode}
                    row={row}
                    onInspect={() => setInspectSkillCode(row.skillCode)}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <p className={`text-sm ${mutedTextClass}`}>
              No taxonomy skills were attached to this opening for matching.
            </p>
          )}

          {inspectSkillCode && inspectSkillName ? (
            <EmployerSkillInspectionPanel
              studentId={candidate.studentId}
              skillCode={inspectSkillCode}
              skillName={inspectSkillName}
            />
          ) : null}

          {otherSkills.length > 0 ? (
            <div>
              <p className={`mb-3 text-sm font-semibold text-[var(--ds-text)]`}>
                Other verified skills on profile
              </p>
              <p className={`mb-3 text-xs ${mutedTextClass}`}>
                Relevant strengths not listed as hard requirements on the JD — useful context for
                the employer pitch.
              </p>
              <ul className="flex flex-col gap-3">
                {otherSkills.map((skill) => (
                  <OtherSkillRow key={skill.skillCode} skill={skill} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {capabilityFit.length > 0 ? (
            <div>
              <p className={`mb-3 text-sm font-semibold text-[var(--ds-text)]`}>
                Competencies required by this opening
              </p>
              <p className={`mb-3 text-xs ${mutedTextClass}`}>
                Role capabilities inferred from the JD. Green circles show demonstrated depth;
                dashed circles are still expected for this role.
              </p>
              <ul className="flex flex-col gap-3">
                {capabilityFit.map((row) => (
                  <RequirementCompetencyRow key={row.competencyId} row={row} />
                ))}
              </ul>
            </div>
          ) : (
            <p className={`text-sm ${mutedTextClass}`}>
              No competency emphasis was parsed for this opening.
            </p>
          )}

          {otherSkills.length > 0 ? (
            <div>
              <p className={`mb-3 text-sm font-semibold text-[var(--ds-text)]`}>
                Other verified skills (supporting evidence)
              </p>
              <p className={`mb-3 text-xs ${mutedTextClass}`}>
                Same verified skills as on the Skill gap tab — shown here for competency review
                context.
              </p>
              <ul className="flex flex-col gap-3">
                {otherSkills.map((skill) => (
                  <OtherSkillRow key={skill.skillCode} skill={skill} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
