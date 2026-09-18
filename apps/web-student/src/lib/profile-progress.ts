import type {
  CandidateCertificateDto,
  CandidateEducationDto,
  CandidateLanguageDto,
  CandidateOnboardingDraft,
  CandidateOnboardingProfile,
  ProjectDto,
  SkillClaimDto,
  WorkExperienceDto,
} from '@smart/contracts';
import { skillNameForCode } from './skill-declarations';

export const PROFILE_AREA_IDS = [
  'skills',
  'languages',
  'education',
  'experience',
  'projects',
  'certifications',
  'professionalLinks',
] as const;

export type ProfileAreaId = (typeof PROFILE_AREA_IDS)[number];

export const PROFILE_AREA_LABELS: Record<ProfileAreaId, string> = {
  skills: 'Skills',
  languages: 'Languages',
  education: 'Education',
  experience: 'Experience',
  projects: 'Projects',
  certifications: 'Certifications',
  professionalLinks: 'Professional links',
};

/** Dashboard section grid labels (same 8 areas; skills shown as basic profile details). */
export const DASHBOARD_AREA_LABELS: Record<ProfileAreaId, string> = {
  ...PROFILE_AREA_LABELS,
  skills: 'Basic details',
  professionalLinks: 'Professional Links',
};

const AREA_COUNT = PROFILE_AREA_IDS.length;
const DISMISSAL_STORAGE_PREFIX = 'smart.profile.next-action.dismissed.';
export const RECOMMENDED_ACTION_DISMISSAL_MS = 7 * 24 * 60 * 60 * 1000;
export const PROFILE_SKILL_VERIFICATION_UNLOCK_PERCENT = 50;

/** UI copy — verification unlocks when all profile areas are complete (100%). */
export const PROFILE_VERIFICATION_UNLOCK_MESSAGE =
  'Complete all profile sections to unlock skill verification.';

export const PROFILE_AREA_HREFS: Record<ProfileAreaId, string> = {
  skills: '/profile?section=skills',
  languages: '/profile?section=languages',
  education: '/profile?section=education',
  experience: '/profile?section=experience',
  projects: '/profile?section=projects',
  certifications: '/profile?section=certifications',
  professionalLinks: '/profile?section=links',
};

export type ProfileStrengthTier = 'getting_started' | 'building' | 'strong' | 'verification_ready';

export function profileStrengthFromPercent(percent: number): {
  tier: ProfileStrengthTier;
  label: string;
  description: string;
} {
  if (percent >= 100) {
    return {
      tier: 'verification_ready',
      label: 'Verification ready',
      description: 'Your profile is complete. Skill verification is unlocked.',
    };
  }
  if (percent >= 75) {
    return {
      tier: 'strong',
      label: 'Strong',
      description: 'Finish the remaining sections to unlock skill verification.',
    };
  }
  if (percent >= 50) {
    return {
      tier: 'building',
      label: 'Building',
      description: 'Complete the remaining sections to build a stronger professional profile.',
    };
  }
  return {
    tier: 'getting_started',
    label: 'Getting started',
    description: 'Complete the remaining sections to build a stronger professional profile.',
  };
}

/** True when the eight-area profile completion gate allows skill verification. */
export function canVerifySkills(percent: number | null | undefined): boolean {
  return (percent ?? 0) >= PROFILE_SKILL_VERIFICATION_UNLOCK_PERCENT;
}

export interface ProfileProgressInput {
  skillClaims: SkillClaimDto[];
  onboardingProfile: CandidateOnboardingProfile | null;
  onboardingDraft: CandidateOnboardingDraft | null;
  languages: CandidateLanguageDto[];
  education: CandidateEducationDto[];
  experiences: WorkExperienceDto[];
  projects: ProjectDto[];
  certificates: CandidateCertificateDto[];
}

export interface ProfileProgressResult {
  percent: number;
  completedAreas: ProfileAreaId[];
  incompleteAreas: ProfileAreaId[];
  areaStatus: Record<ProfileAreaId, boolean>;
}

export interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

