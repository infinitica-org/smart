'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import {
  ChipGroup,
  Modal,
  PageHeader,
  SkillsEditor,
  type SkillReq,
} from '../../../../../components/ui';
import { companyJobsApi, formatApiError } from '../../../../../lib/api';
import type { JobStatus } from '../../../../../lib/types';
import {
  card,
  dangerButton,
  input,
  label,
  pageStack,
  primaryButton,
  secondaryButton,
  sectionSubtitle,
  sectionTitle,
  textarea,
} from '../../../../../lib/ui';

const STATUSES = ['Active', 'Paused', 'Closed'] as const;
const EMPLOYMENT_TYPES = ['Full-time', 'Internship', 'Part-time'] as const;
const VERIFICATIONS = ['Endorsed experience', 'Certification', 'Project defended'] as const;

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<(typeof EMPLOYMENT_TYPES)[number][]>(['Full-time']);
  const [location, setLocation] = useState('');
  const [pay, setPay] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<SkillReq[]>([]);
  const [verifications, setVerifications] = useState<(typeof VERIFICATIONS)[number][]>([]);
  const [status, setStatus] = useState<JobStatus[]>(['Active']);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadJob() {
      if (!params.id) return;
      try {
        const res = await companyJobsApi.get(params.id);
        if (res) {
          setTitle(res.roleTitle || '');
          if (res.status) setStatus([res.status === 'OPEN' ? 'Active' : 'Closed']);
          if (res.location) setLocation(res.location);
          if (res.salaryDetails) setPay(res.salaryDetails);
          if (res.roleDetails) setDescription(res.roleDetails);
          if (res.employmentType) {
            setType([
              res.employmentType === 'INTERNSHIP'
                ? 'Internship'
                : res.employmentType === 'PART_TIME'
                  ? 'Part-time'
                  : 'Full-time',
            ]);
          }
          if (res.requiredSkills) {
            setSkills(
              res.requiredSkills.map((s) => ({
                name: s.skillCode,
                level:
                  s.minProficiency === 'ADVANCED'
                    ? 'Advanced'
                    : s.minProficiency === 'PROFESSIONAL'
                      ? 'Professional'
                      : s.minProficiency === 'BEGINNER'
                        ? 'Beginner'
                        : 'Intermediate',
              })),
            );
          }
        }
      } catch {
        // Fallback search in list
        try {
          const listRes = await companyJobsApi.list();
          const found = listRes?.openings?.find((j) => j.openingId === params.id);
          if (found) {
            setTitle(found.roleTitle || '');
            if (found.status) setStatus([found.status === 'OPEN' ? 'Active' : 'Closed']);
            if (found.location) setLocation(found.location);
            if (found.salaryDetails) setPay(found.salaryDetails);
            if (found.roleDetails) setDescription(found.roleDetails);
            if (found.employmentType) {
              setType([
                found.employmentType === 'INTERNSHIP'
                  ? 'Internship'
                  : found.employmentType === 'PART_TIME'
                    ? 'Part-time'
                    : 'Full-time',
              ]);
            }
            if (found.requiredSkills) {
              setSkills(
                found.requiredSkills.map((s) => ({
                  name: s.skillCode,
                  level:
                    s.minProficiency === 'ADVANCED'
                      ? 'Advanced'
                      : s.minProficiency === 'PROFESSIONAL'
                        ? 'Professional'
                        : s.minProficiency === 'BEGINNER'
                          ? 'Beginner'
                          : 'Intermediate',
                })),
              );
            }
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    }
    void loadJob();
  }, [params.id]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const empType =
        type[0] === 'Internship'
          ? 'INTERNSHIP'
          : type[0] === 'Part-time'
            ? 'PART_TIME'
            : 'FULL_TIME';

      await companyJobsApi.update(params.id, {
        roleTitle: title.trim(),
        status: status[0] === 'Active' ? 'OPEN' : 'CLOSED',
        employmentType: empType,
        location: location.trim() || undefined,
        salaryDetails: pay.trim() || undefined,
        roleDetails: description.trim() || undefined,
        requiredSkills: skills.map((s) => ({
          skillCode: s.name.toUpperCase().replace(/\s+/g, '_'),
          minProficiency:
            s.level === 'Advanced'
              ? 'ADVANCED'
              : s.level === 'Professional'
                ? 'PROFESSIONAL'
                : s.level === 'Beginner'
                  ? 'BEGINNER'
                  : 'INTERMEDIATE',
        })),
      });
      setSaved(true);
    } catch (err) {
      setError(formatApiError(err, 'Failed to save changes.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await companyJobsApi.delete(params.id);
    } catch {}
    router.push('/jobs');
  }

  if (loading) {
    return (
      <div className={pageStack}>
        <div className="flex h-64 items-center justify-center rounded-[20px] border border-[var(--ds-border)] bg-white">
          <p className="flex items-center gap-2 text-sm text-[var(--ds-text-muted)]">
            <Loader2 className="size-4 animate-spin" /> Loading job opening...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={pageStack}>
      <PageHeader
        title={title ? `Edit — ${title}` : 'Edit Job Opening'}
        description="Update role details, competency requirements, and hiring status."
      />

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={handleSave}>
        <section className={`${card} space-y-5`}>
          <div>
            <label htmlFor="edit-title" className={label}>
              Job Title
            </label>
            <input
              id="edit-title"
              value={title}
              required
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
              className={input}
            />
          </div>

          <div>
            <span className={label}>Employment Type</span>
            <ChipGroup options={EMPLOYMENT_TYPES} value={type} onChange={setType} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-location" className={label}>
                Location / Work Mode
              </label>
              <input
                id="edit-location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setSaved(false);
                }}
                placeholder="e.g. Bengaluru, Remote, or Hybrid"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="edit-pay" className={label}>
                Salary / Compensation Range
              </label>
              <input
                id="edit-pay"
                value={pay}
                onChange={(e) => {
                  setPay(e.target.value);
                  setSaved(false);
                }}
                placeholder="e.g. ₹40,000 / month or ₹8-12 LPA"
                className={input}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-description" className={label}>
              Role Scope & Responsibilities
            </label>
            <textarea
              id="edit-description"
              rows={5}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSaved(false);
              }}
              placeholder="Outline what projects and technical challenges the candidate will tackle..."
              className={textarea}
            />
          </div>

          <div>
            <span className={label}>Posting Status</span>
            <ChipGroup
              options={STATUSES}
              value={status as (typeof STATUSES)[number][]}
              onChange={(next) => {
                setStatus(next);
                setSaved(false);
              }}
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
              <SkillsEditor
                skills={skills}
                onChange={(next) => {
                  setSkills(next);
                  setSaved(false);
                }}
              />
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

        {saved ? (
          <p
            role="status"
            className="inline-flex items-center gap-2 rounded-xl border border-[#cbede3] bg-[#ecf8f4] px-4 py-2.5 text-sm text-[#258b72]"
          >
            <Check className="size-4" /> Changes saved successfully.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/jobs"
            className="mr-auto text-[13px] font-semibold text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          >
            Back to jobs
          </Link>
          <button
            type="button"
            onClick={() => {
              setStatus(['Closed']);
              setSaved(false);
            }}
            className={secondaryButton}
          >
            Close job
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="text-[13px] font-semibold text-[var(--co-red)] hover:underline"
          >
            Delete job
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      </form>

      <Modal open={deleteOpen} title="Delete this job?" onClose={() => setDeleteOpen(false)}>
        <div className="flex items-start gap-3 rounded-xl border border-[#f4d9a3] bg-[#fff8e8] p-3.5 text-[13px] text-[#b7791f]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Deleting <strong>{title || 'this job'}</strong> permanently removes the listing and any
            candidate applications associated with it. This action cannot be undone.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setDeleteOpen(false)} className={secondaryButton}>
            Cancel
          </button>
          <button type="button" disabled={deleting} onClick={handleDelete} className={dangerButton}>
            {deleting ? 'Deleting...' : 'Delete job'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
