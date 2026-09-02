import type { CompleteCandidateOnboardingRequest, ResumeParseDraft } from '@smart/contracts';

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

  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    gender: form.gender.trim() || undefined,
    dateOfBirth,
    phoneCountryCode: form.phoneCountryCode.trim() || '+91',
    phoneNumber: form.phoneNumber.trim(),
    linkedinUrl,
    education: form.education,
    experiences: form.experiences,
    skills,
    preferences: form.preferences,
    dpdpConsent: true,
  };
}

const MONTHS = [
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

export { MONTHS };
