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
        <span className="w-6 h-6 rounded-full bg-[#00fad0]/20 text-[#00967c] dark:text-[#00fad0] flex items-center justify-center text-xs font-bold">
          6
        </span>
        Your best work <span className="text-[#00fad0]">*</span>
      </h3>
      <p className="text-sm text-gray-400 mb-4 ml-8">
        Pick {MIN_REPOS}-{MAX_REPOS} repositories you&apos;re proud of. We&apos;ll use them to
        suggest skills next.
      </p>

      <div className="ml-8 max-w-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50"
            />
          </div>
          <span
            className={`text-xs font-medium ${
              selected.length >= MIN_REPOS ? 'text-[#00fad0]' : 'text-white/40'
            }`}
          >
            {selected.length} of {MAX_REPOS} selected
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-white/40 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your repositories…
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
                      ? 'border-[#00fad0]/60 bg-[#00fad0]/[0.08]'
                      : disabled
                        ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
                        : 'border-white/10 bg-white/5 hover:bg-white/[0.08]'
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate pr-4">{repo.fullName}</p>
                  {repo.description ? (
                    <p className="text-xs text-white/40 mt-1 line-clamp-2">{repo.description}</p>
                  ) : null}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-white/35">
                    {repo.primaryLanguage ? <span>{repo.primaryLanguage}</span> : null}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" /> {repo.stars}
                    </span>
                  </div>
                  {active ? (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#00fad0] text-[#0a0a0a] flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  ) : null}
                </motion.button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="text-xs text-white/30 col-span-full py-6 text-center">
                No repositories match &quot;{query}&quot;.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
