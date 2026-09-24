'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react';
import type {
  DemonstrationState,
  IdentityStatus,
  EvidenceRequirementKind,
  OpeningReadiness,
  OpeningSkillStatus,
  ReadinessEvidence,
  ReadinessIdentity,
  ReadinessProficiency,
  ReadinessRecommendation,
  ReadinessRole,
  ReadinessSkillDemonstration,
} from '@smart/contracts';

const IDENTITY_LABEL: Record<IdentityStatus, string> = {
  NOT_STARTED: 'Not started',
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  FAILED: 'Failed',
};

const DEMONSTRATION_LABEL: Record<DemonstrationState, string> = {
  DEMONSTRATED: 'Demonstrated',
  PROVISIONAL: 'Provisional',
  NOT_DEMONSTRATED: 'Not demonstrated',
};

const DEMONSTRATION_CLASS: Record<DemonstrationState, string> = {
  DEMONSTRATED:
    'border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  PROVISIONAL:
    'border-amber-200/90 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  NOT_DEMONSTRATED:
    'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

function titleCase(value: string): string {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Card({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <section
      data-testid={testId}
      className="rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]"
    >
      <h2 className="font-heading text-base font-bold tracking-tight text-zinc-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-zinc-500 dark:text-zinc-400">{children}</p>;
}

function DemonstrationBadge({ state }: { state: DemonstrationState }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${DEMONSTRATION_CLASS[state]}`}
    >
      {DEMONSTRATION_LABEL[state]}
    </span>
  );
}

export function IdentityCard({ identity }: { identity: ReadinessIdentity }) {
  return (
    <Card title="Identity verification" testId="identity-card">
      <p className="text-sm font-bold text-zinc-950 dark:text-white">
        {IDENTITY_LABEL[identity.status]}
      </p>
      <ul className="mt-3 space-y-1.5">
        {identity.signals.map((signal) => (
          <li key={signal.code} className="flex items-center gap-2 text-xs">
            {signal.verified ? (
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
            ) : (
              <CircleDashed className="size-4 text-zinc-400" aria-hidden />
            )}
            <span className="text-zinc-700 dark:text-zinc-300">{titleCase(signal.code)}</span>
            <span className="text-zinc-400">{signal.verified ? 'verified' : 'not verified'}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <Note>{identity.rule}</Note>
      </div>
    </Card>
  );
}

const REQUIREMENT_LABEL: Record<EvidenceRequirementKind, string> = {
  REAL_WORLD_APPLICATION: 'Real-world project or work experience',
  SUBSTANTIAL_APPLICATION: 'Substantial project',
};

export function EvidenceCard({ evidence }: { evidence: ReadinessEvidence }) {
  const { counts, completeness } = evidence;
  return (
    <Card title="Evidence completeness" testId="evidence-card">
      {completeness && completeness.required > 0 ? (
        <p className="text-sm font-bold text-zinc-950 dark:text-white">
          {completeness.available} / {completeness.required} required items ({completeness.percent}
          %)
        </p>
      ) : completeness ? (
        <p className="text-sm font-bold text-zinc-950 dark:text-white">Nothing missing</p>
      ) : (
        <p className="text-sm font-bold text-zinc-950 dark:text-white">Not calculated yet</p>
      )}
      {evidence.reason ? (
        <div className="mt-1">
          <Note>{evidence.reason}</Note>
        </div>
      ) : null}

      {evidence.requirements.length > 0 ? (
        <ul className="mt-3 space-y-1.5" aria-label="Required evidence">
          {evidence.requirements.map((req) => (
            <li
              key={`${req.skillCode}-${req.requirement}`}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                {req.skillName} ({titleCase(req.level)}): {REQUIREMENT_LABEL[req.requirement]}
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                  req.met
                    ? DEMONSTRATION_CLASS.DEMONSTRATED
                    : 'border-rose-200/90 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {req.met ? 'Present' : 'Missing'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {counts.total === 0 ? (
        <div className="mt-3">
          <Note>You have no evidence yet. Add a project or work experience to get started.</Note>
        </div>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          {(
            [
              ['Total', counts.total],
              ['Verified', counts.verified],
              ['Provisional', counts.provisional],
              ['Pending', counts.pending],
              ['Disputed or rejected', counts.disputedOrRejected],
              ['Expired', counts.expired],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
              <dd className="font-semibold text-zinc-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

export function SkillDemonstrationCard({
  demonstration,
}: {
  demonstration: ReadinessSkillDemonstration;
}) {
  return (
    <Card title="Skill demonstration" testId="demonstration-card">
      {demonstration.skills.length === 0 ? (
        <Note>You have not selected any skills yet.</Note>
      ) : (
        <ul className="space-y-2">
          {demonstration.skills.map((skill) => (
            <li
              key={skill.skillCode}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                  {skill.skillName}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {skill.proficiency
                    ? `Proficiency: ${titleCase(skill.proficiency)}`
                    : 'Proficiency: not verified yet'}
                  {skill.evidenceUndisclosable ? ' · Evidence under NDA' : ''}
                </p>
              </div>
              <DemonstrationBadge state={skill.demonstration} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Proficiency is shown on its own, apart from evidence completeness. */
export function ProficiencyCard({ proficiency }: { proficiency: ReadinessProficiency }) {
  const levels = Object.entries(proficiency.byLevel);
  return (
    <Card title="Proficiency" testId="proficiency-card">
      <p className="text-sm font-bold text-zinc-950 dark:text-white">
        {proficiency.verifiedSkillCount} verified · {proficiency.declaredSkillCount} not yet
        verified
      </p>
      {levels.length === 0 ? (
        <div className="mt-2">
          <Note>No verified proficiency yet.</Note>
        </div>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {levels.map(([level, count]) => (
            <li
              key={level}
              className="rounded-md border border-zinc-200 px-2 py-0.5 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              {titleCase(level)}: {count}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RoleReadinessCard({ role }: { role: ReadinessRole }) {
  return (
    <Card title="Role readiness" testId="role-card">
      {role.targetRole ? (
        <p className="text-sm font-bold text-zinc-950 dark:text-white">{role.targetRole.name}</p>
      ) : null}
      <p className="mt-1 text-sm font-bold text-zinc-950 dark:text-white">
        {role.readinessPercent !== null ? `${role.readinessPercent}% ready` : 'Not calculated yet'}
      </p>
      {role.reason ? (
        <div className="mt-1">
          <Note>{role.reason}</Note>
        </div>
      ) : null}

      {role.coverage ? (
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
          Recommended skills verified: {role.coverage.recommendedVerified} of{' '}
          {role.coverage.recommendedTotal} · demonstrated: {role.coverage.recommendedDemonstrated}{' '}
          of {role.coverage.recommendedTotal}
        </p>
      ) : null}

      {role.skills.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {role.skills.map((skill) => (
            <li
              key={skill.skillCode}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                  {skill.skillName}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {skill.requirement === 'OPTIONAL'
                    ? 'Optional · does not affect your readiness'
                    : 'Recommended'}
                  {skill.selected ? '' : ' · not added'}
                </p>
              </div>
              <DemonstrationBadge state={skill.demonstration} />
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

const PRIORITY_CLASS: Record<ReadinessRecommendation['priority'], string> = {
  HIGH: 'text-rose-700 dark:text-rose-300',
  MEDIUM: 'text-amber-700 dark:text-amber-300',
  LOW: 'text-zinc-500 dark:text-zinc-400',
};

export function RecommendationsCard({
  recommendations,
}: {
  recommendations: ReadinessRecommendation[];
}) {
  return (
    <Card title="Recommended next steps" testId="recommendations-card">
      {recommendations.length === 0 ? (
        <Note>Nothing to recommend right now. Your evidence has no known gaps.</Note>
      ) : (
        <ul className="space-y-2">
          {recommendations.map((rec) => (
            <li key={rec.id}>
              <Link
                href={rec.href}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2.5 hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                    {rec.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{rec.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`text-[10px] font-bold ${PRIORITY_CLASS[rec.priority]}`}>
                    {rec.optional ? 'Optional' : titleCase(rec.priority)}
                  </span>
                  <ArrowRight className="size-3.5 text-zinc-400" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const OPENING_STATUS_LABEL: Record<OpeningSkillStatus, string> = {
  MEETS_MINIMUM: 'Meets minimum',
  BELOW_MINIMUM: 'Below minimum',
  NOT_VERIFIED: 'Not verified',
  NOT_HELD: 'Not added',
};

/** Readiness for open roles, using the employer-defined minimum proficiency on each. */
export function OpeningReadinessCard({ openings }: { openings: OpeningReadiness[] }) {
  return (
    <Card title="Readiness for open roles" testId="openings-card">
      {openings.length === 0 ? (
        <Note>No open roles with required skills at your institution right now.</Note>
      ) : (
        <ul className="space-y-4">
          {openings.map((opening) => (
            <li key={opening.openingId} data-testid="opening-readiness">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-950 dark:text-white">
                    {opening.roleTitle}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {[opening.companyName, opening.location].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-zinc-950 dark:text-white">
                  {opening.readinessPercent !== null
                    ? `${opening.readinessPercent}% ready`
                    : 'Not calculated'}
                </p>
              </div>
              {opening.reason ? (
                <div className="mt-1">
                  <Note>{opening.reason}</Note>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {opening.readyCount} of {opening.requiredCount} required skills ready
                </p>
              )}
              {opening.skills.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {opening.skills.map((skill) => (
                    <li
                      key={skill.skillCode}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                          {skill.skillName}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Needs {titleCase(skill.minProficiency)} ·{' '}
                          {OPENING_STATUS_LABEL[skill.status]}
                          {skill.evidenceRequired > 0
                            ? ` · Evidence ${skill.evidenceMet}/${skill.evidenceRequired}`
                            : ''}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                          skill.ready
                            ? DEMONSTRATION_CLASS.DEMONSTRATED
                            : DEMONSTRATION_CLASS.NOT_DEMONSTRATED
                        }`}
                      >
                        {skill.ready ? 'Ready' : 'Not ready'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
