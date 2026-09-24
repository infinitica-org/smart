'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import { AtSign, Eye, Loader2, Lock } from 'lucide-react';
import { api } from '@/lib/api';

/** A small animated on/off pill switch — no shared `@smart/ui` primitive for this yet. */
function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 flex-none rounded-full transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-foreground' : 'bg-gray-200 dark:bg-white/10'
      }`}
    >
      <span
        className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

type UsernameFieldState = 'idle' | 'saving' | 'saved' | 'error';

const SECTION_LABELS: Record<string, string> = {
  education: 'Education',
  projects: 'Projects',
  workExperience: 'Work Experience',
  certifications: 'Certifications',
  skills: 'Skills',
};

const SECTION_KEYS = ['education', 'projects', 'workExperience', 'certifications', 'skills'];

export function VisibilitySettingsCard() {
  const queryClient = useQueryClient();
  const {
    data: visibility,
    isLoading: visibilityLoading,
    refetch: refetchVisibility,
  } = useQuery({
    queryKey: ['me', 'visibility'] as const,
    queryFn: () => api.users.getProfileVisibility(),
  });
  const { data: usernameStatus, refetch: refetchUsername } = useQuery({
    queryKey: ['me', 'username'] as const,
    queryFn: () => api.users.getUsernameStatus(),
  });

  // Visibility and username changes can change what the "Copy Link"/"Share Profile"
  // buttons on the parent page point to (the share link switches to the username once
  // it activates) and what the live preview below shows — both queries live in the
  // parent, so they're invalidated here rather than refetched directly.
  const invalidateShareLinkAndPreview = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['me', 'public-profile-link'] }),
      queryClient.invalidateQueries({ queryKey: ['me', 'public-profile'] }),
    ]);

  const [visibilityBusy, setVisibilityBusy] = useState<'profile' | 'inProgress' | 'section' | null>(
    null,
  );
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const [usernameInput, setUsernameInput] = useState('');
  const [usernameState, setUsernameState] = useState<UsernameFieldState>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  async function toggleProfileVisible(next: boolean) {
    setVisibilityBusy('profile');
    setVisibilityError(null);
    try {
      await api.users.updateProfileVisibility({ profileVisible: next });
      await Promise.all([refetchVisibility(), refetchUsername(), invalidateShareLinkAndPreview()]);
    } catch (err) {
      setVisibilityError(isSmartApiError(err) ? err.message : 'Could not update visibility.');
    } finally {
      setVisibilityBusy(null);
    }
  }

  async function toggleShowInProgress(next: boolean) {
    setVisibilityBusy('inProgress');
    setVisibilityError(null);
    try {
      await api.users.updateProfileVisibility({
        profileVisible: visibility?.profileVisible ?? false,
        showInProgressItems: next,
      });
      await Promise.all([
        refetchVisibility(),
        queryClient.invalidateQueries({ queryKey: ['me', 'public-profile'] }),
      ]);
    } catch (err) {
      setVisibilityError(isSmartApiError(err) ? err.message : 'Could not update this setting.');
    } finally {
      setVisibilityBusy(null);
    }
  }

  async function toggleSectionVisibility(sectionKey: string, show: boolean) {
    setVisibilityBusy('section');
    setVisibilityError(null);
    try {
      const currentHidden: string[] =
        (visibility as { hiddenSections?: string[] } | undefined)?.hiddenSections ?? [];
      const nextHidden = show
        ? currentHidden.filter((s: string) => s !== sectionKey)
        : Array.from(new Set([...currentHidden, sectionKey]));
      await api.users.updateProfileVisibility({
        profileVisible: visibility?.profileVisible ?? false,
        showInProgressItems: visibility?.showInProgressItems,
        hiddenSections: nextHidden as never,
      });
      await Promise.all([
        refetchVisibility(),
        queryClient.invalidateQueries({ queryKey: ['me', 'public-profile'] }),
      ]);
    } catch (err) {
      setVisibilityError(
        isSmartApiError(err) ? err.message : 'Could not update section visibility.',
      );
    } finally {
      setVisibilityBusy(null);
    }
  }

  async function reserveUsername() {
    const username = usernameInput.trim();
    if (username.length < 3) {
      setUsernameState('error');
      setUsernameError('Username must be at least 3 characters.');
      return;
    }
    setUsernameState('saving');
    setUsernameError(null);
    try {
      await api.users.reserveUsername({ username });
      setUsernameState('saved');
      // A re-reservation while already ACTIVE (changing handle) changes the share link too.
      await Promise.all([refetchUsername(), invalidateShareLinkAndPreview()]);
      setTimeout(() => setUsernameState('idle'), 2000);
    } catch (err) {
      setUsernameState('error');
      if (isSmartApiError(err)) {
        if (err.code === 'rate_limit_exceeded') {
          const wait = err.retryAfterSeconds ? `${String(err.retryAfterSeconds)}s` : 'a bit';
          setUsernameError(`Too many attempts — try again in ${wait}.`);
        } else {
          setUsernameError(err.message);
        }
      } else {
        setUsernameError('Could not reserve that username.');
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:border-white/5 dark:bg-[#1c1c1e] dark:shadow-[0_12px_40px_rgb(0,0,0,0.15)]">
      <div className="border-b border-gray-100 px-8 py-6 dark:border-white/5">
        <h2 className="flex items-center gap-2 font-display text-lg font-medium text-gray-900 dark:text-white">
          <Eye className="h-4 w-4 text-gray-500" />
          Visibility
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Control whether anyone with your link can see this page, and how much of it.
        </p>
      </div>

      <div className="space-y-6 px-8 py-6">
        {visibilityError ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {visibilityError}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
              {visibility?.profileVisible ? (
                <Eye className="h-4 w-4 text-foreground dark:text-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-gray-400" />
              )}
              Public profile
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {visibility?.profileVisible
                ? 'Your link is live — anyone with it can view this page.'
                : 'Off by default. Your link will 404 until this is on.'}
            </p>
          </div>
          {visibilityLoading ? (
            <Loader2 className="h-4 w-4 flex-none animate-spin text-gray-400" />
          ) : (
            <ToggleSwitch
              checked={visibility?.profileVisible ?? false}
              onChange={(next) => void toggleProfileVisible(next)}
              disabled={visibilityBusy !== null}
              label="Public profile"
            />
          )}
        </div>

        <div
          className={`flex items-center justify-between gap-4 border-t border-gray-100 pt-6 transition-opacity dark:border-white/5 ${
            visibility?.profileVisible ? '' : 'opacity-40'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Show in-progress items
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Off by default — the page shows verified work only. Turn this on to also show
              submitted-but-not-yet-verified work experience and certificates, clearly labeled.
            </p>
          </div>
          <ToggleSwitch
            checked={visibility?.showInProgressItems ?? false}
            onChange={(next) => void toggleShowInProgress(next)}
            disabled={visibilityBusy !== null || !visibility?.profileVisible}
            label="Show in-progress items"
          />
        </div>

        <div
          className={`border-t border-gray-100 pt-6 transition-opacity dark:border-white/5 ${
            visibility?.profileVisible ? '' : 'opacity-40'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Visible profile sections
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Control which sections appear on your public profile page. Unchecking a section hides
              it from view.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {SECTION_KEYS.map((key) => {
              const isVisible = !(
                (visibility as { hiddenSections?: string[] } | undefined)?.hiddenSections ?? []
              ).includes(key);
              return (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {SECTION_LABELS[key]}
                  </span>
                  <ToggleSwitch
                    checked={isVisible}
                    onChange={(nextShow) => void toggleSectionVisibility(key, nextShow)}
                    disabled={visibilityBusy !== null || !visibility?.profileVisible}
                    label={`Show ${SECTION_LABELS[key]} section`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 dark:border-white/5">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <AtSign className="h-4 w-4 text-gray-500" />
            Username
          </p>

          {usernameStatus?.username ? (
            <>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Your handle — one-time claim, it can&apos;t be changed.
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 rounded-full border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-4 dark:border-white/10 dark:bg-white/5">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  @{usernameStatus.username}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                    usernameStatus.status === 'ACTIVE'
                      ? 'bg-foreground/10 text-foreground dark:text-foreground'
                      : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                  }`}
                >
                  {usernameStatus.status === 'ACTIVE' ? 'Active' : 'Reserved'}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {usernameStatus.status === 'RESERVED'
                  ? 'Held for you — turn on your public profile to activate it.'
                  : 'Live on your public profile.'}
              </p>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Claim a username to hold your handle — a one-time choice, so pick carefully.
                Claiming it doesn&apos;t make your profile public by itself — that&apos;s the toggle
                above.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-400">
                    @
                  </span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      setUsernameState('idle');
                      setUsernameError(null);
                    }}
                    placeholder="your-handle"
                    className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-8 text-sm text-gray-900 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/30 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void reserveUsername()}
                  disabled={usernameState === 'saving' || usernameInput.trim().length === 0}
                  className="flex flex-none items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm hover:bg-foreground/90 disabled:opacity-50"
                >
                  {usernameState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Claim it
                </button>
              </div>

              {usernameError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{usernameError}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
