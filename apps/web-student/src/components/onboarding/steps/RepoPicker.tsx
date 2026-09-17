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

const MIN_REPOS = 1;
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
        // Most stars first — this also is exactly the "best repo" heuristic
        // used below to pre-select a sensible default.
        const sorted = [...response.repos].sort(
          (a, b) => b.stars - a.stars || (a.fullName < b.fullName ? -1 : 1),
        );
        setRepos(sorted);
        // Pull/identify the candidate's best repo automatically so they don't
        // start from a blank picker — they can still swap or add more.
        const best = sorted[0];
        if (best && (github.selectedRepos?.length ?? 0) === 0) {
          updateField('socialVerification', {
            ...formData.socialVerification,
            github: {
              ...github,
              selectedRepos: [
                {
                  id: best.id,
                  fullName: best.fullName,
                  primaryLanguage: best.primaryLanguage,
                  stars: best.stars,
                },
              ],
            },
          });
        }
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
      <p className="mb-4 text-sm text-muted-foreground">
        We picked your top starred repo as your best work — swap it or add up to {MAX_REPOS} more.
      </p>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories"
              className="w-full rounded-lg border border-border bg-muted py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </div>
          <span
            className={`text-xs font-medium ${
              selected.length >= MIN_REPOS ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {selected.length} of {MAX_REPOS} selected
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-foreground" /> Loading your repositories…
          </div>
        ) : error ? (
          <p className="text-xs text-amber-500 flex items-center gap-1 py-4">
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
                      ? 'border-foreground/40 bg-muted/[0.08]'
                      : disabled
                        ? 'cursor-not-allowed border-border bg-muted/40 opacity-40'
                        : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <p className="truncate pr-4 text-sm font-medium text-foreground">
                    {repo.fullName}
                  </p>
                  {repo.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {repo.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {repo.primaryLanguage ? <span>{repo.primaryLanguage}</span> : null}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-foreground" /> {repo.stars}
                    </span>
                  </div>
                  {active ? (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-muted text-background flex items-center justify-center text-[10px] font-bold">
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
