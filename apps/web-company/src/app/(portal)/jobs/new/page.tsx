'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ChipGroup, PageHeader, SkillsEditor, type SkillReq } from '../../../../components/ui';
import { LocationInput } from '../../../../components/location-input';
import { toRequiredSkills } from '../../../../lib/skill-catalog';
import { companyJobsApi, formatApiError } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/auth';
import {
  card,
  input,
  label,
  pageStack,
  primaryButton,
  secondaryButton,
  sectionSubtitle,
  sectionTitle,
  textarea,
} from '../../../../lib/ui';

const EMPLOYMENT_TYPES = ['Full-time', 'Internship', 'Part-time'] as const;
const VERIFICATIONS = ['Endorsed experience', 'Certification', 'Project defended'] as const;

export default function PostJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<(typeof EMPLOYMENT_TYPES)[number][]>(['Full-time']);
  const [location, setLocation] = useState('');
  const [pay, setPay] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<SkillReq[]>([]);
  const [verifications, setVerifications] = useState<(typeof VERIFICATIONS)[number][]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const titleInvalid = attempted && title.trim().length === 0;

  async function submit(_kind: 'publish' | 'draft') {
    setAttempted(true);
    if (!title.trim()) {
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const me = await getCurrentUser();
      const domainName = me?.email?.split('@')[1]?.split('.')[0];
      const companyName = domainName
        ? domainName.charAt(0).toUpperCase() + domainName.slice(1)
        : 'Employer Partner';

      const empType =
        type[0] === 'Internship'
          ? 'INTERNSHIP'
          : type[0] === 'Part-time'
            ? 'PART_TIME'
            : 'FULL_TIME';

      await companyJobsApi.create({
        companyName,
        roleTitle: title.trim(),
        domain: 'SOFTWARE_IT',
        employmentType: empType,
        minYearsExperience: 0,
        maxYearsExperience: 3,
        location: location.trim() || 'Remote',
        salaryDetails: pay.trim() || undefined,
        roleDetails: description.trim() || undefined,
        requiredSkills: toRequiredSkills(skills),
      });

      router.push('/jobs');
    } catch (err) {
      setError(formatApiError(err, 'Failed to publish job opening.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={pageStack}>
      <PageHeader
        title="Post a Job Opening"
        description="Define competency requirements, desired evidence benchmarks, and role compensation."
      />

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit('publish');
        }}
      >
        <section className={`${card} space-y-5`}>
          <div>
            <label htmlFor="job-title" className={label}>
              Job Title
            </label>
            <input
              id="job-title"
              value={title}
              required
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={titleInvalid}
              placeholder="e.g. Frontend Engineer Intern"
              className={`${input} ${titleInvalid ? '!border-[var(--co-red)]' : ''}`}
            />
            {titleInvalid ? (
              <p className="mt-1.5 text-[12px] text-[var(--co-red)]">Job title is required.</p>
            ) : null}
          </div>

          <div>
            <span className={label}>Employment Type</span>
            <ChipGroup options={EMPLOYMENT_TYPES} value={type} onChange={setType} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="job-location" className={label}>
                Location / Work Mode
              </label>
              <LocationInput
                id="job-location"
                value={location}
                onChange={setLocation}
                placeholder="e.g. Bengaluru, Remote, or Hybrid"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="job-pay" className={label}>
                Salary / Compensation Range
              </label>
              <input
                id="job-pay"
                value={pay}
                onChange={(e) => setPay(e.target.value)}
                placeholder="e.g. ₹40,000 / month or ₹8-12 LPA"
                className={input}
              />
            </div>
          </div>

          <div>
            <label htmlFor="job-description" className={label}>
              Role Scope & Responsibilities
            </label>
            <textarea
              id="job-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline what projects and technical challenges the candidate will tackle..."
              className={textarea}
            />
          </div>
        </section>

        <section className={`${card} space-y-5`}>
          <div>
            <h2 className={sectionTitle}>Required Skills & Minimum Proficiency</h2>
            <p className={sectionSubtitle}>
              Candidates are matched based on verifiable benchmark test results.
            </p>
            <div className="mt-3">
              <SkillsEditor skills={skills} onChange={setSkills} />
            </div>
          </div>

          <div>
            <h2 className={sectionTitle}>Required Proof of Competency</h2>
            <p className={sectionSubtitle}>
              Select mandatory validation badges required before candidate application.
            </p>
            <div className="mt-3">
              <ChipGroup
                multiple
                options={VERIFICATIONS}
                value={verifications}
                onChange={setVerifications}
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/jobs"
            className="mr-auto text-[13px] font-semibold text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit('draft')}
            className={secondaryButton}
          >
            Save as draft
          </button>
          <button type="submit" disabled={submitting} className={primaryButton}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Publishing...
              </>
            ) : (
              'Publish job'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
