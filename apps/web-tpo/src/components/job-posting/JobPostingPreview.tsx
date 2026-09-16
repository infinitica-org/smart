import { SKILL_CATEGORIES, type SkillCategoryId } from '@smart/contracts';
import { labelFor, skillNameFor, type JobPostingFormState } from '../../lib/job-posting';
import type { SkillProficiency } from '@smart/contracts';
import {
  mutedTextClass,
  sectionLabelClass,
  sectionTitleClass,
  surfaceClass,
} from '../../lib/tpo-ui';

export function JobPostingPreview({
  form,
  skills,
}: {
  form: JobPostingFormState;
  skills: ReadonlyMap<string, SkillProficiency>;
}) {
  const company = form.companyName.trim() || 'Company name';
  const role = form.roleTitle.trim() || 'Role title';
  const location = form.location.trim() || 'Location';

  return (
    <aside aria-label="Live job preview" className={`${surfaceClass} p-5 lg:sticky lg:top-24`}>
      <p className={sectionLabelClass}>Live Preview</p>
      <h2 className={`mt-1 ${sectionTitleClass}`}>Posting data preview</h2>
      <p className={`mt-1 text-xs ${mutedTextClass}`}>
        This is a live representation of the opening fields being entered — not a student job-board
        rendering.
      </p>

      <div className="mt-5 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-4">
        <p className="text-sm font-semibold text-[var(--ds-text)]">{company}</p>
        <p className={`mt-0.5 text-sm ${mutedTextClass}`}>{role}</p>
        <p className={`mt-3 text-xs ${mutedTextClass}`}>
          {location} · {labelFor(form.employmentType)}
        </p>
        <p className={`mt-1 text-xs ${mutedTextClass}`}>{labelFor(form.domain)}</p>
      </div>

      <PreviewBlock label="Headcount" value={`${form.headcount || '—'} position(s)`} />
      <PreviewBlock
        label="Experience"
        value={`${form.minYearsExperience || '0'}–${form.maxYearsExperience || '0'} years`}
      />
      <PreviewBlock
        label="Category"
        value={
          form.categoryId
            ? (SKILL_CATEGORIES[form.categoryId as SkillCategoryId]?.name ?? form.categoryId)
            : 'All categories'
        }
      />

      <div className="mt-4">
        <p className={sectionLabelClass}>Requirements</p>
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

      <p className={`mt-5 text-xs ${mutedTextClass}`}>
        Salary, about the company, drive dates, SPOC, and documents are not part of this opening
        model and will not appear here.
      </p>
    </aside>
  );
}

function PreviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <p className={sectionLabelClass}>{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--ds-text)]">{value}</p>
    </div>
  );
}
