import {
  CompleteCandidateOnboardingRequestSchema,
  SaveCandidateOnboardingDraftRequestSchema,
  type CandidateOnboardingDraft,
  type CompleteCandidateOnboardingRequest,
  type ResumeParseDraft,
  type SaveCandidateOnboardingDraftRequest,
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

function issueAt(
  issues: { path: PropertyKey[]; message: string; code?: string }[],
): { path: PropertyKey[]; message: string; code?: string } | undefined {
  return issues[0];
}

/** Maps a contract Zod issue onto the existing candidate-facing copy. */
export function onboardingIssueMessage(issue: {
  path: PropertyKey[];
  message: string;
  code?: string;
}): string {
  const root = issue.path[0];
  const index = typeof issue.path[1] === 'number' ? issue.path[1] : 0;
  const nested = issue.path[2];
  const tooBig = issue.code === 'too_big';

  if (root === 'firstName' || root === 'lastName') {
    if (tooBig) {
      return root === 'firstName'
        ? 'First name must be 50 characters or fewer.'
        : 'Last name must be 50 characters or fewer.';
    }
    return 'First and last name are required.';
  }
  if (root === 'phoneNumber' || root === 'phoneCountryCode') {
    if (tooBig) return 'Phone number must be 32 characters or fewer.';
    return 'Phone number is required.';
  }
  if (root === 'linkedinUrl') {
    return 'Enter a valid LinkedIn URL, or leave it blank.';
  }
  if (root === 'githubUrl') {
    return 'Enter a valid GitHub URL, or leave it blank.';
  }
  if (root === 'dateOfBirth') {
    return 'Date of birth must be 32 characters or fewer.';
  }
  if (root === 'preferences') {
    return 'Please select at least one project preference.';
  }
  if (root === 'dpdpConsent') {
    return 'You must agree to the DPDP consent terms to complete your profile.';
  }
  if (root === 'education') {
    return `Institution name is required for education entry #${String(index + 1)}.`;
  }
  if (root === 'experiences') {
    if (nested === 'company') {
      return `Company name is required for experience entry #${String(index + 1)}.`;
    }
    return `Role / Job Title is required for experience entry #${String(index + 1)}.`;
  }
  return issue.message;
}

export function normalizeHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//iu.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function validateContractUrlField(
  raw: string,
  field: 'linkedinUrl' | 'githubUrl',
): string | null {
  const normalized = normalizeHttpUrl(raw);
  const parsed =
    field === 'linkedinUrl'
      ? CompleteCandidateOnboardingRequestSchema.shape.linkedinUrl.safeParse(normalized)
      : CompleteCandidateOnboardingRequestSchema.shape.githubUrl.safeParse(normalized || undefined);
  if (parsed.success) return null;
  return field === 'linkedinUrl'
    ? 'Enter a valid LinkedIn URL, or leave it blank.'
    : 'Enter a valid GitHub URL, or leave it blank.';
}

export function buildDateOfBirth(form: OnboardingProfileForm): string | undefined {
  if (!form.dobYear || !form.dobMonth || !form.dobDay) return undefined;
  const monthIndex = MONTHS.indexOf(form.dobMonth);
  if (monthIndex < 0) return undefined;
  return `${form.dobYear}-${String(monthIndex + 1).padStart(2, '0')}-${form.dobDay.padStart(2, '0')}`;
}

/** Best-effort snapshot of the in-progress form, sent to the server as a draft. */
export function buildOnboardingDraftPayload(
  form: OnboardingProfileForm,
): SaveCandidateOnboardingDraftRequest {
  const dateOfBirth = buildDateOfBirth(form);

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

  const payload = {
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

  const parsed = SaveCandidateOnboardingDraftRequestSchema.safeParse(payload);
  return parsed.success ? parsed.data : payload;
}

export function validatePhoneFields(form: OnboardingProfileForm): string | null {
  const parsed = CompleteCandidateOnboardingRequestSchema.pick({
    phoneCountryCode: true,
    phoneNumber: true,
  }).safeParse({
    phoneCountryCode: form.phoneCountryCode.trim() || '+91',
    phoneNumber: form.phoneNumber.trim(),
  });
  if (parsed.success) return null;
  const issue = issueAt(parsed.error.issues);
  return issue ? onboardingIssueMessage(issue) : 'Phone number is required.';
}

export function validateNameFields(form: OnboardingProfileForm): string | null {
  const parsed = CompleteCandidateOnboardingRequestSchema.pick({
    firstName: true,
    lastName: true,
  }).safeParse({
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
  });
  if (parsed.success) return null;
  const issue = issueAt(parsed.error.issues);
  return issue ? onboardingIssueMessage(issue) : 'First and last name are required.';
}

export function validateEducationItems(
  education: CompleteCandidateOnboardingRequest['education'],
): string | null {
  const parsed = CompleteCandidateOnboardingRequestSchema.pick({ education: true }).safeParse({
    education,
  });
  if (parsed.success) return null;
  const issue = issueAt(parsed.error.issues);
  return issue ? onboardingIssueMessage(issue) : 'Education is invalid.';
}

export function validateExperienceItems(
  experiences: CompleteCandidateOnboardingRequest['experiences'],
): string | null {
  const parsed = CompleteCandidateOnboardingRequestSchema.pick({ experiences: true }).safeParse({
    experiences,
  });
  if (parsed.success) return null;
  const issue = issueAt(parsed.error.issues);
  return issue ? onboardingIssueMessage(issue) : 'Experience is invalid.';
}

export function buildCompleteOnboardingRequest(
  form: OnboardingProfileForm,
): CompleteCandidateOnboardingRequest | { error: string } {
  if (!form.languages.some((l) => l.language.trim() && l.proficiency.trim())) {
    return { error: 'At least one language is required.' };
  }

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

  const parsed = CompleteCandidateOnboardingRequestSchema.safeParse({
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    gender: form.gender.trim() || undefined,
    dateOfBirth: buildDateOfBirth(form),
    phoneCountryCode: form.phoneCountryCode.trim() || '+91',
    phoneNumber: form.phoneNumber.trim(),
    linkedinUrl: normalizeHttpUrl(form.linkedinUrl),
    githubUrl: normalizeHttpUrl(form.githubUrl) || undefined,
    education: form.education,
    experiences: form.experiences,
    skills,
    preferences: form.preferences,
    dpdpConsent: form.dpdpConsent,
  });

  if (!parsed.success) {
    const issue = issueAt(parsed.error.issues);
    return {
      error: issue ? onboardingIssueMessage(issue) : 'Please check the form and try again.',
    };
  }
  return parsed.data;
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
