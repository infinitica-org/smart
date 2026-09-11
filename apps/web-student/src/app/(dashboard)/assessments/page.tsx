'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Plus,
  Search,
  ChevronDown,
  X,
  Code2,
  Database,
  Layers,
  Sparkles,
  Globe,
  BookOpen,
} from 'lucide-react';
import {
  SKILL_DEFINITIONS,
  skillFocusOptions,
  type SkillClaimDto,
  type SkillProficiency,
} from '@smart/contracts';
import { api } from '@/lib/api';
import { skillNameForCode } from '@/lib/skill-declarations';
import { cn } from '@smart/ui';

/** Visual identity per skill stream — icon + accent colour, driving the
 * section header, row icon chip and proficiency ring for every skill in it.
 * Keyed off the same human-readable stream label already computed for
 * display, so it stays correct without re-deriving anything from raw codes. */
const STREAM_VISUALS: Record<
  string,
  {
    Icon: typeof Code2;
    iconClass: string;
    chipClass: string;
    ringClass: string;
    barClass: string;
    trackClass: string;
  }
> = {
  'Software Development': {
    Icon: Code2,
    iconClass: 'text-[#00fad0]',
    chipClass: 'bg-[#00fad0]/10',
    ringClass: 'ring-[#00fad0]/25',
    barClass: 'bg-[#00fad0]',
    trackClass: 'text-[#00fad0]/15',
  },
  'Data Science': {
    Icon: Database,
    iconClass: 'text-sky-400',
    chipClass: 'bg-sky-500/10',
    ringClass: 'ring-sky-500/25',
    barClass: 'bg-sky-400',
    trackClass: 'text-sky-500/15',
  },
  'AI / ML': {
    Icon: Sparkles,
    iconClass: 'text-violet-400',
    chipClass: 'bg-violet-500/10',
    ringClass: 'ring-violet-500/25',
    barClass: 'bg-violet-400',
    trackClass: 'text-violet-500/15',
  },
  'Universal Core': {
    Icon: Layers,
    iconClass: 'text-amber-400',
    chipClass: 'bg-amber-500/10',
    ringClass: 'ring-amber-500/25',
    barClass: 'bg-amber-400',
    trackClass: 'text-amber-500/15',
  },
};
const DEFAULT_STREAM_VISUAL = {
  Icon: Globe,
  iconClass: 'text-zinc-400',
  chipClass: 'bg-zinc-800/80',
  ringClass: 'ring-zinc-700/60',
  barClass: 'bg-zinc-500',
  trackClass: 'text-zinc-700',
};
const STREAM_ORDER = ['Universal Core', 'Software Development', 'Data Science', 'AI / ML'] as const;

function streamVisual(streamLabel: string) {
  return STREAM_VISUALS[streamLabel] ?? DEFAULT_STREAM_VISUAL;
}

const PROFICIENCY_LEVELS: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  PROFESSIONAL: 4,
};

/** Circular progress dial — used both for the hero readiness ring and each
 * row's proficiency dial. `value` is 0..1; colour comes from `currentColor`
 * so callers just hand it a Tailwind text-colour class. */
function CircularProgress({
  value,
  size,
  strokeWidth,
  colorClass,
  trackClass,
  children,
}: {
  value: number;
  size: number;
  strokeWidth: number;
  colorClass: string;
  trackClass: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - clamped);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          className={trackClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(colorClass, 'transition-[stroke-dashoffset] duration-700 ease-out')}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}

type DisplaySkill = SkillClaimDto & {
  name: string;
  streamLabel: string;
  verified: boolean;
  proficiencyLabel: string;
};

