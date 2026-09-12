import type {
  CandidateOnboardingDraft,
  CandidateOnboardingJobPreferences,
  CompleteCandidateOnboardingRequest,
  InterestDomain,
  ResumeParseDraft,
  SaveCandidateOnboardingDraftRequest,
  SkillDiscovery,
  SocialVerification,
  WorkMode,
} from '@smart/contracts';
import { SKILL_CODE_TO_NAME } from './skills-catalog';

const NAME_TO_SKILL_CODE = new Map(
  Array.from(SKILL_CODE_TO_NAME.entries()).map(([code, name]) => [name.toLowerCase(), code]),
);

export interface OnboardingProfileForm {
  interestDomain: InterestDomain | '';
  firstName: string;
  lastName: string;
  gender: string;
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  phoneCountryCode: string;
  phoneNumber: string;
  linkedinUrl: string;
  githubUrl: string;
  languages: { id: string; language: string; proficiency: string }[];
  /** Mandatory Core + straightforward Niche catalog skills, one proficiency each. Keyed by catalog skill code. */
  catalogSkills: Record<string, string>;
  /** Programming languages with proficiency. */
  codingProficiencies: { id: string; language: string; proficiency: string }[];
  /** Frontend frameworks with proficiency. */
  frontendFrameworks: { id: string; framework: string; proficiency: string }[];
  /** Backend frameworks with proficiency. */
  backendFrameworks: { id: string; framework: string; proficiency: string }[];
  /** Legacy alias for backward compatibility. */
  frameworkProficiencies: { id: string; framework: string; proficiency: string }[];
  education: CompleteCandidateOnboardingRequest['education'];
  experiences: CompleteCandidateOnboardingRequest['experiences'];
  socialVerification: SocialVerification;
  skillDiscovery: SkillDiscovery;
  jobPreferences: {
    expectedCtcLakhs: string;
    currentLocation: string;
    preferredLocations: string[];
  };
  dpdpConsent: boolean;
  /** Signed profile photo URL after upload; optional during onboarding. */
  profilePhotoUrl: string;
}

export const emptySocialVerification = (): SocialVerification => ({ linkedin: null, github: null });

export const emptySkillDiscovery = (): SkillDiscovery => ({
  suggestedFromGithub: [],
  selectedSkillNames: [],
  customSkillNames: [],
});

export const emptyJobPreferences = (): OnboardingProfileForm['jobPreferences'] => ({
  expectedCtcLakhs: '',
  currentLocation: '',
  preferredLocations: [],
});

export const ONBOARDING_DRAFT_STORAGE_KEY = 'smart.candidate.onboarding.draft';

export function emptyOnboardingForm(): OnboardingProfileForm {
  return {
    interestDomain: '',
    firstName: '',
    lastName: '',
    gender: '',
    dobMonth: '',
    dobDay: '',
    dobYear: '',
    phoneCountryCode: '+91',
    phoneNumber: '',
    linkedinUrl: '',
    githubUrl: '',
    languages: [],
    catalogSkills: {},
    codingProficiencies: [],
    frontendFrameworks: [],
    backendFrameworks: [],
    frameworkProficiencies: [],
    education: [],
    experiences: [],
    socialVerification: emptySocialVerification(),
    skillDiscovery: emptySkillDiscovery(),
    jobPreferences: emptyJobPreferences(),
    dpdpConsent: false,
    profilePhotoUrl: '',
  };
}

export function loadOnboardingDraft(): OnboardingProfileForm {
  if (typeof window === 'undefined') return emptyOnboardingForm();
  try {
    const raw = window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
    if (!raw) return emptyOnboardingForm();
    return { ...emptyOnboardingForm(), ...(JSON.parse(raw) as Partial<OnboardingProfileForm>) };
  } catch {
    return emptyOnboardingForm();
  }
}

export function saveOnboardingDraft(form: OnboardingProfileForm): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(form));
}

export function clearOnboardingDraft(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
}

