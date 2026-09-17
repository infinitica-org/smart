import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { FetchGithubProfileResponse } from '@smart/contracts';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { api } from '@/lib/api';
import type { OnboardingProfileForm } from '@/lib/onboarding-form';

interface SocialVerificationProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
}

// lucide-react dropped brand/logo glyphs; these mirror @smart/ui's
// candidate-profile-card icons so GitHub/LinkedIn read consistently everywhere.
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function extractLinkedinUsername(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.replace(/^linkedin\.com\/in\//i, '');
  cleaned = (cleaned.split('/')[0] ?? '').replace(/\/+$|^[/\s]+/g, '');
  return cleaned;
}

function extractGithubUsername(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.replace(/^github\.com\//i, '');
  cleaned = (cleaned.split('/')[0] ?? '').replace(/\/+$|^[/\s]+/g, '');
  return cleaned;
}

export default function SocialVerification({ formData, updateField }: SocialVerificationProps) {
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  const [githubPreview, setGithubPreview] = useState<FetchGithubProfileResponse | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  const linkedin = formData.socialVerification.linkedin;
  const github = formData.socialVerification.github;

  const linkedinUsername = extractLinkedinUsername(formData.linkedinUrl);
  const githubUsername = extractGithubUsername(formData.githubUrl);

  const handleVerifyLinkedin = async () => {
    if (!formData.linkedinUrl.trim()) return;
    setLinkedinLoading(true);
    setLinkedinError(null);
    try {
      const { url } = await api.users.linkedinOauthUrl();
      window.location.href = url;
    } catch {
      setLinkedinError('Could not start LinkedIn verification. You can still continue without it.');
      setLinkedinLoading(false);
    }
  };

  const handlePreviewGithub = async () => {
    if (!formData.githubUrl.trim()) return;
    setGithubLoading(true);
    setGithubError(null);
    setGithubPreview(null);
    try {
      const profile = await api.users.fetchGithubProfile({ githubUrl: formData.githubUrl });
      setGithubPreview(profile);
    } catch (error) {
      const message =
        isSmartApiError(error) && error.code === 'github_user_not_found'
          ? 'No such user found'
          : 'GitHub is unavailable right now. You can skip this and add it later.';
      setGithubError(message);
    } finally {
      setGithubLoading(false);
    }
  };

  const confirmGithub = () => {
    if (!githubPreview) return;
    updateField('socialVerification', {
      ...formData.socialVerification,
      github: {
        verified: true,
        verifiedAt: new Date().toISOString(),
        login: githubPreview.login,
        name: githubPreview.name,
        avatarUrl: githubPreview.avatarUrl,
        publicRepoCount: githubPreview.publicRepoCount,
        selectedRepos: github?.selectedRepos ?? [],
      },
    });
    setGithubPreview(null);
  };

  const rejectGithub = () => {
    setGithubPreview(null);
    setGithubError(null);
  };

  const disconnectGithub = () => {
    updateField('githubUrl', '');
    updateField('socialVerification', { ...formData.socialVerification, github: null });
  };

  const inputClass =
    'w-full rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface)] py-3 text-[var(--ds-text)] transition-all placeholder:text-[var(--ds-text-subtle)] focus:border-[var(--ds-green)]/40 focus:outline-none focus:ring-0 disabled:opacity-60';
  const prefixClass =
    'select-none text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text-muted)]';
  const labelClass =
    'flex items-center gap-2 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text-secondary)]';
  const verifiedPanelClass =
    'mt-1 flex items-center gap-3 rounded-[14px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]/45 p-3 ring-1 ring-[#101828]/[0.04]';
  const secondaryBtnClass =
    'mt-1 inline-flex h-10 w-fit items-center justify-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-white/70 px-4 text-[13px] font-semibold text-[var(--ds-text)] transition hover:bg-[var(--ds-surface-muted)]/60 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div key="social" className="flex flex-col gap-8">
      {/* LinkedIn */}
      <div className="flex flex-col gap-2.5">
        <label className={labelClass}>
          <LinkedinIcon className="size-4 text-[var(--ds-text)]" />
          LinkedIn Profile <span className="text-red-600">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className={prefixClass}>linkedin.com/in/</span>
          </div>
          <input
            type="text"
            aria-label="LinkedIn username"
            value={linkedinUsername}
            onChange={(e) => {
              const uname = extractLinkedinUsername(e.target.value);
              updateField('linkedinUrl', uname ? `https://linkedin.com/in/${uname}` : '');
            }}
            placeholder="username"
            className={`${inputClass} pl-[128px] pr-4`}
          />
        </div>

        <AnimatePresence mode="wait">
          {linkedin?.verified ? (
            <motion.div
              key="linkedin-verified"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className={verifiedPanelClass}
            >
              {linkedin.pictureUrl ? (
                <img
                  src={linkedin.pictureUrl}
                  alt=""
                  className="size-9 rounded-full border border-[var(--ds-border-subtle)] object-cover"
                />
              ) : (
                <div className="size-9 rounded-full bg-[var(--ds-surface-muted)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--ds-text)]">
                  {linkedin.name ?? 'LinkedIn verified'}
                </p>
                <p className="flex items-center gap-1 text-xs text-[var(--ds-green)]">
                  <CheckCircle2 className="size-3" /> Verified via LinkedIn sign-in
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleVerifyLinkedin()}
                className="shrink-0 text-xs font-medium text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
              >
                Re-verify
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="linkedin-cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type="button"
              disabled={!formData.linkedinUrl.trim() || linkedinLoading}
              onClick={() => void handleVerifyLinkedin()}
              className={`${secondaryBtnClass} border-[#0a66c2]/25 text-[#0a66c2] hover:bg-[#0a66c2]/5`}
            >
              {linkedinLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LinkedinIcon className="size-4" />
              )}
              Verify with LinkedIn
            </motion.button>
          )}
        </AnimatePresence>
        {linkedinError ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
            <AlertCircle className="w-3.5 h-3.5" /> {linkedinError}
          </p>
        ) : null}
      </div>

      {/* GitHub */}
      <div className="flex flex-col gap-2.5">
        <label className={labelClass}>
          <GithubIcon className="size-4" />
          GitHub Profile <span className="font-normal text-[var(--ds-text-muted)]">(Optional)</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className={prefixClass}>github.com/</span>
          </div>
          <input
            type="text"
            aria-label="GitHub username"
            value={githubUsername}
            onChange={(e) => {
              const uname = extractGithubUsername(e.target.value);
              updateField('githubUrl', uname ? `https://github.com/${uname}` : '');
              setGithubPreview(null);
              setGithubError(null);
            }}
            autoComplete="username"
            placeholder="username"
            disabled={Boolean(github?.verified)}
            className={`${inputClass} pl-[108px] pr-4`}
          />
        </div>

        {!github?.verified && (
          <button
            type="button"
            disabled={!formData.githubUrl.trim() || githubLoading}
            onClick={() => void handlePreviewGithub()}
            className={secondaryBtnClass}
          >
            {githubLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GithubIcon className="size-4" />
            )}
            Fetch profile
          </button>
        )}

        <AnimatePresence>
          {githubPreview ? (
            <motion.div
              key="github-preview"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className={`${verifiedPanelClass} items-start`}
            >
              <img
                src={githubPreview.avatarUrl}
                alt=""
                className="h-10 w-10 rounded-full border border-border object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {githubPreview.name ?? githubPreview.login}{' '}
                  <span className="font-normal text-muted-foreground">@{githubPreview.login}</span>
                </p>
                {githubPreview.bio ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {githubPreview.bio}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {githubPreview.publicRepoCount} public repositories
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={confirmGithub}
                    className="h-8 rounded-[9px] bg-[var(--ds-green)] px-3 text-xs font-semibold text-white hover:bg-[var(--ds-green-hover)]"
                  >
                    Yes, that&apos;s me
                  </button>
                  <button
                    type="button"
                    onClick={rejectGithub}
                    className="h-8 rounded-[9px] border border-[var(--ds-border)] px-3 text-xs text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
                  >
                    Not me
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}

          {github?.verified ? (
            <motion.div
              key="github-verified"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className={verifiedPanelClass}
            >
              <img
                src={github.avatarUrl}
                alt=""
                className="size-9 rounded-full border border-[var(--ds-border-subtle)] object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--ds-text)]">
                  {github.name ?? github.login}
                </p>
                <p className="flex items-center gap-1 text-xs text-[var(--ds-green)]">
                  <CheckCircle2 className="size-3" /> Confirmed — pick your best repo below
                </p>
              </div>
              <button
                type="button"
                onClick={disconnectGithub}
                className="shrink-0 text-xs font-medium text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
              >
                Disconnect
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {githubError ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
            <AlertCircle className="w-3.5 h-3.5" /> {githubError}
          </p>
        ) : null}
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ds-text-subtle)]">
          We only read public repository metadata and language stats — nothing private, no write
          access.
        </p>
      </div>
    </div>
  );
}
