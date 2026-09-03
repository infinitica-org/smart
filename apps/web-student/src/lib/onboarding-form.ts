import type {
  CandidateOnboardingDraft,
  CompleteCandidateOnboardingRequest,
  ResumeParseDraft,
  SaveCandidateOnboardingDraftRequest,
} from '@smart/contracts';

export interface OnboardingProfileForm {
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
  preferences: string[];
  codingProficiencies: { id: string; language: string; proficiency: string }[];
  education: CompleteCandidateOnboardingRequest['education'];
  experiences: CompleteCandidateOnboardingRequest['experiences'];
  dpdpConsent: boolean;
}

/** Draft-only UI cache while the wizard is open — never the source of truth for completion. */
export const ONBOARDING_DRAFT_STORAGE_KEY = 'smart.candidate.onboarding.draft';

export function emptyOnboardingForm(): OnboardingProfileForm {
  return {
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
    preferences: [],
    codingProficiencies: [],
    education: [],
    experiences: [],
    dpdpConsent: false,
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
  const codingProficiencies = validSkills
    .filter((s) => s.type === 'technical')
    .map((s) => ({ id: crypto.randomUUID(), language: s.name, proficiency: s.proficiency }));

  return {
    ...form,
    firstName: draft.firstName ?? form.firstName,
    lastName: draft.lastName ?? form.lastName,
    gender: draft.gender ?? form.gender,
    phoneCountryCode: draft.phoneCountryCode ?? form.phoneCountryCode,
    phoneNumber: draft.phoneNumber ?? form.phoneNumber,
    linkedinUrl: draft.linkedinUrl ?? form.linkedinUrl,
    githubUrl: draft.githubUrl ?? form.githubUrl,
    languages: languages.length > 0 ? languages : form.languages,
    codingProficiencies:
      codingProficiencies.length > 0 ? codingProficiencies : form.codingProficiencies,
    preferences: draft.preferences ?? form.preferences,
    dpdpConsent: draft.dpdpConsent ?? form.dpdpConsent,
    education:
      draft.education && draft.education.length > 0
        ? draft.education.map((item) => ({
            institutionName: item.institutionName ?? '',
            degree: item.degree ?? '',
            fieldOfStudy: item.fieldOfStudy ?? '',
            startDate: item.startDate ?? '',
            endDate: item.endDate ?? '',
            current: item.current ?? false,
            grade: item.grade ?? '',
          }))
        : form.education,
    experiences:
      draft.experiences && draft.experiences.length > 0
        ? draft.experiences.map((item) => ({
            role: item.role ?? '',
            company: item.company ?? '',
            location: item.location ?? '',
            startDate: item.startDate ?? '',
            endDate: item.endDate ?? '',
            description: item.description ?? '',
            tags: item.tags ?? [],
          }))
        : form.experiences,
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

  const skills = [
    ...form.languages
      .filter((l) => l.language.trim() && l.proficiency.trim())
      .map((l) => ({ type: 'language' as const, name: l.language.trim(), proficiency: l.proficiency.trim() })),
    ...form.codingProficiencies
      .filter((l) => l.language.trim() && l.proficiency.trim())
      .map((l) => ({ type: 'technical' as const, name: l.language.trim(), proficiency: l.proficiency.trim() })),
  ];

  return {
    firstName: form.firstName.trim() || undefined,
    lastName: form.lastName.trim() || undefined,
    gender: form.gender.trim() || undefined,
    dateOfBirth,
    phoneCountryCode: form.phoneCountryCode.trim() || undefined,
    phoneNumber: form.phoneNumber.trim() || undefined,
    linkedinUrl: form.linkedinUrl.trim() || undefined,
    githubUrl: form.githubUrl.trim() || undefined,
    education: form.education,
    experiences: form.experiences,
    skills,
    preferences: form.preferences,
    dpdpConsent: form.dpdpConsent,
  };
}

export function validateEducationItems(
  education: CompleteCandidateOnboardingRequest['education'],
): string | null {
  for (let i = 0; i < education.length; i++) {
    const item = education[i];
    if (!item?.institutionName?.trim()) {
      return `Institution name is required for education entry #${i + 1}.`;
    }
  }
  return null;
}

export function validateExperienceItems(
  experiences: CompleteCandidateOnboardingRequest['experiences'],
): string | null {
  for (let i = 0; i < experiences.length; i++) {
    const item = experiences[i];
    if (!item?.role?.trim()) {
      return `Role / Job Title is required for experience entry #${i + 1}.`;
    }
    if (!item?.company?.trim()) {
      return `Company name is required for experience entry #${i + 1}.`;
    }
  }
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

export function buildCompleteOnboardingRequest(
  form: OnboardingProfileForm,
): CompleteCandidateOnboardingRequest | { error: string } {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    return { error: 'First and last name are required.' };
  }
  if (!form.phoneNumber.trim()) {
    return { error: 'Phone number is required.' };
  }
  if (!form.linkedinUrl.trim()) {
    return { error: 'LinkedIn profile is required.' };
  }
  if (!form.languages.some((l) => l.language.trim() && l.proficiency.trim())) {
    return { error: 'At least one language is required.' };
  }

  const eduError = validateEducationItems(form.education);
  if (eduError) return { error: eduError };

  const expError = validateExperienceItems(form.experiences);
  if (expError) return { error: expError };

  if (form.preferences.length === 0) {
    return { error: 'Please select at least one project preference.' };
  }
  if (!form.dpdpConsent) {
    return { error: 'You must agree to the DPDP consent terms to complete your profile.' };
  }

  const dateOfBirth =
    form.dobYear && form.dobMonth && form.dobDay
      ? `${form.dobYear}-${String(MONTHS.indexOf(form.dobMonth) + 1).padStart(2, '0')}-${form.dobDay.padStart(2, '0')}`
      : undefined;

  const skills = [
    ...form.languages
      .filter((l) => l.language.trim() && l.proficiency.trim())
      .map((l) => ({
        type: 'language' as const,
        name: l.language.trim(),
        proficiency: l.proficiency.trim(),
      })),
    ...form.codingProficiencies
      .filter((l) => l.language.trim() && l.proficiency.trim())
      .map((l) => ({
        type: 'technical' as const,
        name: l.language.trim(),
        proficiency: l.proficiency.trim(),
      })),
  ];

  let linkedinUrl = form.linkedinUrl.trim();
  if (linkedinUrl && !/^https?:\/\//i.test(linkedinUrl)) {
    linkedinUrl = `https://${linkedinUrl}`;
  }

  let githubUrl = form.githubUrl.trim();
  if (githubUrl && !/^https?:\/\//i.test(githubUrl)) {
    githubUrl = `https://${githubUrl}`;
  }

  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    gender: form.gender.trim() || undefined,
    dateOfBirth,
    phoneCountryCode: form.phoneCountryCode.trim() || '+91',
    phoneNumber: form.phoneNumber.trim(),
    linkedinUrl,
    githubUrl: githubUrl || undefined,
    education: form.education,
    experiences: form.experiences,
    skills,
    preferences: form.preferences,
    dpdpConsent: true,
  };
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

export const FLUENCY_OPTIONS = ['Native or Bilingual', 'Fluent', 'Conversational', 'Elementary'];
