import {
  CreateJobOpeningRequestSchema,
  proficiencyLevelUiLabel,
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
  employerId: string;
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
  minSscPercentage: string;
  minHscPercentage: string;
  minCollegePercentage: string;
  /** 'yes' | 'no' — whether active backlogs are allowed. */
  backlogsAllowedChoice: 'yes' | 'no';
};

export const EMPTY_JOB_POSTING_FORM: JobPostingFormState = {
  employerId: '',
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
  minSscPercentage: '',
  minHscPercentage: '',
  minCollegePercentage: '',
  backlogsAllowedChoice: 'yes',
};

/**
 * Consolidated from an earlier 7-step flow (company-role, about-company,
 * role-details, requirements, hiring-process, drive-details, review) down to
 * 4 — each step below groups two of the old ones under one heading. No field
 * was dropped; `JobPostingWizard` renders every merged group's inputs inside
 * its matching step.
 */
export const JOB_POSTING_STEPS = [
  { id: 'company-role', label: 'Company & Role', shortLabel: 'Company' },
  { id: 'role-requirements', label: 'Role & Requirements', shortLabel: 'Role' },
  { id: 'hiring-drive', label: 'Hiring & Drive', shortLabel: 'Hiring' },
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

export function proficiencyLabelFor(level: SkillProficiency): string {
  return proficiencyLevelUiLabel(level);
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

function optionalPercent(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (Number.isNaN(num) || num < 0 || num > 100) return undefined;
  return num;
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
    ...(form.employerId ? { employerId: form.employerId } : {}),
    companyName: form.companyName.trim() || undefined,
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
    minSscPercentage: optionalPercent(form.minSscPercentage),
    minHscPercentage: optionalPercent(form.minHscPercentage),
    minCollegePercentage: optionalPercent(form.minCollegePercentage),
    backlogsAllowed: form.backlogsAllowedChoice === 'yes',
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

const OPENING_FIELD_LABELS: Record<string, string> = {
  employerId: 'Company',
  companyName: 'Company name',
  roleTitle: 'Role title',
  domain: 'Job domain',
  location: 'Location',
  employmentType: 'Job type',
  minYearsExperience: 'Minimum years experience',
  maxYearsExperience: 'Maximum years experience',
  requiredSkills: 'Required skills',
  driveDate: 'Drive date',
  lastDateToApply: 'Last date to apply',
  minSscPercentage: 'Minimum SSC percentage',
  minHscPercentage: 'Minimum HSC percentage',
  minCollegePercentage: 'Minimum college percentage',
};

/** The shape of a Zod v4 issue this cares about — kept structural so this file doesn't need its own `zod` dependency. */
type OpeningValidationIssue = {
  path: readonly PropertyKey[];
  code: string;
  message: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  origin?: string;
};

/**
 * Zod's default messages ("Too small: expected string to have >=1
 * characters") are accurate but meaningless to a TPO filling in a form —
 * this turns the first failing issue into a plain sentence naming the field.
 */
export function friendlyOpeningError(issues: readonly OpeningValidationIssue[]): string {
  const issue = issues[0];
  if (!issue) return 'Check the opening details and try again.';

  const key = issue.path[0] !== undefined ? String(issue.path[0]) : '';
  const field = OPENING_FIELD_LABELS[key] ?? (key || 'This opening');
  const unit = issue.origin === 'string' ? ' characters' : issue.origin === 'array' ? ' items' : '';

  switch (issue.code) {
    case 'invalid_type':
      return `${field} is required.`;
    case 'too_small':
      return issue.minimum === 1 || issue.minimum === undefined
        ? `${field} is required.`
        : `${field} must be at least ${issue.minimum}${unit}.`;
    case 'too_big':
      return `${field} must be at most ${issue.maximum}${unit}.`;
    case 'custom':
      return issue.message;
    default:
      return `${field}: ${issue.message}`;
  }
}
