'use client';

import Link from 'next/link';
import { CheckCircle2, Info } from 'lucide-react';
import type { AuthenticatedUser, CandidateEducationDto } from '@smart/contracts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@smart/ui/tooltip';

import { ProfileAvatarProgressRing } from '@/components/profile/ProfileAvatarProgressRing';
import { ProfilePhotoEditControl } from '@/components/profile/ProfilePhotoEditControl';
import { PROFILE_AREA_HREFS, PROFILE_AREA_IDS, type ProfileAreaId } from '@/lib/profile-progress';
import {
  primaryBatchLabel,
  primaryDepartmentName,
  primaryInstitutionName,
} from '@/lib/profile-identity';
import {
  profileCardClass,
  profileHeadingClass,
  profileMutedTextClass,
  profileSecondaryTextClass,
} from '@/lib/profile-ui-classes';

const PROFILE_COMPLETION_HELP =
  'Profile completion tracks the sections recruiters and placement teams expect—skills, education, experience, and more. A complete profile improves matching; gaps may cause you to be skipped.';

interface ProfileHeroBannerProps {
  user: AuthenticatedUser | undefined;
  education: CandidateEducationDto[];
  linkedinVerified: boolean;
  githubVerified: boolean;
  percent: number | null;
  completedCount: number | null;
  areaStatus?: Partial<Record<ProfileAreaId, boolean>>;
  loading?: boolean;
}

function firstIncompleteAreaHref(
  areaStatus: Partial<Record<ProfileAreaId, boolean>> | undefined,
): string {
  const incomplete = PROFILE_AREA_IDS.find((id) => !areaStatus?.[id]);
  return incomplete ? PROFILE_AREA_HREFS[incomplete] : '/profile?section=experience';
}

const HERO_AVATAR_CLASS =
  'h-[104px] w-[104px] shrink-0 rounded-full border-0 bg-[var(--ds-surface-muted)] text-2xl font-semibold text-[var(--ds-text)]';

const VERIFIED_BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-secondary)]';

export function ProfileHeroBanner({
  user,
  education,
  linkedinVerified,
  githubVerified,
  percent,
  completedCount,
  areaStatus,
  loading = false,
}: ProfileHeroBannerProps) {
  const collegeName = primaryInstitutionName(education, user);
  const departmentName = primaryDepartmentName(education);
  const batchLabel = primaryBatchLabel(education);
  const hasEducation = education.length > 0;
  const safePercent = percent ?? 0;
  const total = PROFILE_AREA_IDS.length;
  const completed = completedCount ?? 0;

  return (
    <section aria-label="Profile summary" data-testid="profile-hero-banner" className="pt-12">
      <div className={`${profileCardClass} relative overflow-visible px-0 pb-6 pt-0`}>
        <div className="grid gap-8 px-5 pt-6 md:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-10 lg:pb-7 lg:pt-5">
          <div className="min-w-0 space-y-1 pt-2 text-center lg:space-y-1.5 lg:pt-14 lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:justify-start">
              <h2
                className={`text-[22px] font-semibold leading-tight md:text-[25px] ${profileHeadingClass}`}
              >
                {user?.fullName?.trim() || 'Your name'}
              </h2>
              {linkedinVerified ? (
                <span className={VERIFIED_BADGE_CLASS}>
                  <CheckCircle2 className="h-3 w-3 text-[var(--ds-green)]" aria-hidden="true" />
                  LinkedIn
                </span>
              ) : null}
              {githubVerified ? (
                <span className={VERIFIED_BADGE_CLASS}>
                  <CheckCircle2 className="h-3 w-3 text-[var(--ds-green)]" aria-hidden="true" />
                  GitHub
                </span>
              ) : null}
            </div>

            {departmentName ? (
              <p
                className={`text-[15px] font-semibold leading-snug md:text-[17px] ${profileHeadingClass}`}
              >
                {departmentName}
              </p>
            ) : hasEducation ? (
              <p
                className={`text-[15px] font-medium leading-snug md:text-[16px] ${profileMutedTextClass}`}
              >
                Department not added yet
              </p>
            ) : null}

            {batchLabel || collegeName || hasEducation ? (
              <div
                className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] leading-snug lg:justify-start ${profileMutedTextClass}`}
              >
                {batchLabel ? (
                  <span className="inline-flex rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-[var(--ds-text-secondary)]">
                    {batchLabel}
                  </span>
                ) : null}
                {batchLabel && collegeName ? (
                  <span aria-hidden="true" className="text-[var(--ds-text-subtle)]">
                    ·
                  </span>
                ) : null}
                {collegeName ? (
                  <span className="font-medium text-[var(--ds-text-muted)]">{collegeName}</span>
                ) : hasEducation ? (
                  <span>College not added yet</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="-mt-14 flex flex-col items-center lg:-mt-16 lg:justify-self-end">
            <ProfileAvatarProgressRing percent={safePercent} loading={loading}>
              <ProfilePhotoEditControl
                fullName={user?.fullName}
                profilePhotoUrl={user?.profilePhotoUrl}
                avatarClassName={HERO_AVATAR_CLASS}
                fallbackClassName="rounded-full bg-[var(--ds-green-soft)] text-2xl font-semibold text-[var(--ds-green)]"
              />
            </ProfileAvatarProgressRing>

            {loading ? (
              <p className={`mt-3 text-sm ${profileSecondaryTextClass}`}>Loading progress…</p>
            ) : (
              <>
                <p
                  className={`mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[13px] font-medium ${profileSecondaryTextClass}`}
                >
                  <span className="font-semibold text-[var(--ds-green)]">{safePercent}%</span>
                  <span>Profile completion</span>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="What is profile completion?"
                          className="inline-flex rounded-full p-0.5 text-[var(--ds-text-subtle)] transition-colors hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)]"
                        >
                          <Info className="size-3.5 shrink-0" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="max-w-[260px] text-left"
                      >
                        {PROFILE_COMPLETION_HELP}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
                <p className={`mt-1 text-[12px] ${profileMutedTextClass}`}>
                  {completed} of {total} sections complete
                </p>
                {completed < total ? (
                  <Link
                    href={firstIncompleteAreaHref(areaStatus)}
                    className="mt-1.5 inline-flex text-[12px] font-medium text-[var(--ds-green)] hover:text-[var(--ds-green-hover)]"
                  >
                    View missing sections →
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
