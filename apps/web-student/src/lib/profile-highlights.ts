import type {
  CandidateEducationDto,
  CandidateOnboardingDraft,
  CandidateOnboardingProfile,
  WorkExperienceDto,
} from '@smart/contracts';

export interface ProfileHighlightExperience {
  primary: string;
  secondary: string;
}

export interface ProfileHighlightEducation {
  primary: string;
  secondary: string;
}

export interface ProfileHighlightLocation {
  primary: string;
  secondary: string;
}

export interface ProfileHighlightRolePreference {
  primary: string;
  secondary: string;
}

export interface ProfileHighlightsData {
  experience: ProfileHighlightExperience | null;
  education: ProfileHighlightEducation | null;
  location: ProfileHighlightLocation | null;
  rolePreference: ProfileHighlightRolePreference | null;
}

function jobPreferencesFromOnboarding(
  profile: CandidateOnboardingProfile | null,
  draft: CandidateOnboardingDraft | null,
) {
  return profile?.jobPreferences ?? draft?.jobPreferences ?? null;
}

function parseYearMonth(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/u.test(trimmed)) {
    const parsed = new Date(`${trimmed}-01T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (/^\d{4}$/u.test(trimmed)) {
    const parsed = new Date(`${trimmed}-01-01T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function experienceYearsSummary(
  experiences: WorkExperienceDto[],
): ProfileHighlightExperience | null {
  if (experiences.length === 0) return null;

  const starts = experiences
    .map((exp) => parseYearMonth(exp.startDate))
    .filter((d): d is Date => d !== null);
  if (starts.length === 0) {
    return {
      primary: `${experiences.length} role${experiences.length === 1 ? '' : 's'}`,
      secondary: 'Experience on profile',
    };
  }

  const earliest = starts.reduce((min, d) => (d < min ? d : min), starts[0] as Date);
  const now = new Date();
  const years = Math.max(0, now.getUTCFullYear() - earliest.getUTCFullYear());
  const primary = years >= 1 ? `${years}+ years` : 'Under 1 year';
  return {
    primary,
    secondary: experiences.length === 1 ? '1 role listed' : `${experiences.length} roles listed`,
  };
}

function educationSummary(education: CandidateEducationDto[]): ProfileHighlightEducation | null {
  if (education.length === 0) return null;
  const entry = education[0];
  if (!entry) return null;
  const primary = entry.degree?.trim() || entry.institutionName?.trim() || 'Education added';
  const secondary =
    entry.fieldOfStudy?.trim() || entry.institutionName?.trim() || 'Details on profile';
  return { primary, secondary };
}

const WORK_MODE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

function locationSummary(
  profile: CandidateOnboardingProfile | null,
  draft: CandidateOnboardingDraft | null,
  prefsPreferred: string[] | undefined,
): ProfileHighlightLocation | null {
  const prefs = jobPreferencesFromOnboarding(profile, draft);
  const city = prefs?.currentLocation?.trim();
  if (!city) return null;

  const preferred = prefsPreferred ?? prefs?.preferredLocations ?? [];
  const secondary =
    preferred.length > 0
      ? preferred.includes(city)
        ? 'Open to relocate'
        : `Prefers ${preferred.slice(0, 2).join(', ')}`
      : 'Current location';

  return { primary: city, secondary };
}

function rolePreferenceSummary(
  roleHeadline: string,
  profile: CandidateOnboardingProfile | null,
  draft: CandidateOnboardingDraft | null,
): ProfileHighlightRolePreference | null {
  const prefs = jobPreferencesFromOnboarding(profile, draft);
  if (!prefs) return null;
  const modes = prefs.preferredWorkModes ?? [];
  const modeLabel =
    modes.length > 0 ? modes.map((mode) => WORK_MODE_LABELS[mode] ?? mode).join(', ') : null;

  const primary = roleHeadline.replace(/\s+candidate$/iu, '').trim() || roleHeadline;
  if (!modeLabel && !prefs.expectedCtcLakhs) return null;

  return {
    primary: primary || 'Role preferences',
    secondary: modeLabel ?? 'Preferences saved',
  };
}

export function buildProfileHighlights(input: {
  experiences: WorkExperienceDto[];
  education: CandidateEducationDto[];
  onboardingProfile: CandidateOnboardingProfile | null;
  onboardingDraft: CandidateOnboardingDraft | null;
  roleHeadline: string;
}): ProfileHighlightsData {
  const prefs = jobPreferencesFromOnboarding(input.onboardingProfile, input.onboardingDraft);

  return {
    experience: experienceYearsSummary(input.experiences),
    education: educationSummary(input.education),
    location: locationSummary(
      input.onboardingProfile,
      input.onboardingDraft,
      prefs?.preferredLocations,
    ),
    rolePreference: rolePreferenceSummary(
      input.roleHeadline,
      input.onboardingProfile,
      input.onboardingDraft,
    ),
  };
}
