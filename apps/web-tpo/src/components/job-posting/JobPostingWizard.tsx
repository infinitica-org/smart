'use client';

import { useEffect, useMemo, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import {
  EMPLOYMENT_TYPES,
  PLACEMENT_CITY_OPTIONS,
  SKILL_DEFINITIONS,
  SKILL_PROFICIENCIES,
  type JobOpeningAttachedDocument,
  type SkillProficiency,
} from '@smart/contracts';
import { Button } from '@smart/ui';
import { openingsApi } from '../../lib/api';
import {
  EMPTY_JOB_POSTING_FORM,
  JOB_POSTING_DOMAIN_OPTIONS,
  JOB_POSTING_STEPS,
  buildCreateOpeningPayload,
  clearJobPostingDraft,
  friendlyOpeningError,
  isCreateOpeningPayload,
  labelFor,
  loadJobPostingDraft,
  saveJobPostingDraft,
  skillNameFor,
  type JobPostingCompanyLogo,
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
import { JobPostingAttachedDocuments } from './JobPostingAttachedDocuments';
import { JobPostingCompanyLogoField } from './JobPostingCompanyLogo';
import { JobPostingPreview } from './JobPostingPreview';
import { JobPostingStepper } from './JobPostingStepper';
import { CompanyEmployerSelect } from '../placement/CompanyEmployerSelect';
import {
  JobPostingSelectField,
  JobPostingTextArea,
  JobPostingTextField,
} from './job-posting-fields';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

export function JobPostingWizard({ onCreated }: { onCreated: () => Promise<void> }) {
  const [step, setStep] = useState<JobPostingStepId>('company-role');
  const [form, setForm] = useState<JobPostingFormState>(EMPTY_JOB_POSTING_FORM);
  const [skills, setSkills] = useState<Map<string, SkillProficiency>>(new Map());
  const [skillToAdd, setSkillToAdd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState<string | null>(null);
  const [attachedDocuments, setAttachedDocuments] = useState<JobOpeningAttachedDocument[]>([]);
  const [companyLogo, setCompanyLogo] = useState<JobPostingCompanyLogo | null>(null);

  useEffect(() => {
    const draft = loadJobPostingDraft();
    if (draft) {
      setForm(draft.form);
      setSkills(draft.skills);
      setAttachedDocuments(draft.attachedDocuments);
      setCompanyLogo(draft.companyLogo);
    }
  }, []);

  const stepIndex = JOB_POSTING_STEPS.findIndex((item) => item.id === step);

  const addableSkills = useMemo(
    () => SKILL_DEFINITIONS.filter((skill) => !skills.has(skill.code)),
    [skills],
  );

  function updateForm(patch: Partial<JobPostingFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function go(delta: number) {
    saveJobPostingDraft(form, skills, attachedDocuments, companyLogo);
    const next = JOB_POSTING_STEPS[stepIndex + delta];
    if (next) setStep(next.id);
  }

  function handleSaveDraft() {
    saveJobPostingDraft(form, skills, attachedDocuments, companyLogo);
    setDraftSaved('Draft saved on this device. Server draft is created when you post the opening.');
    window.setTimeout(() => setDraftSaved(null), 4000);
  }

  function addSkillFromDropdown() {
    if (!skillToAdd || skills.has(skillToAdd)) return;
    setSkills(new Map(skills).set(skillToAdd, 'BEGINNER'));
    setSkillToAdd('');
  }

  function removeSkill(code: string) {
    const next = new Map(skills);
    next.delete(code);
    setSkills(next);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 'review') return;

    setFormError(null);
    setSuccess(null);

    const parsed = buildCreateOpeningPayload(form, skills, attachedDocuments, companyLogo);
    if (!isCreateOpeningPayload(parsed)) {
      setFormError(friendlyOpeningError(parsed.error.issues));
      return;
    }

    setSubmitting(true);
    try {
      const created = await openingsApi.create(parsed.data);
      setForm(EMPTY_JOB_POSTING_FORM);
      setSkills(new Map());
      setSkillToAdd('');
      setAttachedDocuments([]);
      setCompanyLogo(null);
      setStep('company-role');
      clearJobPostingDraft();
      setSuccess(
        `Job opening saved in Draft status. Job ID: ${created.openingId} — use this reference in Listed Openings and matching.`,
      );
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
            Placement <span className="mx-1 text-[var(--ds-text-subtle)]">›</span> Create Job
            Posting
          </p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-[var(--ds-text)]">
            Create Job Posting
          </h2>
          <p className={`mt-1 text-sm ${mutedTextClass}`}>
            Build a complete placement opportunity. Posting creates a Draft opening — there is no
            separate publish API.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className={secondaryButtonClass}
          onClick={handleSaveDraft}
        >
          Save draft
        </Button>
      </div>

      {draftSaved ? (
        <p role="status" className="text-sm font-medium text-[var(--tpo-accent)]">
          {draftSaved}
        </p>
      ) : null}
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
                Basic organization and role information for students.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <CompanyEmployerSelect
                    employerId={form.employerId}
                    companyName={form.companyName}
                    onSelect={(employer) =>
                      updateForm({
                        employerId: employer.employerId,
                        companyName: employer.name,
                        location: form.location || employer.location || '',
                        aboutCompany: form.aboutCompany || employer.aboutCompany || '',
                        companyOffers: form.companyOffers || employer.companyOffers || '',
                        additionalCompanyDetails:
                          form.additionalCompanyDetails || employer.additionalCompanyDetails || '',
                      })
                    }
                    onClear={() => updateForm({ employerId: '', companyName: '' })}
                    onCompanyNameDraft={(name) => updateForm({ companyName: name, employerId: '' })}
                  />
                </div>
                <JobPostingTextField
                  label="Role title"
                  value={form.roleTitle}
                  onChange={(event) => updateForm({ roleTitle: event.target.value })}
                  required
                  placeholder="e.g. Backend Engineer"
                />
                <JobPostingSelectField
                  label="Location"
                  value={form.location}
                  onChange={(location) => updateForm({ location })}
                  options={PLACEMENT_CITY_OPTIONS}
                  emptyLabel="Select city"
                />
                <JobPostingSelectField
                  label="Job type"
                  value={form.employmentType}
                  onChange={(employmentType) => updateForm({ employmentType })}
                  options={EMPLOYMENT_TYPES}
                />
                <JobPostingSelectField
                  label="Job domain"
                  value={form.domain}
                  onChange={(domain) => updateForm({ domain })}
                  options={[...JOB_POSTING_DOMAIN_OPTIONS]}
                  emptyLabel="Select domain"
                  optionLabel={(id) => labelFor(id)}
                />
                <JobPostingCompanyLogoField logo={companyLogo} onChange={setCompanyLogo} />
              </div>
            </section>
          ) : null}

          {step === 'company-role' ? (
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>About the Company</h2>
              <div className="mt-5 flex flex-col gap-4">
                <JobPostingTextArea
                  label="About the Company"
                  value={form.aboutCompany}
                  onChange={(event) => updateForm({ aboutCompany: event.target.value })}
                  placeholder="Tell students about the company, its mission, culture, products, and work environment..."
                  rows={6}
                />
                <JobPostingTextArea
                  label="What the Company Offers"
                  value={form.companyOffers}
                  onChange={(event) => updateForm({ companyOffers: event.target.value })}
                  placeholder="Benefits, learning opportunities, perks, career growth, work culture..."
                  rows={4}
                />
                <JobPostingTextArea
                  label="Additional Company Details"
                  value={form.additionalCompanyDetails}
                  onChange={(event) => updateForm({ additionalCompanyDetails: event.target.value })}
                  placeholder="Any additional information students should know about the company..."
                  rows={4}
                />
              </div>
            </section>
          ) : null}

          {step === 'role-requirements' ? (
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>Role Details</h2>
              <div className="mt-5 flex flex-col gap-4">
                <JobPostingTextArea
                  label="Role Details"
                  value={form.roleDetails}
                  onChange={(event) => updateForm({ roleDetails: event.target.value })}
                  placeholder="Describe responsibilities, expectations, and day-to-day work..."
                  rows={8}
                />
                <JobPostingTextField
                  label="Salary Details"
                  value={form.salaryDetails}
                  onChange={(event) => updateForm({ salaryDetails: event.target.value })}
                  placeholder="e.g. 6–8 LPA (CTC)"
                />
                <JobPostingAttachedDocuments
                  documents={attachedDocuments}
                  onChange={setAttachedDocuments}
                />
              </div>
            </section>
          ) : null}

          {step === 'role-requirements' ? (
            <section className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className={sectionTitleClass}>Requirements</h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>
                    Experience range and required taxonomy skills with minimum proficiency.
                  </p>
                </div>
                <button type="button" className={primaryButtonClass} onClick={() => go(1)}>
                  Save & Continue
                </button>
              </div>
              <div className="mt-6 border-t border-[var(--ds-border-subtle)] pt-6">
                <h3 className="text-sm font-semibold text-[var(--ds-text)]">
                  Eligibility criteria
                </h3>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>
                  Students must meet these thresholds to appear in matching and be shortlisted for
                  this drive. Leave blank to skip a rule.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <JobPostingTextField
                    label="Minimum 10th / SSC (%)"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.minSscPercentage}
                    onChange={(event) => updateForm({ minSscPercentage: event.target.value })}
                    placeholder="e.g. 60"
                  />
                  <JobPostingTextField
                    label="Minimum 12th / diploma (%)"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.minHscPercentage}
                    onChange={(event) => updateForm({ minHscPercentage: event.target.value })}
                    placeholder="e.g. 65"
                  />
                  <JobPostingTextField
                    label="Minimum college (%)"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.minCollegePercentage}
                    onChange={(event) => updateForm({ minCollegePercentage: event.target.value })}
                    placeholder="CGPA × 10 — e.g. 70 for 7.0 CGPA"
                  />
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-[var(--ds-text)]">
                      Active backlogs allowed?
                    </span>
                    <select
                      className={inputClass}
                      value={form.backlogsAllowedChoice}
                      onChange={(event) =>
                        updateForm({
                          backlogsAllowedChoice: event.target.value as 'yes' | 'no',
                        })
                      }
                      aria-label="Active backlogs allowed"
                    >
                      <option value="yes">Yes — students with backlogs may apply</option>
                      <option value="no">No — only students without active backlogs</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <JobPostingTextField
                  label="Minimum years experience"
                  type="number"
                  min={0}
                  max={40}
                  value={form.minYearsExperience}
                  onChange={(event) => updateForm({ minYearsExperience: event.target.value })}
                  required
                />
                <JobPostingTextField
                  label="Maximum years experience"
                  type="number"
                  min={0}
                  max={40}
                  value={form.maxYearsExperience}
                  onChange={(event) => updateForm({ maxYearsExperience: event.target.value })}
                  required
                />
              </div>
              <div className="mt-6 flex flex-wrap items-end gap-3">
                <label className="grid min-w-[220px] flex-1 gap-1.5">
                  <span className="text-sm font-semibold text-[var(--ds-text)]">
                    Add required skill
                  </span>
                  <select
                    aria-label="Add required skill"
                    className={inputClass}
                    value={skillToAdd}
                    onChange={(event) => setSkillToAdd(event.target.value)}
                  >
                    <option value="">Select a skill…</option>
                    {addableSkills.map((skill) => (
                      <option key={skill.code} value={skill.code}>
                        {skill.name} ({skill.categoryName})
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={!skillToAdd}
                  onClick={addSkillFromDropdown}
                >
                  Add skill
                </button>
                <span className={accentChipClass}>{skills.size} selected</span>
              </div>
              <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
                {skills.size === 0 ? (
                  <p className={`text-sm ${mutedTextClass}`}>Add at least one skill to continue.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {[...skills].map(([code, proficiency]) => (
                      <li
                        key={code}
                        className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ds-text)]">
                              {skillNameFor(code)}
                            </p>
                            <p className={`text-[11px] ${subtleTextClass}`}>
                              {SKILL_DEFINITIONS.find((s) => s.code === code)?.categoryName}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-semibold text-[var(--ds-coral)]"
                            onClick={() => removeSkill(code)}
                          >
                            Remove
                          </button>
                        </div>
                        <label className="mt-3 grid gap-1.5">
                          <span className="sr-only">
                            Minimum proficiency for {skillNameFor(code)}
                          </span>
                          <select
                            className={inputClass}
                            value={proficiency}
                            onChange={(event) =>
                              setSkills(
                                new Map(skills).set(code, event.target.value as SkillProficiency),
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : null}

          {step === 'hiring-drive' ? (
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>Hiring Process</h2>
              <div className="mt-5 flex flex-col gap-4">
                <JobPostingTextArea
                  label="Round Details"
                  value={form.roundDetails}
                  onChange={(event) => updateForm({ roundDetails: event.target.value })}
                  placeholder={
                    'Round 1 — Online Assessment\nRound 2 — Technical Interview\nRound 3 — HR Interview'
                  }
                  rows={5}
                />
                <JobPostingTextArea
                  label="Hiring Details"
                  value={form.hiringDetails}
                  onChange={(event) => updateForm({ hiringDetails: event.target.value })}
                  placeholder="Describe the hiring process, selection stages, interview format, assessment process, and other recruitment details..."
                  rows={6}
                />
                <JobPostingTextField
                  label="Drive SPOC"
                  value={form.driveSpoc}
                  onChange={(event) => updateForm({ driveSpoc: event.target.value })}
                  placeholder="Placement / company point of contact for this drive"
                />
              </div>
            </section>
          ) : null}

          {step === 'hiring-drive' ? (
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>Drive Details</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <JobPostingTextField
                  label="Drive Date"
                  type="date"
                  value={form.driveDate}
                  onChange={(event) => updateForm({ driveDate: event.target.value })}
                />
                <JobPostingTextField
                  label="Last Date to Apply"
                  type="date"
                  value={form.lastDateToApply}
                  onChange={(event) => updateForm({ lastDateToApply: event.target.value })}
                />
              </div>
            </section>
          ) : null}

          {step === 'review' ? (
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>Review & Post</h2>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                Confirm details before posting. Status will be Draft.
              </p>
              <ReviewSections
                form={form}
                skills={skills}
                attachedDocuments={attachedDocuments}
                companyLogo={companyLogo}
              />
            </section>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => go(-1)}
              disabled={stepIndex === 0}
            >
              ← Previous
            </button>
            {stepIndex < JOB_POSTING_STEPS.length - 1 ? (
              <button type="button" className={primaryButtonClass} onClick={() => go(1)}>
                Save & Continue →
              </button>
            ) : (
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={submitting || skills.size === 0}
              >
                {submitting ? 'Posting…' : 'Post Job →'}
              </button>
            )}
          </div>
        </div>

        <JobPostingPreview
          form={form}
          skills={skills}
          attachedDocuments={attachedDocuments}
          companyLogo={companyLogo}
        />
      </div>
    </form>
  );
}

function ReviewSections({
  form,
  skills,
  attachedDocuments,
  companyLogo,
}: {
  form: JobPostingFormState;
  skills: ReadonlyMap<string, SkillProficiency>;
  attachedDocuments: readonly JobOpeningAttachedDocument[];
  companyLogo: JobPostingCompanyLogo | null;
}) {
  return (
    <div className="mt-5 grid gap-5">
      <ReviewGroup title="Company & Role">
        <ReviewItem label="Company" value={form.companyName || '—'} />
        <ReviewItem label="Role" value={form.roleTitle || '—'} />
        <ReviewItem label="Location" value={form.location || '—'} />
        <ReviewItem label="Job type" value={labelFor(form.employmentType)} />
        <ReviewItem label="Domain" value={labelFor(form.domain)} />
        <ReviewItem label="Company logo" value={companyLogo?.fileName ?? '—'} />
      </ReviewGroup>
      <ReviewGroup title="About the Company">
        <ReviewItem label="About" value={form.aboutCompany.trim() || '—'} fullWidth />
        <ReviewItem label="Offers" value={form.companyOffers.trim() || '—'} fullWidth />
        <ReviewItem
          label="Additional"
          value={form.additionalCompanyDetails.trim() || '—'}
          fullWidth
        />
      </ReviewGroup>
      <ReviewGroup title="Role Details">
        <ReviewItem label="Description" value={form.roleDetails.trim() || '—'} fullWidth />
        <ReviewItem label="Salary" value={form.salaryDetails.trim() || '—'} />
        <ReviewItem
          label="Documents"
          value={
            attachedDocuments.length === 0
              ? 'None'
              : attachedDocuments.map((doc) => doc.fileName).join(', ')
          }
          fullWidth
        />
      </ReviewGroup>
      <ReviewGroup title="Requirements">
        <ReviewItem
          label="Experience"
          value={`${form.minYearsExperience}–${form.maxYearsExperience} years`}
        />
        <ReviewItem
          label="Skills"
          value={
            skills.size === 0
              ? 'None'
              : [...skills].map(([code, p]) => `${skillNameFor(code)} (${labelFor(p)})`).join(', ')
          }
          fullWidth
        />
        <ReviewItem label="10th min (%)" value={form.minSscPercentage.trim() || 'Any'} />
        <ReviewItem label="12th / diploma min (%)" value={form.minHscPercentage.trim() || 'Any'} />
        <ReviewItem label="College min (%)" value={form.minCollegePercentage.trim() || 'Any'} />
        <ReviewItem
          label="Backlogs"
          value={form.backlogsAllowedChoice === 'yes' ? 'Allowed' : 'Not allowed'}
        />
      </ReviewGroup>
      <ReviewGroup title="Hiring Process">
        <ReviewItem label="Rounds" value={form.roundDetails.trim() || '—'} fullWidth />
        <ReviewItem label="Hiring details" value={form.hiringDetails.trim() || '—'} fullWidth />
        <ReviewItem label="Drive SPOC" value={form.driveSpoc.trim() || '—'} />
      </ReviewGroup>
      <ReviewGroup title="Drive Details">
        <ReviewItem label="Drive date" value={form.driveDate || '—'} />
        <ReviewItem label="Last date to apply" value={form.lastDateToApply || '—'} />
      </ReviewGroup>
    </div>
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

function ReviewItem({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : undefined}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--ds-text-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold text-[var(--ds-text)]">
        {value}
      </dd>
    </div>
  );
}
