import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { SKILL_DEFINITIONS } from '@smart/contracts';
import { api } from '@/lib/api';
import type { OnboardingProfileForm } from '@/lib/onboarding-form';

const MAX_CATALOG_MATCHES = 6;

interface SkillDiscoveryProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
}

const BAR_COLORS = ['#00fad0', '#5b9bd9', '#f2b84b', '#e57ea6', '#8f7bea', '#6ad18b'];

export default function SkillDiscovery({ formData, updateField }: SkillDiscoveryProps) {
  const github = formData.socialVerification.github;
  const selectedRepos = useMemo(() => github?.selectedRepos ?? [], [github]);
  const hasRepos = selectedRepos.length >= 3;
  const discovery = formData.skillDiscovery;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  /**
   * `skillDiscovery` is the rich, provenance-tracking record (what GitHub
   * suggested, what's custom); `codingProficiencies` is the flatter shape the
   * rest of onboarding already sends as `skills[type=technical]`. Keeping
   * this tab as the sole editor of both means every other consumer of the
   * onboarding profile keeps seeing skills the normal way, with no schema
   * migration needed on their end.
   */
  const updateSkillDiscovery = (next: typeof discovery) => {
    updateField('skillDiscovery', next);
    const existingByName = new Map(formData.codingProficiencies.map((cp) => [cp.language, cp]));
    updateField(
      'codingProficiencies',
      next.selectedSkillNames.map(
        (name) =>
          existingByName.get(name) ?? {
            id: crypto.randomUUID(),
            language: name,
            proficiency: 'Beginner',
          },
      ),
    );
  };

  useEffect(() => {
    if (!hasRepos || discovery.suggestedFromGithub.length > 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.users
      .githubRepoLanguages({ repoFullNames: selectedRepos.map((repo) => repo.fullName) })
      .then((response) => {
        if (cancelled) return;
        const topLanguages = response.languages.slice(0, 8).map((entry) => entry.language);
        updateSkillDiscovery({
          ...discovery,
          suggestedFromGithub: response.languages,
          selectedSkillNames: Array.from(
            new Set([...discovery.selectedSkillNames, ...topLanguages]),
          ),
        });
      })
      .catch(() => {
        if (!cancelled) setError('Could not analyze your repositories right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Runs once per distinct repo selection; re-running on every discovery
    // change would refetch on each chip toggle.
  }, [hasRepos, selectedRepos.map((repo) => repo.fullName).join(',')]);

  const toggleSuggested = (name: string) => {
    const exists = discovery.selectedSkillNames.includes(name);
    updateSkillDiscovery({
      ...discovery,
      selectedSkillNames: exists
        ? discovery.selectedSkillNames.filter((n) => n !== name)
        : [...discovery.selectedSkillNames, name],
    });
  };

  /**
   * Restricted to the same Software & IT catalog (`SKILL_DEFINITIONS`) that
   * verification and the manual "Declare skills" UI use — a name typed here
   * that isn't a real catalog skill can never become a SkillClaim, so rather
   * than silently swallow it later, the picker only ever adds a real match.
   */
  const catalogMatches = useMemo(() => {
    const query = customInput.trim().toLowerCase();
    if (!query) return [];
    const selected = new Set(discovery.selectedSkillNames.map((n) => n.toLowerCase()));
    return SKILL_DEFINITIONS.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) && !selected.has(skill.name.toLowerCase()),
    ).slice(0, MAX_CATALOG_MATCHES);
  }, [customInput, discovery.selectedSkillNames]);

  const addCustomSkill = (name?: string) => {
    const chosen = name ?? catalogMatches[0]?.name;
    if (
      !chosen ||
      discovery.selectedSkillNames.some((n) => n.toLowerCase() === chosen.toLowerCase())
    ) {
      setCustomInput('');
      return;
    }
    updateSkillDiscovery({
      ...discovery,
      customSkillNames: [...discovery.customSkillNames, chosen],
      selectedSkillNames: [...discovery.selectedSkillNames, chosen],
    });
    setCustomInput('');
  };

  const removeSkill = (name: string) => {
    updateSkillDiscovery({
      ...discovery,
      customSkillNames: discovery.customSkillNames.filter((n) => n !== name),
      selectedSkillNames: discovery.selectedSkillNames.filter((n) => n !== name),
    });
  };

  return (
    <div key="skill-discovery">
      <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
          <Sparkles className="w-3 h-3" />
        </span>
        Top skills
      </h3>
      <p className="text-sm text-zinc-400 mb-5 ml-8">
        {hasRepos
          ? "Suggested from the repos you picked. Uncheck anything that isn't really you, and add anything we couldn't see."
          : 'Add the skills you want employers to see.'}
      </p>

      <div className="ml-8 max-w-xl">
        {hasRepos ? (
          loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400 py-6">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Analyzing your
              repositories…
            </div>
          ) : error ? (
            <p className="text-xs text-amber-400 flex items-center gap-1 py-2 mb-4">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          ) : discovery.suggestedFromGithub.length > 0 ? (
            <>
              <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-zinc-800 mb-2">
                {discovery.suggestedFromGithub.map((entry, idx) => (
                  <motion.div
                    key={entry.language}
                    initial={{ width: 0 }}
                    animate={{ width: `${String(entry.byteShare * 100)}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.05, ease: 'easeOut' }}
                    style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mb-4">
                From {selectedRepos.length} of your repos
              </p>
            </>
          ) : null
        ) : null}

        {discovery.suggestedFromGithub.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-5">
            {discovery.suggestedFromGithub.map((entry, idx) => {
              const active = discovery.selectedSkillNames.includes(entry.language);
              return (
                <motion.button
                  key={entry.language}
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  onClick={() => toggleSuggested(entry.language)}
                  className={`inline-flex items-center gap-1.5 h-8 pl-3 pr-2.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                  />
                  {entry.language}
                  {active ? <span className="text-emerald-400">✓</span> : null}
                </motion.button>
              );
            })}
          </div>
        ) : null}

        {discovery.customSkillNames.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {discovery.customSkillNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full text-xs font-medium border border-zinc-800 bg-zinc-900 text-zinc-200"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeSkill(name)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomSkill();
                }
              }}
              placeholder="Search skills (e.g. System design, SQL, Testing)"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => addCustomSkill()}
              disabled={catalogMatches.length === 0}
              className="inline-flex items-center gap-1.5 h-[42px] px-4 rounded-xl border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {customInput.trim() ? (
            catalogMatches.length > 0 ? (
              <div className="absolute z-10 mt-1.5 w-full max-w-[calc(100%-98px)] rounded-xl border border-zinc-800 bg-zinc-900 py-1.5 shadow-xl">
                {catalogMatches.map((skill) => (
                  <button
                    key={skill.code}
                    type="button"
                    onClick={() => addCustomSkill(skill.name)}
                    className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 mt-2">
                No matching skill in our catalog — try a different search.
              </p>
            )
          ) : null}
        </div>

        {discovery.selectedSkillNames.length === 0 ? (
          <p className="text-xs text-zinc-500 mt-3">Add at least one skill to continue.</p>
        ) : null}
      </div>
    </div>
  );
}