function SkillRow({
  skill,
  isBusy,
  isPending,
  onViewDetails,
  onVerify,
}: {
  skill: DisplaySkill;
  isBusy: boolean;
  isPending: boolean;
  onViewDetails: () => void;
  onVerify: () => void;
}) {
  const visual = streamVisual(skill.streamLabel);
  const level = (skill.proficiency && PROFICIENCY_LEVELS[skill.proficiency]) || 0;
  const Icon = visual.Icon;

  return (
    <div className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between">
      {/* Icon + name + code */}
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
            visual.chipClass,
            visual.ringClass,
          )}
        >
          <Icon className={cn('h-4.5 w-4.5', visual.iconClass)} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-white">{skill.name}</h3>
          <code className="font-mono text-xs text-zinc-500">{skill.skillCode}</code>
        </div>
      </div>

      {/* Proficiency dial, status badge, actions */}
      <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:flex-nowrap sm:gap-4">
        <div className="flex items-center gap-2">
          <CircularProgress
            value={level / 4}
            size={38}
            strokeWidth={3.5}
            colorClass={visual.iconClass}
            trackClass="text-zinc-800"
          >
            <span className="text-[10px] font-bold text-zinc-300">{level}/4</span>
          </CircularProgress>
          <span className="hidden text-sm font-medium text-zinc-400 md:inline">
            {skill.proficiencyLabel}
          </span>
        </div>

        {skill.verified ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-2.5 py-1 text-xs font-semibold text-[#00fad0] shadow-[0_0_10px_rgba(0,250,208,0.15)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" /> Not Verified
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onViewDetails}
            className="rounded-full border border-zinc-800/90 bg-zinc-900/60 px-3.5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
          >
            View Details
          </button>
          <button
            type="button"
            disabled={isBusy || isPending}
            onClick={onVerify}
            className="inline-flex items-center justify-center gap-1 rounded-full bg-[#00fad0] px-4 py-2 text-sm font-bold text-[#04120f] transition-all hover:bg-[#33ffdd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {skill.verified ? 'Practice' : isBusy ? 'Loading...' : 'Start'}{' '}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StreamSection({
  streamLabel,
  skills,
  pendingCode,
  isPending,
  onViewDetails,
  onVerify,
}: {
  streamLabel: string;
  skills: DisplaySkill[];
  pendingCode: string | null;
  isPending: boolean;
  onViewDetails: (skill: DisplaySkill) => void;
  onVerify: (code: string, claim: DisplaySkill) => void;
}) {
  const visual = streamVisual(streamLabel);
  const Icon = visual.Icon;
  const verifiedInGroup = skills.filter((s) => s.verified).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#121215]/60">
      <header
        className={cn(
          'flex items-center justify-between gap-3 border-b border-zinc-800/60 px-5 py-3.5',
          visual.chipClass,
        )}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={cn('h-4 w-4', visual.iconClass)} />
          <h2 className="text-base font-bold text-white">{streamLabel}</h2>
        </div>
        <span className="text-sm font-medium text-zinc-400">
          {verifiedInGroup}/{skills.length} verified
        </span>
      </header>
      <div className="divide-y divide-zinc-800/60">
        {skills.map((skill) => (
          <SkillRow
            key={skill.claimId || skill.skillCode}
            skill={skill}
            isBusy={pendingCode === skill.skillCode}
            isPending={isPending}
            onViewDetails={() => onViewDetails(skill)}
            onVerify={() => onVerify(skill.skillCode, skill)}
          />
        ))}
      </div>
    </section>
  );
}

