import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { GithubRepoSummary } from '@smart/contracts';
import { AlertCircle, Loader2, Search, Star } from 'lucide-react';
import { api } from '@/lib/api';
import type { OnboardingProfileForm } from '@/lib/onboarding-form';

interface RepoPickerProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
}

const MIN_REPOS = 3;
const MAX_REPOS = 5;

export default function RepoPicker({ formData, updateField }: RepoPickerProps) {
  const github = formData.socialVerification.github;
  const [repos, setRepos] = useState<GithubRepoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!github?.login) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.users
      .listGithubRepos({ login: github.login })
      .then((response) => {
        if (cancelled) return;
        setRepos(
          [...response.repos].sort(
            (a, b) => b.stars - a.stars || (a.fullName < b.fullName ? -1 : 1),
          ),
        );
      })
      .catch(() => {
        if (!cancelled)
          setError('Could not load your repositories. You can retry or skip this step.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [github?.login]);

  const selected = github?.selectedRepos ?? [];
  const isSelected = (id: number) => selected.some((repo) => repo.id === id);

  const toggle = (repo: GithubRepoSummary) => {
    if (!github) return;
    const already = isSelected(repo.id);
    let next = selected;
    if (already) {
      next = selected.filter((r) => r.id !== repo.id);
    } else if (selected.length < MAX_REPOS) {
      next = [
        ...selected,
        {
          id: repo.id,
          fullName: repo.fullName,
          primaryLanguage: repo.primaryLanguage,
          stars: repo.stars,
        },
      ];
    }
    updateField('socialVerification', {
      ...formData.socialVerification,
      github: { ...github, selectedRepos: next },
    });
  };

  const filtered = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div key="repo-picks">
      <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
          6
        </span>
        Your best work <span className="text-emerald-400">*</span>
      </h3>
      <p className="text-sm text-zinc-400 mb-4 ml-8">
        Pick {MIN_REPOS}-{MAX_REPOS} repositories you&apos;re proud of. We&apos;ll use them to
        suggest skills next.
      </p>

      <div className="ml-8 max-w-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <span
            className={`text-xs font-medium ${
              selected.length >= MIN_REPOS ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {selected.length} of {MAX_REPOS} selected
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Loading your repositories…
          </div>
        ) : error ? (
          <p className="text-xs text-amber-400 flex items-center gap-1 py-4">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {filtered.map((repo, idx) => {
              const active = isSelected(repo.id);
              const disabled = !active && selected.length >= MAX_REPOS;
              return (
                <motion.button
                  key={repo.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(repo)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                  className={`relative text-left rounded-xl border p-3.5 transition-colors ${
                    active
                      ? 'border-emerald-500/60 bg-emerald-500/[0.08]'
                      : disabled
                        ? 'border-zinc-800/40 bg-zinc-950/40 opacity-40 cursor-not-allowed'
                        : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800'
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate pr-4">{repo.fullName}</p>
                  {repo.description ? (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{repo.description}</p>
                  ) : null}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                    {repo.primaryLanguage ? <span>{repo.primaryLanguage}</span> : null}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-emerald-400" /> {repo.stars}
                    </span>
                  </div>
                  {active ? (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  ) : null}
                </motion.button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="text-xs text-zinc-500 col-span-full py-6 text-center">
                No repositories match &quot;{query}&quot;.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