export function applyResumeDraft(
  form: OnboardingProfileForm,
  draft: ResumeParseDraft,
): OnboardingProfileForm {
  const basic = draft.basicInfo;
  const languages = draft.skills
    .filter((s) => s.type === 'language')
    .map((s) => ({
      id: crypto.randomUUID(),
      language: s.name,
      proficiency: s.proficiency,
    }));
  // Resume-parsed technical skills seed the Skills step's "programming
  // languages" picker — a starting point the candidate reviews and edits there.
  const codingProficiencies = draft.skills
    .filter((s) => s.type === 'technical')
    .map((s) => ({
      id: crypto.randomUUID(),
      language: s.name,
      proficiency: s.proficiency,
    }));

  return {
    ...form,
    firstName: basic?.firstName?.trim() || form.firstName,
    lastName: basic?.lastName?.trim() || form.lastName,
    phoneNumber: basic?.phoneNumber?.trim() || form.phoneNumber,
    phoneCountryCode: basic?.phoneCountryCode?.trim() || form.phoneCountryCode,
    linkedinUrl: basic?.linkedinUrl?.trim() || form.linkedinUrl,
    languages: languages.length > 0 ? languages : form.languages,
    codingProficiencies:
      codingProficiencies.length > 0 ? codingProficiencies : form.codingProficiencies,
    education: draft.education.length > 0 ? draft.education : form.education,
    experiences: draft.experiences.length > 0 ? draft.experiences : form.experiences,
  };
}

/**
 * Hydrate the wizard from a draft the server already persisted (CN-T01 draft
 * save). Used on mount so progress survives a lost session or a different
 * device/browser, not just a localStorage cache on the same machine.
 */
export function applyServerDraft(
  form: OnboardingProfileForm,
  draft: CandidateOnboardingDraft | null | undefined,
): OnboardingProfileForm {
  if (!draft) return form;

  const validSkills = (draft.skills ?? []).filter(
    (s): s is { type: 'technical' | 'language'; name: string; proficiency: string } =>
      Boolean(s.type && s.name?.trim() && s.proficiency?.trim()),
  );
  const languages = validSkills
    .filter((s) => s.type === 'language')
    .map((s) => ({ id: crypto.randomUUID(), language: s.name, proficiency: s.proficiency }));

  // Split technical entries back into the mandatory catalog-skill map (exact
  // name match) vs. the free-form language/framework picks bucket. The two
  // multi-item skill families can't be told apart once flattened server-side,
  // so both land in `codingProficiencies` on reload — the candidate can freely
  // re-sort them in the Skills step, which isn't a data-loss risk.
  const technical = validSkills.filter((s) => s.type === 'technical');
  const catalogSkills: Record<string, string> = {};
  const codingProficiencies: { id: string; language: string; proficiency: string }[] = [];
  for (const entry of technical) {
    const code = NAME_TO_SKILL_CODE.get(entry.name.toLowerCase());
    if (code) {
      catalogSkills[code] = entry.proficiency;
    } else {
      codingProficiencies.push({
        id: crypto.randomUUID(),
        language: entry.name,
        proficiency: entry.proficiency,
      });
    }
  }

  const jobPreferences = draft.jobPreferences;

  return {
    ...form,
    interestDomain: draft.interestDomain ?? form.interestDomain,
    firstName: draft.firstName ?? form.firstName,
    lastName: draft.lastName ?? form.lastName,
    gender: draft.gender ?? form.gender,
    phoneCountryCode: draft.phoneCountryCode ?? form.phoneCountryCode,
    phoneNumber: draft.phoneNumber ?? form.phoneNumber,
    linkedinUrl: draft.linkedinUrl ?? form.linkedinUrl,
    githubUrl: draft.githubUrl ?? form.githubUrl,
    languages: languages.length > 0 ? languages : form.languages,
    catalogSkills: technical.length > 0 ? catalogSkills : form.catalogSkills,
    codingProficiencies:
      codingProficiencies.length > 0 ? codingProficiencies : form.codingProficiencies,
    jobPreferences: jobPreferences
      ? {
          expectedCtcLakhs:
            jobPreferences.expectedCtcLakhs?.toString() ?? form.jobPreferences.expectedCtcLakhs,
          currentLocation: jobPreferences.currentLocation ?? form.jobPreferences.currentLocation,
          preferredLocations:
            jobPreferences.preferredLocations ?? form.jobPreferences.preferredLocations,
        }
      : form.jobPreferences,
    socialVerification: draft.socialVerification
      ? { ...emptySocialVerification(), ...draft.socialVerification }
      : form.socialVerification,
    skillDiscovery: draft.skillDiscovery
      ? { ...emptySkillDiscovery(), ...draft.skillDiscovery }
      : form.skillDiscovery,
    dpdpConsent: draft.dpdpConsent ?? form.dpdpConsent,
    education: [],
    experiences: [],
  };
}

