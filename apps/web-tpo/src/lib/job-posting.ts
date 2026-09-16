import {
  CreateJobOpeningRequestSchema,
  SKILL_DEFINITIONS,
  type CreateJobOpeningRequest,
  type SkillCategoryId,
  type SkillProficiency,
} from '@smart/contracts';

export type JobPostingFormState = {
  companyName: string;
  roleTitle: string;
  domain: string;
  categoryId: string;
  minYearsExperience: string;
  maxYearsExperience: string;
  location: string;
  employmentType: string;
  headcount: string;
};

export const EMPTY_JOB_POSTING_FORM: JobPostingFormState = {
  companyName: '',
  roleTitle: '',
  domain: 'SOFTWARE_IT',
  categoryId: '',
  minYearsExperience: '0',
  maxYearsExperience: '0',
  location: '',
  employmentType: 'FULL_TIME',
  headcount: '1',
};

export const JOB_POSTING_STEPS = [
  { id: 'company-role', label: 'Company & Role', shortLabel: 'Company' },
  { id: 'about-company', label: 'About Company', shortLabel: 'About' },
  { id: 'job-details', label: 'Job Details', shortLabel: 'Job' },
  { id: 'requirements', label: 'Requirements', shortLabel: 'Requirements' },
  { id: 'eligibility', label: 'Eligibility', shortLabel: 'Eligibility' },
  { id: 'hiring-process', label: 'Hiring Process', shortLabel: 'Hiring' },
  { id: 'drive-details', label: 'Drive Details', shortLabel: 'Drive' },
  { id: 'review', label: 'Review & Publish', shortLabel: 'Review' },
] as const;

export type JobPostingStepId = (typeof JOB_POSTING_STEPS)[number]['id'];

/** Fields requested by the posting UI that the current JobOpening contract cannot store. */
export const UNSUPPORTED_JOB_POSTING_FIELDS = [
  'About the Company',
  'What the Company Offers',
  'Job Description / JD text',
  'Salary Details',
  'Role Details (long description)',
  'Additional Details',
  'Attached Documents',
  'Drive Date',
  'Last Date to Apply',
  'Drive SPOC',
  'Round Details',
  'Hiring Process',
] as const;

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

export function buildCreateOpeningPayload(
  form: JobPostingFormState,
  skills: ReadonlyMap<string, SkillProficiency>,
) {
  return CreateJobOpeningRequestSchema.safeParse({
    ...form,
    categoryId: (form.categoryId as SkillCategoryId) || undefined,
    minYearsExperience: Number(form.minYearsExperience),
    maxYearsExperience: Number(form.maxYearsExperience),
    headcount: Number(form.headcount),
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
