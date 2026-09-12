'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Code2,
  Database,
  Globe,
  Layers,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  SKILL_DEFINITIONS,
  skillFocusOptions,
  type SkillClaimDto,
  type SkillDefinition,
  type SkillProficiency,
} from '@smart/contracts';
import { VerificationBadge, cn } from '@smart/ui';
import { api } from '@/lib/api';
import {
  PROFICIENCY_LABELS,
  PROFICIENCY_OPTIONS,
  SKILL_VERIFICATION_PROFILE_UNLOCK_MESSAGE,
  canEnableTakeAssessment,
  repositoryStatusForClaim,
  streamLabelForSkillDefinition,
  takeAssessmentBlockMessage,
} from '@/lib/skill-declarations';
import { canVerifySkills } from '@/lib/profile-progress';
import { useProfileProgress } from '@/lib/use-profile-progress';

const STREAM_VISUALS: Record<
  string,
  {
    Icon: typeof Code2;
    iconClass: string;
    chipClass: string;
    ringClass: string;
  }
> = {
  'Universal Core': {
    Icon: Layers,
    iconClass: 'text-amber-600',
    chipClass: 'bg-amber-500/10',
    ringClass: 'ring-amber-500/20',
  },
  'Software Development': {
    Icon: Code2,
    iconClass: 'text-[#00967c]',
    chipClass: 'bg-[#00fad0]/10',
    ringClass: 'ring-[#00fad0]/20',
  },
  'Data Science': {
    Icon: Database,
    iconClass: 'text-sky-600',
    chipClass: 'bg-sky-500/10',
    ringClass: 'ring-sky-500/20',
  },
  'AI / ML': {
    Icon: Sparkles,
    iconClass: 'text-violet-600',
    chipClass: 'bg-violet-500/10',
    ringClass: 'ring-violet-500/20',
  },
};
const DEFAULT_STREAM_VISUAL = {
  Icon: Globe,
  iconClass: 'text-muted-foreground',
  chipClass: 'bg-muted',
  ringClass: 'ring-border',
};
const STREAM_ORDER = ['Universal Core', 'Software Development', 'Data Science', 'AI / ML'] as const;

function streamVisual(streamLabel: string) {
  return STREAM_VISUALS[streamLabel] ?? DEFAULT_STREAM_VISUAL;
}

type CatalogSkill = {
  definition: SkillDefinition;
  claim?: SkillClaimDto;
  streamLabel: string;
  displayLabel: string;
  badgeStatus: string | null;
  verified: boolean;
};

function CatalogSkillRow({
  skill,
  selected,
  onSelect,
}: {
  skill: CatalogSkill;
  selected: boolean;
  onSelect: () => void;
}) {
  const visual = streamVisual(skill.streamLabel);
  const Icon = visual.Icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-3 px-5 py-4 text-left transition-colors',
        selected ? 'bg-[#00fad0]/10' : 'hover:bg-muted',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
          visual.chipClass,
          visual.ringClass,
        )}
      >
        <Icon className={cn('h-4.5 w-4.5', visual.iconClass)} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-bold text-foreground">{skill.definition.name}</h3>
        <code className="font-mono text-xs text-muted-foreground">{skill.definition.code}</code>
      </div>
      {skill.badgeStatus ? (
        <VerificationBadge status={skill.badgeStatus} variant="outline" />
      ) : (
        <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Not declared
        </span>
      )}
    </button>
  );
}

function StreamSection({
  streamLabel,
  skills,
  selectedSkillCode,
  onSelect,
}: {
  streamLabel: string;
  skills: CatalogSkill[];
  selectedSkillCode: string | null;
  onSelect: (code: string) => void;
}) {
  const visual = streamVisual(streamLabel);
  const Icon = visual.Icon;
  const verifiedInGroup = skills.filter((s) => s.verified).length;

  return (
    <section className="surface-panel overflow-hidden rounded-2xl">
      <header
        className={cn(
          'flex items-center justify-between gap-3 border-b border-border px-5 py-3.5',
          visual.chipClass,
        )}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={cn('h-4 w-4', visual.iconClass)} />
          <h2 className="text-base font-bold text-foreground">{streamLabel}</h2>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {verifiedInGroup}/{skills.length} verified
        </span>
      </header>
      <div className="divide-y divide-border">
        {skills.map((skill) => (
          <CatalogSkillRow
            key={skill.definition.code}
            skill={skill}
            selected={selectedSkillCode === skill.definition.code}
            onSelect={() => onSelect(skill.definition.code)}
          />
        ))}
      </div>
    </section>
  );
}

