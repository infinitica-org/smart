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
  dpdpConsent: boolean;
}

export const ONBOARDING_STORAGE_KEY = 'smart.candidate.onboarding';

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
    dpdpConsent: false,
  };
}

export function loadOnboardingForm(): OnboardingProfileForm {
  if (typeof window === 'undefined') return emptyOnboardingForm();
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return emptyOnboardingForm();
    return { ...emptyOnboardingForm(), ...(JSON.parse(raw) as Partial<OnboardingProfileForm>) };
  } catch {
    return emptyOnboardingForm();
  }
}

export function saveOnboardingForm(form: OnboardingProfileForm): void {
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ ...form, complete: true }));
}

export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return false;
    const form = { ...emptyOnboardingForm(), ...(JSON.parse(raw) as Partial<OnboardingProfileForm> & { complete?: boolean }) };
    return Boolean(
      form.dpdpConsent &&
        form.firstName.trim() &&
        form.lastName.trim() &&
        form.phoneNumber.trim() &&
        form.linkedinUrl.trim() &&
        form.languages.some((row) => row.language.trim() && row.proficiency.trim()) &&
        form.preferences.length > 0,
    );
  } catch {
    return false;
  }
}
