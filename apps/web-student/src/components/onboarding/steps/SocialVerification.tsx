import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { FetchGithubProfileResponse } from '@smart/contracts';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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
  cleaned = cleaned.replace(/\/+$|^[/\s]+/g, '');
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
        error instanceof Error && error.message.includes('404')
          ? 'No public GitHub profile found at that URL.'
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

  return (
    <div key="social" className="flex flex-col gap-6">
      {/* LinkedIn */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <LinkedinIcon className="w-4 h-4 text-[#0a66c2]" />
          LinkedIn Profile <span className="text-emerald-400">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-zinc-500 text-sm font-medium select-none">linkedin.com/in/</span>
          </div>
          <input
            type="text"
            value={linkedinUsername}
            onChange={(e) => {
              const uname = extractLinkedinUsername(e.target.value);
              updateField('linkedinUrl', uname ? `https://linkedin.com/in/${uname}` : '');
            }}
            placeholder="username"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-[128px] pr-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
              className="mt-1 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3"
            >
              {linkedin.pictureUrl ? (
                <img
                  src={linkedin.pictureUrl}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-zinc-800"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-zinc-800" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {linkedin.name ?? 'LinkedIn verified'}
                </p>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified via LinkedIn sign-in
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleVerifyLinkedin()}
                className="text-xs text-zinc-400 hover:text-white shrink-0"
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
              className="mt-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#0a66c2]/40 bg-[#0a66c2]/10 text-sm font-medium text-[#5b9bd9] hover:bg-[#0a66c2]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-fit"
            >
              {linkedinLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LinkedinIcon className="w-4 h-4" />
              )}
              Verify with LinkedIn
            </motion.button>
          )}
        </AnimatePresence>
        {linkedinError ? (
          <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3.5 h-3.5" /> {linkedinError}
          </p>
        ) : null}
      </div>

      {/* GitHub */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <GithubIcon className="w-4 h-4" />
          GitHub Profile <span className="text-zinc-500 font-normal">(Optional)</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-zinc-500 text-sm">https://</span>
          </div>
          <input
            type="text"
            value={formData.githubUrl}
            onChange={(e) => {
              updateField('githubUrl', e.target.value);
              setGithubPreview(null);
              setGithubError(null);
            }}
            autoComplete="url"
            placeholder="github.com/you"
            disabled={Boolean(github?.verified)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-16 pr-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-60"
          />
        </div>

        {!github?.verified && (
          <button
            type="button"
            disabled={!formData.githubUrl.trim() || githubLoading}
            onClick={() => void handlePreviewGithub()}
            className="mt-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-fit"
          >
            {githubLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GithubIcon className="w-4 h-4" />
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
              className="mt-1 flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3"
            >
              <img
                src={githubPreview.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-zinc-800"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {githubPreview.name ?? githubPreview.login}{' '}
                  <span className="text-zinc-400 font-normal">@{githubPreview.login}</span>
                </p>
                {githubPreview.bio ? (
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{githubPreview.bio}</p>
                ) : null}
                <p className="text-xs text-zinc-500 mt-1">
                  {githubPreview.publicRepoCount} public repositories
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={confirmGithub}
                    className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Yes, that&apos;s me
                  </button>
                  <button
                    type="button"
                    onClick={rejectGithub}
                    className="h-8 px-3 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white text-xs"
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
              className="mt-1 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3"
            >
              <img
                src={github.avatarUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-zinc-800"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {github.name ?? github.login}
                </p>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Confirmed — pick your best repo below
                </p>
              </div>
              <button
                type="button"
                onClick={disconnectGithub}
                className="text-xs text-zinc-400 hover:text-white shrink-0"
              >
                Disconnect
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {githubError ? (
          <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3.5 h-3.5" /> {githubError}
          </p>
        ) : null}
        <p className="text-[11px] text-zinc-500 mt-0.5">
          We only read public repository metadata and language stats — nothing private, no write
          access.
        </p>
      </div>
    </div>
  );
}