export default function SkillsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skillClaims, setSkillClaims] = useState<SkillClaimDto[]>([]);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter & Search States
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');

  // Modals
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [selectedClaimForDetails, setSelectedClaimForDetails] = useState<DisplaySkill | null>(null);
  const [newSkillCode, setNewSkillCode] = useState<string>('');
  const [newSkillProficiency, setNewSkillProficiency] = useState<SkillProficiency>('INTERMEDIATE');

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

  const verifySkill = (code: string, existingClaim?: SkillClaimDto) => {
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
              proficiency: existingClaim?.proficiency ?? 'INTERMEDIATE',
              skillFocus: options[0] || undefined,
            });
            targetClaimId = created.claimId;
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

  // Map real database claims with system skill definition metadata
  const realDisplaySkills = useMemo((): DisplaySkill[] => {
    return skillClaims.map((claim) => {
      const def = SKILL_DEFINITIONS.find((s) => s.code === claim.skillCode);
      const name = def?.name ?? skillNameForCode(claim.skillCode);
      const verified = claim.status === 'VERIFIED';
      const streamLabel =
        def?.stream === 'UNIVERSAL'
          ? 'Universal Core'
          : def?.stream === 'SOFTWARE_DEVELOPMENT'
            ? 'Software Development'
            : def?.stream === 'DATA_SCIENCE_ANALYTICS'
              ? 'Data Science'
              : def?.stream === 'AI_ML_ENGINEERING'
                ? 'AI / ML'
                : 'Technical Skill';

      let proficiencyLabel = 'Intermediate';
      if (claim.proficiency) {
        proficiencyLabel =
          claim.proficiency.charAt(0).toUpperCase() + claim.proficiency.slice(1).toLowerCase();
      }

      return {
        ...claim,
        name,
        streamLabel,
        verified,
        proficiencyLabel,
      };
    });
  }, [skillClaims]);

  // Total and Verified stats from database
  const totalSkillsCount = realDisplaySkills.length;
  const verifiedCount = realDisplaySkills.filter((s) => s.verified).length;
  const readinessRatio = totalSkillsCount > 0 ? verifiedCount / totalSkillsCount : 0;

  // Filter options
  const filterOptions = ['All', 'Verified', 'Not Verified'];

  // Filtered & Sorted real claims
  const filteredSkills = useMemo(() => {
    let result = realDisplaySkills;

    if (activeFilter === 'Verified') {
      result = result.filter((s) => s.verified);
    } else if (activeFilter === 'Not Verified') {
      result = result.filter((s) => !s.verified);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.skillCode.toLowerCase().includes(q) ||
          s.streamLabel.toLowerCase().includes(q),
      );
    }

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'status') {
      result = [...result].sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0));
    }
    return result;
  }, [realDisplaySkills, activeFilter, searchQuery, sortBy]);

  // Group the filtered/sorted skills by stream for the section layout.
  const groupedSkills = useMemo(() => {
    const groups = new Map<string, DisplaySkill[]>();
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

  // Handle adding new skill claim directly into DB
  const handleAddSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillCode) return;
    try {
      const options = skillFocusOptions(newSkillCode);
      const createdClaim = await api.assessment.declareSkillClaim({
        skillCode: newSkillCode,
        proficiency: newSkillProficiency,
        skillFocus: options[0] || undefined,
      });
      setSkillClaims((prev) => [...prev.filter((c) => c.skillCode !== newSkillCode), createdClaim]);
      setAddSkillOpen(false);
      setNewSkillCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add skill. Please try again.');
    }
  };

  // Skill icon chip — colour-coded by taxonomy stream (not a code-text guess),
  // so it stays correct as the skill catalog grows. Used by the two modals.
  const renderSkillIcon = (streamLabel: string) => {
    const { Icon, iconClass, chipClass, ringClass } = streamVisual(streamLabel);
    return (
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1',
          chipClass,
          ringClass,
        )}
      >
        <Icon className={cn('h-5 w-5', iconClass)} />
      </div>
    );
  };

  // Available skills from SKILL_DEFINITIONS that candidate hasn't added yet
  const availableCatalogSkills = useMemo(() => {
    const existingCodes = new Set(skillClaims.map((c) => c.skillCode));
    return SKILL_DEFINITIONS.filter((s) => !existingCodes.has(s.code));
  }, [skillClaims]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16 pt-2">
      {/* Hero: readiness ring, title, and the filter/search toolbar */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#121215]/90 p-6 sm:p-8">
        <div
          className="brand-gradient pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full opacity-[0.12] blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white">Skills</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Build, verify, and showcase your technical skills. Complete skill verifications to
              strengthen your profile and unlock more opportunities.
            </p>
            {error ? (
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <div className="flex items-center gap-3">
              <CircularProgress
                value={readinessRatio}
                size={80}
                strokeWidth={6}
                colorClass="text-[#00fad0]"
                trackClass="text-zinc-800"
              >
                <span className="text-base font-bold text-white">
                  {Math.round(readinessRatio * 100)}%
                </span>
              </CircularProgress>
              <div className="text-sm">
                <div className="font-bold text-white">
                  {verifiedCount}
                  <span className="text-zinc-500">/{totalSkillsCount}</span>
                </div>
                <div className="text-sm text-zinc-400">Verified</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAddSkillOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-4 py-2.5 text-sm font-semibold text-[#00fad0] transition-all duration-200 hover:bg-[#00fad0]/20"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" /> Add Skill
            </button>
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-4 border-t border-zinc-800/60 pt-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none md:pb-0">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setActiveFilter(opt)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200',
                  activeFilter === opt
                    ? 'border border-[#00fad0]/40 bg-[#00fad0]/15 font-bold text-[#00fad0] shadow-[0_0_10px_rgba(0,250,208,0.1)]'
                    : 'border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                )}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-zinc-800/80 bg-zinc-900/60 py-2 pl-8 pr-3 text-sm text-white placeholder-zinc-500 focus:border-[#00fad0]/50 focus:outline-none"
              />
            </div>

            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'status')}
                className="cursor-pointer appearance-none rounded-full border border-zinc-800/80 bg-zinc-900/60 py-2 pl-3.5 pr-8 text-sm font-medium text-zinc-300 focus:border-[#00fad0]/50 focus:outline-none"
              >
                <option value="recent">Sort by: Recent</option>
                <option value="name">Sort by: Name</option>
                <option value="status">Sort by: Status</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>
        </div>
      </section>

      {/* Loading state — skeleton sections matching the grouped-row shape */}
      {loading ? (
        <div className="space-y-6" role="status" aria-label="Loading skills">
          {[0, 1].map((s) => (
            <div
              key={s}
              className="animate-pulse overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#121215]/60"
            >
              <div className="border-b border-zinc-800/60 px-5 py-3.5">
                <div className="h-3 w-32 rounded bg-zinc-800/80" />
              </div>
              <div className="divide-y divide-zinc-800/60">
                {[0, 1].map((r) => (
                  <div key={r} className="flex items-center gap-3 px-5 py-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-800/80" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/3 rounded bg-zinc-800/80" />
                      <div className="h-2 w-1/5 rounded bg-zinc-800/60" />
                    </div>
                    <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-800/60" />
                    <div className="h-6 w-20 shrink-0 rounded-full bg-zinc-800/60" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Empty State when candidate has no declared skills in DB (or filters match nothing) */}
      {!loading && filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-zinc-800 bg-[#121215]/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/60 text-zinc-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No skills yet</h3>
            <p className="mt-1 max-w-sm text-sm text-zinc-400">
              {searchQuery || activeFilter !== 'All'
                ? 'No skill claims match your current filter or search criteria.'
                : 'You have not declared any skills yet. Add skills to start proctored verification.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddSkillOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-5 py-2.5 text-sm font-semibold text-[#00fad0] transition-all hover:bg-[#00fad0]/20"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" /> Add Skill
          </button>
        </div>
      ) : null}

      {/* Skills grouped by stream */}
      {!loading && groupedSkills.length > 0 ? (
        <div className="space-y-6">
          {groupedSkills.map((group) => (
            <StreamSection
              key={group.streamLabel}
              streamLabel={group.streamLabel}
              skills={group.skills}
              pendingCode={pendingCode}
              isPending={isPending}
              onViewDetails={setSelectedClaimForDetails}
              onVerify={verifySkill}
            />
          ))}
        </div>
      ) : null}

      {/* Modal 1: Add Skill Dialog (Populates real SKILL_DEFINITIONS catalog) */}
      {addSkillOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add a Skill</h2>
              <button
                type="button"
                onClick={() => setAddSkillOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSkillSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Skill</label>
                <select
                  value={newSkillCode}
                  onChange={(e) => setNewSkillCode(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-white focus:border-[#00fad0]/50 focus:outline-none"
                  required
                >
                  <option value="">Choose a skill...</option>
                  {(availableCatalogSkills.length > 0
                    ? availableCatalogSkills
                    : SKILL_DEFINITIONS
                  ).map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                  Declared Proficiency
                </label>
                <select
                  value={newSkillProficiency}
                  onChange={(e) => setNewSkillProficiency(e.target.value as SkillProficiency)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-white focus:border-[#00fad0]/50 focus:outline-none"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="PROFESSIONAL">Professional</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setAddSkillOpen(false)}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-4 py-2.5 text-sm font-semibold text-[#00fad0] hover:bg-[#00fad0]/20"
                >
                  Add Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal 2: Skill Details View Dialog */}
      {selectedClaimForDetails ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-5 rounded-2xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {renderSkillIcon(selectedClaimForDetails.streamLabel)}
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedClaimForDetails.name}</h2>
                  <p className="text-sm text-zinc-400">{selectedClaimForDetails.streamLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaimForDetails(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Verification Status:</span>
                <span className="font-semibold text-[#00fad0]">
                  {selectedClaimForDetails.verified ? 'Verified' : 'Not Verified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Declared Proficiency:</span>
                <span className="font-semibold text-white">
                  {selectedClaimForDetails.proficiencyLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Proctored Assessment:</span>
                <span className="font-semibold text-emerald-400">Available</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setSelectedClaimForDetails(null)}
                className="rounded-full border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const code = selectedClaimForDetails.skillCode;
                  const claim = selectedClaimForDetails;
                  setSelectedClaimForDetails(null);
                  verifySkill(code, claim);
                }}
                className="rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-4 py-2 text-sm font-semibold text-[#00fad0] hover:bg-[#00fad0]/20"
              >
                Start Verification Exam
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