function onboardingSkills(
  profile: CandidateOnboardingProfile | null,
  draft: CandidateOnboardingDraft | null,
) {
  return profile?.skills ?? draft?.skills ?? [];
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
  if (input.languages.length > 0) return true;
  return onboardingSkills(input.onboardingProfile, input.onboardingDraft).some(
    (skill) => skill.type === 'language' && Boolean(skill.name?.trim()),
  );
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

export function computeAreaStatus(input: ProfileProgressInput): Record<ProfileAreaId, boolean> {
  return {
    skills: isSkillsAreaComplete(input),
    languages: isLanguagesAreaComplete(input),
    education: isEducationAreaComplete(input),
    experience: isExperienceAreaComplete(input),
    projects: isProjectsAreaComplete(input),
    certifications: isCertificationsAreaComplete(input),
    professionalLinks: isProfessionalLinksAreaComplete(input),
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

function firstVerifiableClaim(claims: SkillClaimDto[]): SkillClaimDto | undefined {
  return claims.find((claim) => claim.status === 'DECLARED');
}

function isProfileFullyComplete(input: ProfileProgressInput): boolean {
  return computeProfileCompletion(input).percent >= 100;
}

function profileSectionActions(input: ProfileProgressInput): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (!isSkillsAreaComplete(input)) {
    actions.push({
      id: 'add-skills',
      title: 'Add your skills',
      description: 'Tell SMART what you already know.',
      ctaLabel: 'Add skills',
      href: '/profile?section=skills',
    });
  }
  if (!isLanguagesAreaComplete(input)) {
    actions.push({
      id: 'add-languages',
      title: 'Add languages',
      description: 'Language skills can open more opportunities.',
      ctaLabel: 'Add languages',
      href: '/profile?section=languages',
    });
  }
  if (!isEducationAreaComplete(input)) {
    actions.push({
      id: 'add-education',
      title: 'Complete your Education profile',
      description:
        'Add your academic background to strengthen your profile and showcase your qualifications.',
      ctaLabel: 'Continue to Education',
      href: '/profile?section=education',
    });
  }
  if (!isExperienceAreaComplete(input)) {
    actions.push({
      id: 'add-experience',
      title: 'Add work experience',
      description: 'Share roles that shaped your professional journey.',
      ctaLabel: 'Add experience',
      href: '/profile?section=experience',
    });
  }
  if (!isProjectsAreaComplete(input)) {
    actions.push({
      id: 'add-project',
      title: 'Add a project',
      description: 'Projects are strong evidence of what you have built.',
      ctaLabel: 'Add project',
      href: '/profile?section=projects',
    });
  }
  if (!isCertificationsAreaComplete(input)) {
    actions.push({
      id: 'add-certification',
      title: 'Add a certification',
      description: 'External certifications strengthen your profile.',
      ctaLabel: 'Add certification',
      href: '/profile?section=certifications',
    });
  }
  if (!isProfessionalLinksAreaComplete(input)) {
    actions.push({
      id: 'add-professional-links',
      title: 'Add professional links',
      description: 'LinkedIn or GitHub helps employers learn more about you.',
      ctaLabel: 'Add links',
      href: '/profile?section=links',
    });
  }
  return actions;
}

/** Ordered recommendations: profile sections first, then verification, then public profile. */
export function recommendNextActionCandidates(input: ProfileProgressInput): RecommendedAction[] {
  const actions = profileSectionActions(input);

  if (isProfileFullyComplete(input)) {
    const verifiable = firstVerifiableClaim(input.skillClaims);
    if (verifiable) {
      const skillName = skillNameForCode(verifiable.skillCode);
      actions.push({
        id: `verify-skill-${verifiable.claimId}`,
        title: `Verify ${skillName}`,
        description: 'Show employers what you can do with evidence-backed verification.',
        ctaLabel: `Verify ${skillName}`,
        href: `/assessments/skills/${verifiable.claimId}`,
      });
    }
  }

  actions.push({
    id: 'explore-public-profile',
    title: 'Explore your public profile',
    description: 'See how employers will view your SMART profile.',
    ctaLabel: 'View public profile',
    href: '/public-profile',
  });

  return actions;
}

export function recommendNextAction(input: ProfileProgressInput): RecommendedAction {
  return (
    recommendNextActionCandidates(input)[0] ?? {
      id: 'explore-public-profile',
      title: 'Explore your public profile',
      description: 'See how employers will view your SMART profile.',
      ctaLabel: 'View public profile',
      href: '/public-profile',
    }
  );
}

export function dismissalStorageKey(actionId: string): string {
  return `${DISMISSAL_STORAGE_PREFIX}${actionId}`;
}

export function readActionDismissedAt(actionId: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(dismissalStorageKey(actionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dismissedAt?: number };
    return typeof parsed.dismissedAt === 'number' ? parsed.dismissedAt : null;
  } catch {
    return null;
  }
}

export function isRecommendedActionDismissed(
  actionId: string,
  nowMs: number = Date.now(),
): boolean {
  const dismissedAt = readActionDismissedAt(actionId);
  if (dismissedAt === null) return false;
  return nowMs - dismissedAt < RECOMMENDED_ACTION_DISMISSAL_MS;
}

export function dismissRecommendedAction(actionId: string, nowMs: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    dismissalStorageKey(actionId),
    JSON.stringify({ dismissedAt: nowMs }),
  );
}

function isRecommendedActionStillRelevant(
  action: RecommendedAction,
  input: ProfileProgressInput,
): boolean {
  switch (action.id) {
    case 'add-skills':
      return !isSkillsAreaComplete(input);
    case 'add-languages':
      return !isLanguagesAreaComplete(input);
    case 'add-education':
      return !isEducationAreaComplete(input);
    case 'add-experience':
      return !isExperienceAreaComplete(input);
    case 'add-project':
      return !isProjectsAreaComplete(input);
    case 'add-certification':
      return !isCertificationsAreaComplete(input);
    case 'add-professional-links':
      return !isProfessionalLinksAreaComplete(input);
    default:
      return true;
  }
}

export function resolveVisibleRecommendedAction(
  input: ProfileProgressInput,
  nowMs: number = Date.now(),
): RecommendedAction | null {
  for (const action of recommendNextActionCandidates(input)) {
    if (!isRecommendedActionStillRelevant(action, input)) continue;
    if (!isRecommendedActionDismissed(action.id, nowMs)) return action;
  }
  return null;
}
