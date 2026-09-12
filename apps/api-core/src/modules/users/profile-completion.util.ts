import type { CandidateOnboardingDraft, CandidateOnboardingProfile } from '@smart/contracts';

export const PROFILE_AREA_IDS = [
  'skills',
  'languages',
  'education',
  'experience',
  'projects',
  'certifications',
  'professionalLinks',
  'jobPreferences',
] as const;

export type ProfileAreaId = (typeof PROFILE_AREA_IDS)[number];

const AREA_COUNT = PROFILE_AREA_IDS.length;
export const PROFILE_SKILL_VERIFICATION_UNLOCK_PERCENT = 100;

export interface ProfileProgressInput {
  skillClaims: ReadonlyArray<unknown>;
  onboardingProfile: CandidateOnboardingProfile | null;
  onboardingDraft: CandidateOnboardingDraft | null;
  languages: ReadonlyArray<unknown>;
  education: ReadonlyArray<unknown>;
  experiences: ReadonlyArray<unknown>;
  projects: ReadonlyArray<unknown>;
  certificates: ReadonlyArray<unknown>;
}

export interface ProfileProgressResult {
  percent: number;
  completedAreas: ProfileAreaId[];
  incompleteAreas: ProfileAreaId[];
  areaStatus: Record<ProfileAreaId, boolean>;
}

function onboardingSkills(
  profile: CandidateOnboardingProfile | null,
  draft: CandidateOnboardingDraft | null,
) {
  return profile?.skills ?? draft?.skills ?? [];
}

function jobPreferencesFromOnboarding(
  profile: CandidateOnboardingProfile | null,
  draft: CandidateOnboardingDraft | null,
) {
  return profile?.jobPreferences ?? draft?.jobPreferences ?? null;
}

function urlFromOnboarding(
  profile: CandidateOnboardingProfile | null,
  draft: CandidateOnboardingDraft | null,
  field: 'linkedinUrl' | 'githubUrl',
): string {
  const value = profile?.[field] ?? draft?.[field];
  return typeof value === 'string' ? value.trim() : '';
}

export function isSkillsAreaComplete(input: ProfileProgressInput): boolean {
  if (input.skillClaims.length > 0) return true;
  return onboardingSkills(input.onboardingProfile, input.onboardingDraft).some((skill) =>
    Boolean(skill.name?.trim()),
  );
}

export function isLanguagesAreaComplete(input: ProfileProgressInput): boolean {
  return input.languages.length > 0;
}

export function isEducationAreaComplete(input: ProfileProgressInput): boolean {
  return input.education.length > 0;
}

export function isExperienceAreaComplete(input: ProfileProgressInput): boolean {
  return input.experiences.length > 0;
}

export function isProjectsAreaComplete(input: ProfileProgressInput): boolean {
  return input.projects.length > 0;
}

export function isCertificationsAreaComplete(input: ProfileProgressInput): boolean {
  return input.certificates.length > 0;
}

export function isProfessionalLinksAreaComplete(input: ProfileProgressInput): boolean {
  const linkedin = urlFromOnboarding(input.onboardingProfile, input.onboardingDraft, 'linkedinUrl');
  const github = urlFromOnboarding(input.onboardingProfile, input.onboardingDraft, 'githubUrl');
  return linkedin.length > 0 || github.length > 0;
}

export function isJobPreferencesAreaComplete(input: ProfileProgressInput): boolean {
  const prefs = jobPreferencesFromOnboarding(input.onboardingProfile, input.onboardingDraft);
  if (!prefs) return false;
  const hasExpected =
    prefs.expectedCtcLakhs !== undefined &&
    prefs.expectedCtcLakhs !== null &&
    Number(prefs.expectedCtcLakhs) > 0;
  const hasLocation = Boolean(prefs.currentLocation?.trim());
  const hasPreferred = (prefs.preferredLocations?.length ?? 0) > 0;
  return hasExpected && hasLocation && hasPreferred;
}

export function computeAreaStatus(input: ProfileProgressInput): Record<ProfileAreaId, boolean> {
  return {
    skills: isSkillsAreaComplete(input),
    languages: isLanguagesAreaComplete(input),
    education: isEducationAreaComplete(input),
    experience: isExperienceAreaComplete(input),
    projects: isProjectsAreaComplete(input),
    certifications: isCertificationsAreaComplete(input),
    professionalLinks: isProfessionalLinksAreaComplete(input),
    jobPreferences: isJobPreferencesAreaComplete(input),
  };
}

export function computeProfileCompletion(input: ProfileProgressInput): ProfileProgressResult {
  const areaStatus = computeAreaStatus(input);
  const completedAreas = PROFILE_AREA_IDS.filter((id) => areaStatus[id]);
  const incompleteAreas = PROFILE_AREA_IDS.filter((id) => !areaStatus[id]);
  const percent = Math.round((completedAreas.length / AREA_COUNT) * 100);

  return {
    percent,
    completedAreas,
    incompleteAreas,
    areaStatus,
  };
}

export function canVerifySkills(percent: number | null | undefined): boolean {
  return (percent ?? 0) >= PROFILE_SKILL_VERIFICATION_UNLOCK_PERCENT;
}

export function isProfileCompleteForSkillVerification(input: ProfileProgressInput): boolean {
  return canVerifySkills(computeProfileCompletion(input).percent);
}