function SkillDetailPanel({
  skill,
  selectedProficiency,
  onProficiencyChange,
  profilePercent,
  profileComplete,
  profileActionHref,
  profileActionLabel,
  canTakeAssessment,
  blockMessage,
  isBusy,
  isPending,
  onTakeAssessment,
}: {
  skill: CatalogSkill;
  selectedProficiency: SkillProficiency | null;
  onProficiencyChange: (value: SkillProficiency) => void;
  profilePercent: number;
  profileComplete: boolean;
  profileActionHref: string;
  profileActionLabel: string;
  canTakeAssessment: boolean;
  blockMessage: string | null;
  isBusy: boolean;
  isPending: boolean;
  onTakeAssessment: () => void;
}) {
  const visual = streamVisual(skill.streamLabel);
  const Icon = visual.Icon;
  const competencyBar = selectedProficiency
    ? skill.definition.levels[selectedProficiency]?.competencyBar
    : skill.definition.levels.INTERMEDIATE?.competencyBar;

  return (
    <section
      aria-label="Skill details"
      className="surface-panel sticky top-4 space-y-5 rounded-2xl p-6"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1',
            visual.chipClass,
            visual.ringClass,
          )}
        >
          <Icon className={cn('h-5 w-5', visual.iconClass)} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">{skill.definition.name}</h2>
          <p className="text-sm text-muted-foreground">{skill.streamLabel}</p>
          <code className="mt-1 block font-mono text-xs text-muted-foreground">
            {skill.definition.code}
          </code>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Current status</span>
          {skill.badgeStatus ? (
            <VerificationBadge status={skill.badgeStatus} variant="outline" />
          ) : (
            <span className="font-semibold text-foreground">Not declared</span>
          )}
        </div>
        {skill.claim?.proficiency ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Declared proficiency</span>
            <span className="font-semibold text-foreground">
              {PROFICIENCY_LABELS[skill.claim.proficiency] ?? skill.claim.proficiency}
            </span>
          </div>
        ) : null}
      </div>

      {competencyBar ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Competency bar
          </p>
          <p className="text-sm leading-relaxed text-foreground">{competencyBar}</p>
        </div>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">Select proficiency</legend>
        <div className="grid grid-cols-2 gap-2">
          {PROFICIENCY_OPTIONS.map((level) => {
            const active = selectedProficiency === level;
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                onClick={() => onProficiencyChange(level as SkillProficiency)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-[#00fad0]/50 bg-[#00fad0]/15 text-[#00967c]'
                    : 'border-border bg-muted text-foreground hover:border-[#00fad0]/30 hover:bg-[#00fad0]/5',
                )}
              >
                {PROFICIENCY_LABELS[level]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {!profileComplete ? (
        <div
          role="status"
          className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>{SKILL_VERIFICATION_PROFILE_UNLOCK_MESSAGE}</p>
          <p className="text-amber-800">Your profile is {profilePercent}% complete.</p>
          <Link
            href={profileActionHref}
            className="inline-flex font-semibold text-[#00967c] underline-offset-2 hover:text-[#00fad0] hover:underline"
          >
            {profileActionLabel}
          </Link>
        </div>
      ) : null}

      {blockMessage ? (
        <p className="text-sm text-rose-600" role="alert">
          {blockMessage}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canTakeAssessment || isBusy || isPending || Boolean(blockMessage)}
        onClick={onTakeAssessment}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#00fad0] px-4 py-3 text-sm font-bold text-[#04120f] transition-all hover:bg-[#33ffdd] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBusy ? 'Loading…' : skill.verified ? 'Practice Assessment' : 'Take Assessment'}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}

export default function SkillRepositoryPage() {
  const router = useRouter();
  const { progress, recommendedAction, loading: profileLoading } = useProfileProgress();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skillClaims, setSkillClaims] = useState<SkillClaimDto[]>([]);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('name');
  const [selectedSkillCode, setSelectedSkillCode] = useState<string | null>(null);
  const [selectedProficiency, setSelectedProficiency] = useState<SkillProficiency | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const claims = await api.assessment.listSkillClaims();
        if (!cancelled) setSkillClaims(claims);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load your skills. Please try again.',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const claimByCode = useMemo(() => {
    return new Map(skillClaims.map((claim) => [claim.skillCode, claim]));
  }, [skillClaims]);

  const catalogSkills = useMemo((): CatalogSkill[] => {
    return SKILL_DEFINITIONS.map((definition) => {
      const claim = claimByCode.get(definition.code);
      const { displayLabel, badgeStatus } = repositoryStatusForClaim(claim);
      return {
        definition,
        claim,
        streamLabel: streamLabelForSkillDefinition(definition.stream),
        displayLabel,
        badgeStatus,
        verified: claim?.status === 'VERIFIED',
      };
    });
  }, [claimByCode]);

  const selectedSkill = useMemo(
    () => catalogSkills.find((skill) => skill.definition.code === selectedSkillCode) ?? null,
    [catalogSkills, selectedSkillCode],
  );

  useEffect(() => {
    if (!selectedSkillCode) {
      setSelectedProficiency(null);
      return;
    }
    const claim = claimByCode.get(selectedSkillCode);
    setSelectedProficiency(claim?.proficiency ?? null);
  }, [selectedSkillCode, claimByCode]);

  const profilePercent = progress?.percent ?? 0;
  const profileComplete = canVerifySkills(profilePercent);
  const profileActionHref = recommendedAction?.href ?? '/profile';
  const profileActionLabel = recommendedAction?.ctaLabel ?? 'Complete your profile';

  const verifiedCount = catalogSkills.filter((skill) => skill.verified).length;
  const totalSkillsCount = catalogSkills.length;
  const readinessRatio = totalSkillsCount > 0 ? verifiedCount / totalSkillsCount : 0;

  const filterOptions = ['All', 'Verified', 'Not Verified'];

  const filteredSkills = useMemo(() => {
    let result = catalogSkills;

    if (activeFilter === 'Verified') {
      result = result.filter((skill) => skill.verified);
    } else if (activeFilter === 'Not Verified') {
      result = result.filter((skill) => !skill.verified);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (skill) =>
          skill.definition.name.toLowerCase().includes(q) ||
          skill.definition.code.toLowerCase().includes(q) ||
          skill.streamLabel.toLowerCase().includes(q),
      );
    }

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.definition.name.localeCompare(b.definition.name));
    } else if (sortBy === 'status') {
      result = [...result].sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0));
    }

    return result;
  }, [catalogSkills, activeFilter, searchQuery, sortBy]);

  const groupedSkills = useMemo(() => {
    const groups = new Map<string, CatalogSkill[]>();
    for (const skill of filteredSkills) {
      const list = groups.get(skill.streamLabel) ?? [];
      list.push(skill);
      groups.set(skill.streamLabel, list);
    }
    const orderedKeys = [
      ...STREAM_ORDER.filter((key) => groups.has(key)),
      ...Array.from(groups.keys())
        .filter((key) => !(STREAM_ORDER as readonly string[]).includes(key))
        .sort(),
    ];
    return orderedKeys
      .map((streamLabel) => ({ streamLabel, skills: groups.get(streamLabel) ?? [] }))
      .filter((group) => group.skills.length > 0);
  }, [filteredSkills]);

  const verifySkill = (
    code: string,
    proficiency: SkillProficiency,
    existingClaim?: SkillClaimDto,
  ) => {
    setError(null);
    setPendingCode(code);
    startTransition(() => {
      void (async () => {
        try {
          let targetClaimId = existingClaim?.claimId;
          if (
            !existingClaim ||
            existingClaim.status === 'DECLARED' ||
            existingClaim.status === 'BEGINNER_REATTEMPT'
          ) {
            const options = skillFocusOptions(code);
            const created = await api.assessment.declareSkillClaim({
              skillCode: code,
              proficiency,
              skillFocus: options[0] || undefined,
            });
            targetClaimId = created.claimId;
            setSkillClaims((prev) => [
              ...prev.filter((claim) => claim.skillCode !== code),
              created,
            ]);
          }
          if (targetClaimId) {
            router.push(`/assessments/skills/${targetClaimId}`);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to start skill verification');
        } finally {
          setPendingCode(null);
        }
      })();
    });
  };

  const selectedBlockMessage = takeAssessmentBlockMessage(selectedSkill?.claim);

  const canTakeAssessment =
    canEnableTakeAssessment({
      profilePercent,
      proficiency: selectedProficiency,
    }) && !selectedBlockMessage;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16 pt-2">
      <section className="surface-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div
          className="brand-gradient pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full opacity-[0.12] blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
              Skill Repository
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Browse the skill catalog, review your claim status, choose a proficiency level, and
              take a proctored assessment to verify your skills.
            </p>
            {error ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:min-w-[220px]">
            <div className="rounded-2xl border border-border bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Verification progress
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {verifiedCount}
                <span className="text-muted-foreground">/{totalSkillsCount}</span> verified
              </p>
              <p className="text-sm text-muted-foreground">
                {Math.round(readinessRatio * 100)}% of catalog
              </p>
            </div>

            {!profileLoading && progress ? (
              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Profile completion
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">{profilePercent}%</p>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted-foreground/20"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={profilePercent}
                  aria-label="Profile completion"
                >
                  <div
                    className="h-full rounded-full bg-[#00fad0] transition-[width] duration-500"
                    style={{ width: `${String(profilePercent)}%` }}
                  />
                </div>
                <Link
                  href={profileActionHref}
                  className="mt-2 inline-block text-sm font-medium text-[#00967c] hover:text-[#00fad0] hover:underline"
                >
                  {profileComplete ? 'View profile' : profileActionLabel}
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-4 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none md:pb-0">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setActiveFilter(opt)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200',
                  activeFilter === opt
                    ? 'border border-[#00fad0]/40 bg-[#00fad0]/15 font-bold text-[#00967c] shadow-sm'
                    : 'border border-border bg-muted text-muted-foreground hover:border-[#00fad0]/30 hover:bg-[#00fad0]/5 hover:text-foreground',
                )}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#00fad0]/50 focus:outline-none"
              />
            </div>

            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'status')}
                className="cursor-pointer appearance-none rounded-full border border-border bg-background py-2 pl-3.5 pr-8 text-sm font-medium text-foreground focus:border-[#00fad0]/50 focus:outline-none"
              >
                <option value="recent">Sort by: Recent</option>
                <option value="name">Sort by: Name</option>
                <option value="status">Sort by: Status</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-6" role="status" aria-label="Loading skills">
          {[0, 1].map((section) => (
            <div
              key={section}
              className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="border-b border-border px-5 py-3.5">
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
              <div className="divide-y divide-border">
                {[0, 1].map((row) => (
                  <div key={row} className="flex items-center gap-3 px-5 py-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/3 rounded bg-muted" />
                      <div className="h-2 w-1/5 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">No skills match your search</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try adjusting your filter or search terms to find skills in the repository.
            </p>
          </div>
        </div>
      ) : null}

      {!loading && groupedSkills.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-6">
            {groupedSkills.map((group) => (
              <StreamSection
                key={group.streamLabel}
                streamLabel={group.streamLabel}
                skills={group.skills}
                selectedSkillCode={selectedSkillCode}
                onSelect={setSelectedSkillCode}
              />
            ))}
          </div>

          <div>
            {selectedSkill ? (
              <SkillDetailPanel
                skill={selectedSkill}
                selectedProficiency={selectedProficiency}
                onProficiencyChange={setSelectedProficiency}
                profilePercent={profilePercent}
                profileComplete={profileComplete}
                profileActionHref={profileActionHref}
                profileActionLabel={profileActionLabel}
                canTakeAssessment={canTakeAssessment}
                blockMessage={selectedBlockMessage}
                isBusy={pendingCode === selectedSkill.definition.code}
                isPending={isPending}
                onTakeAssessment={() => {
                  if (!selectedProficiency) return;
                  verifySkill(
                    selectedSkill.definition.code,
                    selectedProficiency,
                    selectedSkill.claim,
                  );
                }}
              />
            ) : (
              <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-bold text-foreground">Select a skill</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a skill from the repository to view details, check your status, and take an
                  assessment.
                </p>
              </section>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
