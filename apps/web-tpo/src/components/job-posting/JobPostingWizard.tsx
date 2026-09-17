'use client';

import { useMemo, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import {
  EMPLOYMENT_TYPES,
  SKILL_CATEGORIES,
  SKILL_CATEGORY_IDS,
  SKILL_DEFINITIONS,
  SKILL_PROFICIENCIES,
  SKILL_TAXONOMY_DOMAINS,
  type SkillCategoryId,
  type SkillProficiency,
} from '@smart/contracts';
import { Button } from '@smart/ui';
import { openingsApi } from '../../lib/api';
import {
  EMPTY_JOB_POSTING_FORM,
  JOB_POSTING_STEPS,
  buildCreateOpeningPayload,
  isCreateOpeningPayload,
  labelFor,
  skillNameFor,
  type JobPostingFormState,
  type JobPostingStepId,
} from '../../lib/job-posting';
import {
  accentChipClass,
  cardClass,
  errorNoticeClass,
  inputClass,
  mutedTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
  subtleTextClass,
} from '../../lib/tpo-ui';
import { JobPostingPreview } from './JobPostingPreview';
import { JobPostingStepper } from './JobPostingStepper';
import {
  JobPostingSelectField,
  JobPostingTextField,
  UnsupportedFieldNotice,
} from './job-posting-fields';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

export function JobPostingWizard({ onCreated }: { onCreated: () => Promise<void> }) {
  const [step, setStep] = useState<JobPostingStepId>('company-role');
  const [form, setForm] = useState<JobPostingFormState>(EMPTY_JOB_POSTING_FORM);
  const [skills, setSkills] = useState<Map<string, SkillProficiency>>(new Map());
  const [skillQuery, setSkillQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const stepIndex = JOB_POSTING_STEPS.findIndex((item) => item.id === step);
  const visibleSkills = useMemo(
    () =>
      SKILL_DEFINITIONS.filter((skill) => {
        if (form.categoryId && skill.categoryId !== form.categoryId) return false;
        if (!skillQuery.trim()) return true;
        const query = skillQuery.toLowerCase();
        return (
          skill.name.toLowerCase().includes(query) ||
          skill.categoryName.toLowerCase().includes(query)
        );
      }),
    [form.categoryId, skillQuery],
  );

  function updateSkill(code: string, selected: boolean) {
    setSkills((current) => {
      const next = new Map(current);
      if (selected) next.set(code, 'BEGINNER');
      else next.delete(code);
      return next;
    });
  }

  function go(delta: number) {
    const next = JOB_POSTING_STEPS[stepIndex + delta];
    if (next) setStep(next.id);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    const parsed = buildCreateOpeningPayload(form, skills);
    if (!isCreateOpeningPayload(parsed)) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the opening details.');
      return;
    }

    setSubmitting(true);
    try {
      await openingsApi.create(parsed.data);
      setForm(EMPTY_JOB_POSTING_FORM);
      setSkills(new Map());
      setSkillQuery('');
      setStep('company-role');
      setSuccess('Job opening created in Draft status.');
      await onCreated();
    } catch (caught) {
      setFormError(errorMessage(caught, 'Could not create the job opening.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs text-[var(--ds-text-muted)]">
            Placement <span className="mx-1 text-[var(--ds-text-subtle)]">›</span> Openings{' '}
            <span className="mx-1 text-[var(--ds-text-subtle)]">›</span> Create Job Posting
          </p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-[var(--ds-text)]">
            Create Job Posting
          </h2>
          <p className={`mt-1 text-sm ${mutedTextClass}`}>
            Build a complete placement opportunity for students. Created openings start as Draft —
            there is no publish API.
          </p>
        </div>
        <Button
          type="submit"
          variant="ghost"
          isLoading={submitting}
          disabled={skills.size === 0}
          className={primaryButtonClass}
        >
          Create opening
        </Button>
      </div>

      {formError ? (
        <div role="alert" className={errorNoticeClass}>
          <p className="font-semibold">Opening not created</p>
          <p className="mt-0.5">{formError}</p>
        </div>
      ) : null}
      {success ? (
        <div
          role="status"
          className="rounded-xl border border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)] px-4 py-3 text-sm font-semibold text-[var(--ds-text)]"
        >
          {success}
        </div>
      ) : null}

      <JobPostingStepper currentStep={step} onSelect={setStep} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] xl:items-start">
        <div className="min-w-0">
          {step === 'company-role' ? (
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>Company & Role</h2>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                Basic information about the organization and role. Institution and creator come from
                your TPO session.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <JobPostingTextField
                  label="Company name"
                  value={form.companyName}
                  onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                  required
                  placeholder="e.g. Infinitica Labs"
                />
                <JobPostingTextField
                  label="Role title"
                  value={form.roleTitle}
                  onChange={(event) => setForm({ ...form, roleTitle: event.target.value })}
                  required
                  placeholder="e.g. Backend Engineer"
                />
                <JobPostingTextField
                  label="Location"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  required
                  placeholder="e.g. Coimbatore"
                />
                <JobPostingSelectField
                  label="Job type"
                  value={form.employmentType}
                  onChange={(employmentType) => setForm({ ...form, employmentType })}
                  options={EMPLOYMENT_TYPES}
                />
                <JobPostingSelectField
                  label="Job domain"
                  value={form.domain}
                  onChange={(domain) => setForm({ ...form, domain })}
                  options={SKILL_TAXONOMY_DOMAINS}
                />
              </div>
            </section>
          ) : null}

          {step === 'about-company' ? (
            <UnsupportedFieldNotice
              title="About Company"
              description="The current JobOpening model stores company name only. These details are not collected because they would disappear on submit."
              fields={[
                'About the Company',
                'What the Company Offers',
                'Additional company details',
              ]}
            />
          ) : null}

          {step === 'job-details' ? (
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>Job Details</h2>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                Remaining structured opening fields. There is no free-text job description column.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <JobPostingSelectField
                  label="Category (optional)"
                  value={form.categoryId}
                  onChange={(categoryId) => setForm({ ...form, categoryId })}
                  options={SKILL_CATEGORY_IDS}
                  emptyLabel="All categories"
                  optionLabel={(id) => SKILL_CATEGORIES[id as SkillCategoryId]?.name ?? id}
                />
                <JobPostingTextField
                  label="Headcount"
                  type="number"
                  min={1}
                  max={10_000}
                  value={form.headcount}
                  onChange={(event) => setForm({ ...form, headcount: event.target.value })}
                  required
                />
              </div>
            </section>
          ) : null}

          {step === 'requirements' ? (
            <section className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className={sectionTitleClass}>Required skills</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>
                    Select at least one taxonomy skill and its minimum proficiency. The optional
                    category on Job Details narrows this list.
                  </p>
                </div>
                <span className={accentChipClass}>{skills.size} selected</span>
              </div>
              {skills.size > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {[...skills].map(([code]) => (
                    <li key={code} className={accentChipClass}>
                      {skillNameFor(code)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <label className="mt-5 grid gap-1.5">
                <span className="sr-only">Search skills</span>
                <input
                  className={inputClass}
                  value={skillQuery}
                  onChange={(event) => setSkillQuery(event.target.value)}
                  placeholder="Search skills or category…"
                />
              </label>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {visibleSkills.map((skill) => {
                  const proficiency = skills.get(skill.code);
                  return (
                    <div
                      key={skill.code}
                      className={`rounded-xl border p-3.5 transition ${
                        proficiency
                          ? 'border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)]'
                          : 'border-[var(--ds-border)] bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-hover)]'
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-[var(--ds-text)]">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--ds-border)] accent-[var(--tpo-accent)]"
                          checked={proficiency !== undefined}
                          onChange={(event) => updateSkill(skill.code, event.target.checked)}
                        />
                        <span>
                          {skill.name}
                          <span
                            className={`mt-0.5 block text-[11px] font-normal ${subtleTextClass}`}
                          >
                            {skill.categoryName}
                          </span>
                        </span>
                      </label>
                      {proficiency ? (
                        <label className="mt-3 grid gap-1.5">
                          <span className="sr-only">Minimum proficiency for {skill.name}</span>
                          <select
                            className={inputClass}
                            value={proficiency}
                            onChange={(event) =>
                              setSkills(
                                new Map(skills).set(
                                  skill.code,
                                  event.target.value as SkillProficiency,
                                ),
                              )
                            }
                          >
                            {SKILL_PROFICIENCIES.map((level) => (
                              <option key={level} value={level}>
                                {labelFor(level)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {step === 'eligibility' ? (
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>Eligibility</h2>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                Experience range is the only eligibility the JobOpening contract stores.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <JobPostingTextField
                  label="Minimum years experience"
                  type="number"
                  min={0}
                  max={40}
                  value={form.minYearsExperience}
                  onChange={(event) => setForm({ ...form, minYearsExperience: event.target.value })}
                  required
                />
                <JobPostingTextField
                  label="Maximum years experience"
                  type="number"
                  min={0}
                  max={40}
                  value={form.maxYearsExperience}
                  onChange={(event) => setForm({ ...form, maxYearsExperience: event.target.value })}
                  required
                />
              </div>
            </section>
          ) : null}

          {step === 'hiring-process' ? (
            <UnsupportedFieldNotice
              title="Hiring Process"
              description="Round details, interview process, and Drive SPOC are not fields on JobOpening."
              fields={['Round Details', 'Hiring Details', 'Drive SPOC']}
            />
          ) : null}

          {step === 'drive-details' ? (
            <UnsupportedFieldNotice
              title="Drive Details"
              description="Drive date and last date to apply are not fields on JobOpening. Location already lives on Company & Role."
              fields={['Drive Date', 'Last Date to Apply', 'Drive SPOC']}
            />
          ) : null}

          {step === 'review' ? (
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>Review & Publish</h2>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                Confirm the fields that POST /placement/openings will persist. Status will be Draft
                — there is no separate publish action.
              </p>
              <div className="mt-5 grid gap-5">
                <ReviewGroup title="Company">
                  <ReviewItem label="Company" value={form.companyName || '—'} />
                  <ReviewItem label="Location" value={form.location || '—'} />
                </ReviewGroup>
                <ReviewGroup title="Role">
                  <ReviewItem label="Role" value={form.roleTitle || '—'} />
                  <ReviewItem label="Domain" value={labelFor(form.domain)} />
                  <ReviewItem label="Job type" value={labelFor(form.employmentType)} />
                  <ReviewItem label="Headcount" value={form.headcount || '—'} />
                  <ReviewItem
                    label="Category"
                    value={
                      form.categoryId
                        ? (SKILL_CATEGORIES[form.categoryId as SkillCategoryId]?.name ??
                          form.categoryId)
                        : 'All categories'
                    }
                  />
                </ReviewGroup>
                <ReviewGroup title="Eligibility">
                  <ReviewItem
                    label="Experience"
                    value={`${form.minYearsExperience}–${form.maxYearsExperience} years`}
                  />
                </ReviewGroup>
                <ReviewGroup title="Requirements">
                  <ReviewItem
                    label="Required skills"
                    value={
                      skills.size === 0
                        ? 'None selected'
                        : [...skills]
                            .map(
                              ([code, proficiency]) =>
                                `${skillNameFor(code)} (${labelFor(proficiency)})`,
                            )
                            .join(', ')
                    }
                  />
                </ReviewGroup>
              </div>
            </section>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => go(-1)}
              disabled={stepIndex === 0}
            >
              Previous
            </button>
            {stepIndex < JOB_POSTING_STEPS.length - 1 ? (
              <button type="button" className={primaryButtonClass} onClick={() => go(1)}>
                Save & Continue
              </button>
            ) : (
              <p className={`text-sm ${mutedTextClass}`}>
                Submit with Create opening. Status will be Draft.
              </p>
            )}
          </div>
        </div>

        <JobPostingPreview form={form} skills={skills} />
      </div>
    </form>
  );
}

function ReviewGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--ds-text-subtle)]">
        {title}
      </h3>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--ds-text-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-[var(--ds-text)]">{value}</dd>
    </div>
  );
}
