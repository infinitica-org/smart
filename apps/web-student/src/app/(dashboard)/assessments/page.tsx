'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
  Plus,
  Search,
  ChevronDown,
  Signal,
  X,
  Code2,
  Database,
  Layers,
  Terminal,
  Globe,
  Check,
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
  const [selectedClaimForDetails, setSelectedClaimForDetails] = useState<
    | (SkillClaimDto & {
        name: string;
        streamLabel: string;
        verified: boolean;
        proficiencyLabel: string;
      })
    | null
  >(null);
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
          setError(err instanceof Error ? err.message : 'Failed to load skills from database');
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
  const realDisplaySkills = useMemo(() => {
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
        def,
      };
    });
  }, [skillClaims]);

  // Total and Verified stats from database
  const totalSkillsCount = realDisplaySkills.length;
  const verifiedCount = realDisplaySkills.filter((s) => s.verified).length;

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
      setError(err instanceof Error ? err.message : 'Failed to declare skill in database');
    }
  };

  // Helper for skill icons based on code
  const renderSkillIcon = (code: string) => {
    const lower = code.toLowerCase();
    if (lower.includes('js') || lower.includes('javascript') || lower.includes('language')) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-xs">
          JS
        </div>
      );
    }
    if (lower.includes('react') || lower.includes('framework')) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00fad0]/10 border border-[#00fad0]/30 text-[#00fad0]">
          <Code2 className="h-4 w-4 text-[#00fad0]" />
        </div>
      );
    }
    if (lower.includes('data') || lower.includes('sql') || lower.includes('database')) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
          <Database className="h-4 w-4 text-sky-400" />
        </div>
      );
    }
    if (lower.includes('git')) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
          <Terminal className="h-4 w-4 text-orange-400" />
        </div>
      );
    }
    if (lower.includes('system') || lower.includes('deploy') || lower.includes('cicd')) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
          <Layers className="h-4 w-4 text-indigo-400" />
        </div>
      );
    }
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
        <Globe className="h-4 w-4" />
      </div>
    );
  };

  // Available skills from SKILL_DEFINITIONS that candidate hasn't added yet
  const availableCatalogSkills = useMemo(() => {
    const existingCodes = new Set(skillClaims.map((c) => c.skillCode));
    return SKILL_DEFINITIONS.filter((s) => !existingCodes.has(s.code));
  }, [skillClaims]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-16 pt-2">
      {/* 1. Header & Database Stats Section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Skills</h1>
          <p className="mt-1.5 text-xs text-zinc-400 max-w-xl">
            Build, verify, and showcase your technical skills. Complete skill verifications to
            strengthen your profile and unlock more opportunities.
          </p>
          {error ? (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          ) : null}
        </div>

        {/* Database Stats Box & Dimmed Cyan Add Skill Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-5 rounded-full border border-zinc-800/80 bg-[#121215]/90 px-4 py-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
              <div className="text-xs">
                <span className="font-bold text-white mr-1">{totalSkillsCount}</span>
                <span className="text-[11px] text-zinc-400">Total Skills</span>
              </div>
            </div>

            <div className="h-4 w-px bg-zinc-800" />

            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#00fad0]/80" />
              <div className="text-xs">
                <span className="font-bold text-white mr-1">{verifiedCount}</span>
                <span className="text-[11px] text-zinc-400">Verified</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAddSkillOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-4 py-2 text-xs font-semibold text-[#00fad0] hover:bg-[#00fad0]/20 transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> Add Skill
          </button>
        </div>
      </div>

      {/* 2. Filter Pills & Search / Sort Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-y border-zinc-800/70 py-3.5">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setActiveFilter(opt)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200',
                activeFilter === opt
                  ? 'bg-[#00fad0]/15 text-[#00fad0] border border-[#00fad0]/40 font-bold shadow-[0_0_10px_rgba(0,250,208,0.1)]'
                  : 'border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
              )}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search database skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-zinc-800/80 bg-zinc-900/60 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-[#00fad0]/50 focus:outline-none"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'status')}
              className="appearance-none rounded-full border border-zinc-800/80 bg-zinc-900/60 pl-3.5 pr-8 py-1.5 text-xs font-medium text-zinc-300 focus:border-[#00fad0]/50 focus:outline-none cursor-pointer"
            >
              <option value="recent">Sort by: Recent</option>
              <option value="name">Sort by: Name</option>
              <option value="status">Sort by: Status</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-400 animate-pulse">
          Loading skills from database…
        </div>
      ) : null}

      {/* Empty State when candidate has no declared skills in DB */}
      {!loading && filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-[#121215]/50 p-12 text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/60 text-zinc-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Skills Found in Database</h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">
              {searchQuery || activeFilter !== 'All'
                ? 'No skill claims match your current filter or search criteria.'
                : 'You have not declared any skills yet. Add skills to start proctored verification.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddSkillOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-5 py-2 text-xs font-semibold text-[#00fad0] hover:bg-[#00fad0]/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> Add Skill
          </button>
        </div>
      ) : null}

      {/* 3. Skill Cards Grid (Fetching ONLY Real DB Data) */}
      {!loading && filteredSkills.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredSkills.map((skill) => {
            const isBusy = pendingCode === skill.skillCode;
            return (
              <div
                key={skill.claimId || skill.skillCode}
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-[#121215]/90 p-4 shadow-sm transition-all duration-300 hover:border-[#00fad0]/30 hover:shadow-[0_0_20px_rgba(0,250,208,0.08)]"
              >
                <div className="space-y-3">
                  {/* Header: Icon, Name & Status Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {renderSkillIcon(skill.skillCode)}
                      <div>
                        <h3 className="font-bold text-white text-sm leading-tight group-hover:text-[#00fad0] transition-colors">
                          {skill.name}
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-medium">{skill.streamLabel}</p>
                      </div>
                    </div>

                    {/* Status Badge: ONLY Verified or Not Verified */}
                    {skill.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-2 py-0.5 text-[10px] font-semibold text-[#00fad0]">
                        <Check className="h-3 w-3 stroke-[2.5]" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                        Not Verified
                      </span>
                    )}
                  </div>

                  {/* Code / Description */}
                  <p className="text-xs text-zinc-400/90 line-clamp-2 leading-relaxed">
                    System Code:{' '}
                    <code className="text-[11px] text-zinc-300 font-mono">{skill.skillCode}</code>
                  </p>
                </div>

                {/* Bottom Info: Proficiency Meter & Actions */}
                <div className="mt-5 space-y-3 pt-3 border-t border-zinc-800/60">
                  {/* Proficiency Indicator */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Signal className="h-3 w-3 text-[#00fad0]/70" />
                    <span className="text-zinc-400">Proficiency</span>
                    <span className="font-semibold text-zinc-200">{skill.proficiencyLabel}</span>
                  </div>

                  {/* Card Actions: View Details and Practice / Start (NO CONTINUE) */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClaimForDetails(skill)}
                      className="flex-1 rounded-full border border-zinc-800/90 bg-zinc-900/60 py-1.5 text-center text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
                    >
                      View Details
                    </button>

                    {skill.verified ? (
                      <button
                        type="button"
                        disabled={isBusy || isPending}
                        onClick={() => verifySkill(skill.skillCode, skill)}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-3.5 py-1.5 text-xs font-semibold text-[#00fad0] hover:bg-[#00fad0]/20 transition-all"
                      >
                        Practice <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy || isPending}
                        onClick={() => verifySkill(skill.skillCode, skill)}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-3.5 py-1.5 text-xs font-semibold text-[#00fad0] hover:bg-[#00fad0]/20 transition-all"
                      >
                        {isBusy ? 'Loading...' : 'Start'} <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Modal 1: Add Skill Dialog (Populates real SKILL_DEFINITIONS catalog) */}
      {addSkillOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Add Technical Skill to Database</h2>
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
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Select Skill from Taxonomy
                </label>
                <select
                  value={newSkillCode}
                  onChange={(e) => setNewSkillCode(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white focus:border-[#00fad0]/50 focus:outline-none"
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
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Declared Proficiency
                </label>
                <select
                  value={newSkillProficiency}
                  onChange={(e) => setNewSkillProficiency(e.target.value as SkillProficiency)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white focus:border-[#00fad0]/50 focus:outline-none"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="PROFESSIONAL">Professional</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAddSkillOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-4 py-2 text-xs font-semibold text-[#00fad0] hover:bg-[#00fad0]/20"
                >
                  Add to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal 2: Skill Details View Dialog */}
      {selectedClaimForDetails ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {renderSkillIcon(selectedClaimForDetails.skillCode)}
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedClaimForDetails.name}</h2>
                  <p className="text-xs text-zinc-400">{selectedClaimForDetails.streamLabel}</p>
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

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Database Claim ID:</span>
                <span className="font-mono text-zinc-300 text-[11px]">
                  {selectedClaimForDetails.claimId}
                </span>
              </div>
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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedClaimForDetails(null)}
                className="rounded-full border border-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
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
                className="rounded-full border border-[#00fad0]/40 bg-[#00fad0]/10 px-4 py-1.5 text-xs font-semibold text-[#00fad0] hover:bg-[#00fad0]/20"
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