/** Builds the flat `skills[]` array sent to the server from every skill source in the form. */
function buildSkillsPayload(
  form: OnboardingProfileForm,
): CompleteCandidateOnboardingRequest['skills'] {
  return [
    ...form.languages
      .filter((l) => l.language.trim() && l.proficiency.trim())
      .map((l) => ({
        type: 'language' as const,
        name: l.language.trim(),
        proficiency: l.proficiency.trim(),
      })),
    ...Object.entries(form.catalogSkills)
      .filter(([, proficiency]) => proficiency.trim())
      .map(([code, proficiency]) => ({
        type: 'technical' as const,
        name: SKILL_CODE_TO_NAME.get(code) ?? code,
        proficiency: proficiency.trim(),
      })),
    ...form.codingProficiencies
      .filter((l) => l.language.trim() && l.proficiency.trim())
      .map((l) => ({
        type: 'technical' as const,
        name: l.language.trim(),
        proficiency: l.proficiency.trim(),
      })),
    ...form.frontendFrameworks
      .filter((f) => f.framework.trim() && f.proficiency.trim())
      .map((f) => ({
        type: 'technical' as const,
        name: f.framework.trim(),
        proficiency: f.proficiency.trim(),
      })),
    ...form.backendFrameworks
      .filter((f) => f.framework.trim() && f.proficiency.trim())
      .map((f) => ({
        type: 'technical' as const,
        name: f.framework.trim(),
        proficiency: f.proficiency.trim(),
      })),
    ...form.frameworkProficiencies
      .filter((f) => f.framework.trim() && f.proficiency.trim())
      .map((f) => ({
        type: 'technical' as const,
        name: f.framework.trim(),
        proficiency: f.proficiency.trim(),
      })),
  ];
}

function buildJobPreferencesPayload(
  form: OnboardingProfileForm,
): CandidateOnboardingJobPreferences | undefined {
  const expected = Number(form.jobPreferences.expectedCtcLakhs);
  if (!form.jobPreferences.expectedCtcLakhs.trim() || Number.isNaN(expected)) return undefined;
  return {
    expectedCtcLakhs: expected,
    currentLocation: form.jobPreferences.currentLocation.trim(),
    preferredLocations: form.jobPreferences.preferredLocations,
    preferredWorkModes: ['FULL_TIME', 'HYBRID'],
  };
}

