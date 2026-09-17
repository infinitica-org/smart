import type { JobOpeningAttachedDocument, SkillProficiency } from '@smart/contracts';
import {
  labelFor,
  skillNameFor,
  type JobPostingCompanyLogo,
  type JobPostingFormState,
} from '../../lib/job-posting';
import {
  mutedTextClass,
  sectionLabelClass,
  sectionTitleClass,
  surfaceClass,
} from '../../lib/tpo-ui';

export function JobPostingPreview({
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
  const company = form.companyName.trim() || 'Company name';
  const role = form.roleTitle.trim() || 'Role title';
  const location = form.location.trim() || 'Location';

  return (
    <aside aria-label="Live job preview" className={`${surfaceClass} p-5 lg:sticky lg:top-24`}>
      <p className={sectionLabelClass}>Live Preview</p>
      <h2 className={`mt-1 ${sectionTitleClass}`}>Posting preview</h2>
      <p className={`mt-1 text-xs ${mutedTextClass}`}>
        Reflects the fields you enter — persisted when you post the opening.
      </p>

      <div className="mt-5 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-4">
        {companyLogo ? (
          <img
            src={companyLogo.previewUrl}
            alt=""
            className="mb-3 h-10 w-auto max-w-[140px] object-contain"
          />
        ) : null}
        <p className="text-sm font-semibold text-[var(--ds-text)]">{company}</p>
        <p className={`mt-0.5 text-sm ${mutedTextClass}`}>{role}</p>
        <p className={`mt-3 text-xs ${mutedTextClass}`}>
          {location} · {labelFor(form.employmentType)} · {labelFor(form.domain)}
        </p>
        {form.salaryDetails.trim() ? (
          <p className={`mt-2 text-xs font-medium text-[var(--ds-text)]`}>
            {form.salaryDetails.trim()}
          </p>
        ) : null}
      </div>

      {form.aboutCompany.trim() ? (
        <PreviewBlock label="About the Company" value={form.aboutCompany.trim()} multiline />
      ) : null}
      {form.companyOffers.trim() ? (
        <PreviewBlock label="What the Company Offers" value={form.companyOffers.trim()} multiline />
      ) : null}
      {form.additionalCompanyDetails.trim() ? (
        <PreviewBlock
          label="Additional Company Details"
          value={form.additionalCompanyDetails.trim()}
          multiline
        />
      ) : null}
      {form.roleDetails.trim() ? (
        <PreviewBlock label="Role Details" value={form.roleDetails.trim()} multiline />
      ) : null}

      {attachedDocuments.length > 0 ? (
        <PreviewBlock
          label="Attached documents"
          value={attachedDocuments.map((doc) => doc.fileName).join(', ')}
        />
      ) : null}
      <PreviewBlock
        label="Experience"
        value={`${form.minYearsExperience || '0'}–${form.maxYearsExperience || '0'} years`}
      />

      <div className="mt-4">
        <p className={sectionLabelClass}>Required skills</p>
        {skills.size === 0 ? (
          <p className={`mt-2 text-sm ${mutedTextClass}`}>No skills selected yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {[...skills].map(([code, proficiency]) => (
              <li
                key={code}
                className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2.5 py-1.5 text-xs text-[var(--ds-text)]"
              >
                {skillNameFor(code)}
                <span className={`mt-0.5 block ${mutedTextClass}`}>{labelFor(proficiency)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {form.roundDetails.trim() || form.hiringDetails.trim() || form.driveSpoc.trim() ? (
        <div className="mt-4 space-y-2">
          <p className={sectionLabelClass}>Hiring process</p>
          {form.roundDetails.trim() ? (
            <PreviewBlock label="Rounds" value={form.roundDetails.trim()} multiline />
          ) : null}
          {form.hiringDetails.trim() ? (
            <PreviewBlock label="Details" value={form.hiringDetails.trim()} multiline />
          ) : null}
          {form.driveSpoc.trim() ? (
            <PreviewBlock label="Drive SPOC" value={form.driveSpoc.trim()} />
          ) : null}
        </div>
      ) : null}

      {form.driveDate || form.lastDateToApply ? (
        <div className="mt-4">
          <p className={sectionLabelClass}>Drive</p>
          {form.driveDate ? <PreviewBlock label="Drive date" value={form.driveDate} /> : null}
          {form.lastDateToApply ? (
            <PreviewBlock label="Last date to apply" value={form.lastDateToApply} />
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function PreviewBlock({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="mt-4">
      <p className={sectionLabelClass}>{label}</p>
      <p
        className={`mt-1 text-sm font-medium text-[var(--ds-text)] ${multiline ? 'whitespace-pre-wrap' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
