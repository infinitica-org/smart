import {
  CreateJobOpeningRequestSchema,
  SKILL_DEFINITIONS,
  SKILL_TAXONOMY_DOMAINS,
  type CreateJobOpeningRequest,
  type JobOpeningAttachedDocument,
  type SkillProficiency,
  type SkillTaxonomyDomain,
} from '@smart/contracts';

export type JobPostingCompanyLogo = {
  storageKey: string;
  previewUrl: string;
  fileName: string;
};

export type JobPostingFormState = {
  companyName: string;
  roleTitle: string;
  domain: string;
  minYearsExperience: string;
  maxYearsExperience: string;
  location: string;
  employmentType: string;
  aboutCompany: string;
  companyOffers: string;
  additionalCompanyDetails: string;
  roleDetails: string;
  salaryDetails: string;
  roundDetails: string;
  hiringDetails: string;
  driveSpoc: string;
  driveDate: string;
  lastDateToApply: string;
};

export const EMPTY_JOB_POSTING_FORM: JobPostingFormState = {
  companyName: '',
  roleTitle: '',
  domain: 'SOFTWARE_IT',
  minYearsExperience: '0',
  maxYearsExperience: '0',
  location: '',
  employmentType: 'FULL_TIME',
  aboutCompany: '',
  companyOffers: '',
  additionalCompanyDetails: '',
  roleDetails: '',
  salaryDetails: '',
  roundDetails: '',
  hiringDetails: '',
  driveSpoc: '',
  driveDate: '',
  lastDateToApply: '',
};

export const JOB_POSTING_STEPS = [
  { id: 'company-role', label: 'Company & Role', shortLabel: 'Company' },
  { id: 'about-company', label: 'About the Company', shortLabel: 'About' },
  { id: 'role-details', label: 'Role Details', shortLabel: 'Role' },
  { id: 'requirements', label: 'Requirements', shortLabel: 'Requirements' },
  { id: 'hiring-process', label: 'Hiring Process', shortLabel: 'Hiring' },
  { id: 'drive-details', label: 'Drive Details', shortLabel: 'Drive' },
  { id: 'review', label: 'Review & Post', shortLabel: 'Review' },
] as const;

export type JobPostingStepId = (typeof JOB_POSTING_STEPS)[number]['id'];

export const JOB_POSTING_DRAFT_STORAGE_KEY = 'smart.tpo.job-posting.draft';

export const JOB_POSTING_DOMAIN_OPTIONS = SKILL_TAXONOMY_DOMAINS;

export function labelFor(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function skillNameFor(code: string): string {
  return SKILL_DEFINITIONS.find((skill) => skill.code === code)?.name ?? code;
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalDate(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function saveJobPostingDraft(
  form: JobPostingFormState,
  skills: ReadonlyMap<string, SkillProficiency>,
  attachedDocuments: readonly JobOpeningAttachedDocument[],
  companyLogo: JobPostingCompanyLogo | null,
) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      JOB_POSTING_DRAFT_STORAGE_KEY,
      JSON.stringify({
        form,
        skills: [...skills],
        attachedDocuments,
        companyLogo,
      }),
    );
  } catch {
    // Quota or private mode — ignore.
  }
}

export function loadJobPostingDraft(): {
  form: JobPostingFormState;
  skills: Map<string, SkillProficiency>;
  attachedDocuments: JobOpeningAttachedDocument[];
  companyLogo: JobPostingCompanyLogo | null;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(JOB_POSTING_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      form?: Partial<JobPostingFormState>;
      skills?: [string, SkillProficiency][];
      attachedDocuments?: JobOpeningAttachedDocument[];
      companyLogo?: JobPostingCompanyLogo | null;
    };
    return {
      form: { ...EMPTY_JOB_POSTING_FORM, ...parsed.form },
      skills: new Map(parsed.skills ?? []),
      attachedDocuments: parsed.attachedDocuments ?? [],
      companyLogo: parsed.companyLogo ?? null,
    };
  } catch {
    return null;
  }
}

export function clearJobPostingDraft() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(JOB_POSTING_DRAFT_STORAGE_KEY);
}

export function buildCreateOpeningPayload(
  form: JobPostingFormState,
  skills: ReadonlyMap<string, SkillProficiency>,
  attachedDocuments: readonly JobOpeningAttachedDocument[],
  companyLogo: JobPostingCompanyLogo | null,
) {
  return CreateJobOpeningRequestSchema.safeParse({
    companyName: form.companyName.trim(),
    roleTitle: form.roleTitle.trim(),
    domain: form.domain as SkillTaxonomyDomain,
    companyLogoStorageKey: companyLogo?.storageKey,
    minYearsExperience: Number(form.minYearsExperience),
    maxYearsExperience: Number(form.maxYearsExperience),
    location: form.location.trim(),
    employmentType: form.employmentType,
    aboutCompany: optionalText(form.aboutCompany),
    companyOffers: optionalText(form.companyOffers),
    additionalCompanyDetails: optionalText(form.additionalCompanyDetails),
    roleDetails: optionalText(form.roleDetails),
    salaryDetails: optionalText(form.salaryDetails),
    roundDetails: optionalText(form.roundDetails),
    hiringDetails: optionalText(form.hiringDetails),
    driveSpoc: optionalText(form.driveSpoc),
    driveDate: optionalDate(form.driveDate),
    lastDateToApply: optionalDate(form.lastDateToApply),
    attachedDocuments: attachedDocuments.length > 0 ? [...attachedDocuments] : undefined,
    requiredSkills: [...skills].map(([skillCode, minProficiency]) => ({
      skillCode,
      minProficiency,
    })),
  });
}

export function isCreateOpeningPayload(
  value: ReturnType<typeof buildCreateOpeningPayload>,
): value is { success: true; data: CreateJobOpeningRequest } {
  return value.success;
}