/** Best-effort snapshot of the in-progress form, sent to the server as a draft. */
export function buildOnboardingDraftPayload(
  form: OnboardingProfileForm,
): SaveCandidateOnboardingDraftRequest {
  const dateOfBirth =
    form.dobYear && form.dobMonth && form.dobDay
      ? `${form.dobYear}-${String(MONTHS.indexOf(form.dobMonth) + 1).padStart(2, '0')}-${form.dobDay.padStart(2, '0')}`
      : undefined;

  return {
    interestDomain: form.interestDomain || undefined,
    firstName: form.firstName.trim() || undefined,
    lastName: form.lastName.trim() || undefined,
    gender: form.gender.trim() || undefined,
    dateOfBirth,
    phoneCountryCode: form.phoneCountryCode.trim() || undefined,
    phoneNumber: form.phoneNumber.trim() || undefined,
    linkedinUrl: form.linkedinUrl.trim() || undefined,
    githubUrl: form.githubUrl.trim() || undefined,
    education: [],
    experiences: [],
    skills: buildSkillsPayload(form),
    jobPreferences: buildJobPreferencesPayload(form),
    socialVerification: form.socialVerification,
    skillDiscovery: form.skillDiscovery,
    dpdpConsent: form.dpdpConsent,
  };
}

export function validateEducationItems(): string | null {
  return null;
}

export function validateExperienceItems(): string | null {
  return null;
}

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function normalizeOptionalUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function buildCompleteOnboardingRequest(
  form: OnboardingProfileForm,
): CompleteCandidateOnboardingRequest | { error: string } {
  if (!form.interestDomain) {
    return { error: 'Please select an area of interest.' };
  }
  if (!form.firstName.trim() || !form.lastName.trim()) {
    return { error: 'First and last name are required.' };
  }
  if (!form.phoneCountryCode.trim()) {
    return { error: 'Phone country code is required.' };
  }
  if (!form.phoneNumber.trim()) {
    return { error: 'Phone number is required.' };
  }
  if (!/^\d{10}$/.test(form.phoneNumber.trim())) {
    return { error: 'Mobile number must contain exactly 10 digits.' };
  }
  if (!form.dpdpConsent) {
    return { error: 'You must agree to the DPDP consent terms to enter SMART.' };
  }

  const dateOfBirth =
    form.dobYear && form.dobMonth && form.dobDay
      ? `${form.dobYear}-${String(MONTHS.indexOf(form.dobMonth) + 1).padStart(2, '0')}-${form.dobDay.padStart(2, '0')}`
      : undefined;

  const linkedinUrl = normalizeOptionalUrl(form.linkedinUrl);
  const githubUrl = normalizeOptionalUrl(form.githubUrl);
  const skills = buildSkillsPayload(form);
  const jobPreferences = buildJobPreferencesPayload(form);

  const payload = {
    interestDomain: form.interestDomain,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phoneCountryCode: form.phoneCountryCode.trim() || '+91',
    phoneNumber: form.phoneNumber.trim(),
    dpdpConsent: true as const,
    ...(form.gender.trim() ? { gender: form.gender.trim() } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(linkedinUrl ? { linkedinUrl } : {}),
    ...(githubUrl ? { githubUrl } : {}),
    ...(skills.length > 0 ? { skills } : {}),
    ...(jobPreferences ? { jobPreferences } : {}),
    ...(form.socialVerification.linkedin || form.socialVerification.github
      ? { socialVerification: form.socialVerification }
      : {}),
    ...(form.skillDiscovery.selectedSkillNames.length > 0 ||
    form.skillDiscovery.customSkillNames.length > 0 ||
    form.skillDiscovery.suggestedFromGithub.length > 0
      ? { skillDiscovery: form.skillDiscovery }
      : {}),
  };

  return payload as CompleteCandidateOnboardingRequest;
}

export const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'French',
  'German',
  'Hindi',
  'Mandarin',
  'Japanese',
  'Tamil',
  'Telugu',
  'Kannada',
  'Marathi',
  'Bengali',
  'Arabic',
  'Portuguese',
  'Russian',
];

export const FLUENCY_OPTIONS = ['Native', 'Fluent', 'Conversational', 'Beginner'];

export const CITY_OPTIONS = [
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Mumbai',
  'Delhi NCR',
  'Kolkata',
  'Ahmedabad',
  'Kochi',
  'Remote / Anywhere',
];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  FULL_TIME: 'Full-Time',
  PART_TIME: 'Part-Time',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};
