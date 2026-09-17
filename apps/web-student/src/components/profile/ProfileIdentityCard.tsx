'use client';

import { CheckCircle2, MapPin, Sparkles } from 'lucide-react';
import type {
  AuthenticatedUser,
  CandidateEducationDto,
  CandidateOnboardingJobPreferences,
} from '@smart/contracts';

import { ProfilePhotoEditControl } from '@/components/profile/ProfilePhotoEditControl';
import { primaryInstitutionName } from '@/lib/profile-identity';
import {
  profileCardClass,
  profileHeadingClass,
  profileMutedTextClass,
  profileSecondaryTextClass,
} from '@/lib/profile-ui-classes';

interface ProfileIdentityCardProps {
  user: AuthenticatedUser | undefined;
  education: CandidateEducationDto[];
  jobPreferences:
    | CandidateOnboardingJobPreferences
    | Partial<CandidateOnboardingJobPreferences>
    | null
    | undefined;
  linkedinVerified: boolean;
  githubVerified: boolean;
  institutionLogoUrl?: string | null;
}

export function ProfileIdentityCard({
  user,
  education,
  jobPreferences,
  linkedinVerified,
  githubVerified,
  institutionLogoUrl,
}: ProfileIdentityCardProps) {
  const location = jobPreferences?.currentLocation?.trim();
  const hasJobPrefs =
    Boolean(jobPreferences?.expectedCtcLakhs) &&
    Boolean(location) &&
    (jobPreferences?.preferredLocations?.length ?? 0) > 0;
  const collegeName = primaryInstitutionName(education, user);

  return (
    <div className={profileCardClass}>
      <div className="flex items-start gap-5 md:gap-6">
        <ProfilePhotoEditControl
          fullName={user?.fullName}
          profilePhotoUrl={user?.profilePhotoUrl}
        />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-[25px] font-semibold leading-tight ${profileHeadingClass}`}>
                {user?.fullName?.trim() ?? ''}
              </h2>
              {linkedinVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                  <CheckCircle2 className="h-3 w-3" />
                  LinkedIn
                </span>
              ) : null}
              {githubVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300">
                  <CheckCircle2 className="h-3 w-3" />
                  GitHub
                </span>
              ) : null}
            </div>
            <p
              className={`mt-1 text-[16px] font-medium leading-snug ${
                collegeName ? profileSecondaryTextClass : profileMutedTextClass
              }`}
            >
              {collegeName ?? 'College not added yet'}
            </p>
            <ul className={`mt-3 flex flex-col gap-2 text-[14px] ${profileSecondaryTextClass}`}>
              {location ? (
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                  <span>{location}</span>
                </li>
              ) : null}
              {hasJobPrefs ? (
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                  <span>Open to opportunities</span>
                </li>
              ) : null}
            </ul>
          </div>
          {institutionLogoUrl ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]">
              <img src={institutionLogoUrl} alt="" className="max-h-10 max-w-10 object-contain" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
