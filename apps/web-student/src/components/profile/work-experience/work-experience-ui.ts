export const experienceInputClass =
  'mt-1.5 h-11 w-full rounded-[11px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--ds-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-green)]/20';

export const experienceTextareaClass =
  'mt-1.5 w-full rounded-[11px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2.5 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--ds-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-green)]/20';

export const experienceLabelClass = 'block text-[13px] font-medium text-[var(--ds-text-secondary)]';

export const EXPERIENCE_BUILDER_STEPS = [
  { id: 'role', title: 'Role Details', subtitle: 'Basic information' },
  { id: 'employment', title: 'Employment', subtitle: 'Type and location' },
  {
    id: 'professional',
    title: 'Professional Details',
    subtitle: 'Domain, skills and responsibilities',
  },
  { id: 'evidence', title: 'Evidence', subtitle: 'Upload documents' },
  { id: 'verification', title: 'Verification', subtitle: 'Employer verification' },
] as const;

export type ExperienceBuilderStepId = (typeof EXPERIENCE_BUILDER_STEPS)[number]['id'];

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  FREELANCE: 'Freelance',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  OFFER_LETTER: 'Offer Letter',
  EXPERIENCE_LETTER: 'Experience Letter',
  PAYSLIP: 'Payslip',
  RELIEVING_LETTER: 'Relieving Letter',
  FORM_16: 'Form 16',
  OTHER: 'Other Proof Document',
};
