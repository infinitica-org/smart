'use client';

import Link from 'next/link';
import { CheckCircle2, Info, Building2, GraduationCap } from 'lucide-react';
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
  'h-[96px] w-[96px] shrink-0 rounded-full border-0 bg-zinc-100 text-2xl font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white';

const VERIFIED_BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';

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
    <section
      aria-label="Profile summary"
      data-testid="profile-hero-banner"
      className="font-sans select-none"
    >
      <div className="rounded-md border border-zinc-200/80 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Avatar with Progress Ring */}
            <div className="flex shrink-0 items-center justify-center">
              <ProfileAvatarProgressRing percent={safePercent} loading={loading}>
                <ProfilePhotoEditControl
                  fullName={user?.fullName}
                  profilePhotoUrl={user?.profilePhotoUrl}
                  avatarClassName={HERO_AVATAR_CLASS}
                  fallbackClassName="rounded-full bg-zinc-900 text-2xl font-bold text-white dark:bg-white dark:text-zinc-900"
                />
              </ProfileAvatarProgressRing>
            </div>

            {/* Profile Text Info */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
                  {user?.fullName?.trim() || 'Your Name'}
                </h1>
                {linkedinVerified && (
                  <span className={VERIFIED_BADGE_CLASS}>
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    LinkedIn Verified
                  </span>
                )}
                {githubVerified && (
                  <span className={VERIFIED_BADGE_CLASS}>
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    GitHub Verified
                  </span>
                )}
              </div>

              {departmentName ? (
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {departmentName}
                </p>
              ) : hasEducation ? (
                <p className="text-xs text-zinc-400">Department not added yet</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {batchLabel && (
                  <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <GraduationCap className="size-3 mr-1 text-zinc-500 inline" />
                    {batchLabel}
                  </span>
                )}
                {collegeName ? (
                  <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                    <Building2 className="size-3.5 text-zinc-400" />
                    {collegeName}
                  </span>
                ) : hasEducation ? (
                  <span>College not specified</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: Verification Progress Pill Card */}
          <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0 border-t lg:border-t-0 border-zinc-100 pt-4 lg:pt-0 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-extrabold text-zinc-950 dark:text-white">
                {safePercent}%
              </span>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Profile Readiness
              </span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="What is profile readiness?"
                      className="rounded-full p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      <Info className="size-3.5 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6} className="max-w-[260px] text-xs">
                    {PROFILE_COMPLETION_HELP}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <p className="text-[11px] text-zinc-400">
              {completed} of {total} verification modules complete
            </p>

            {completed < total && (
              <Link
                href={firstIncompleteAreaHref(areaStatus)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-200 pt-0.5"
              >
                Complete missing sections →
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
