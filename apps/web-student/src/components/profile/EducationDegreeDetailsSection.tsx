'use client';

import { useMemo, useRef } from 'react';
import { FileText, Upload } from 'lucide-react';
import type { EducationFormValues } from '@/lib/education-form';
import {
  computeTotalSemesters,
  syncSemesterRows,
  type DegreeDetailsFormSlice,
} from '@/lib/education-degree-details';
import { EDUCATION_MODAL_FIELD } from '@/components/profile/education-details-modal-ui';

interface EducationDegreeDetailsSectionProps {
  program: string;
  values: EducationFormValues;
  onPatchDegreeDetails: (patch: Partial<DegreeDetailsFormSlice>) => void;
  onProofFile: (file: File | null) => void;
}

const fieldLabelClass =
  'mb-1 block text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text)]';

export function EducationDegreeDetailsSection({
  program,
  values,
  onPatchDegreeDetails,
  onProofFile,
}: EducationDegreeDetailsSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const semestersPerYear = Number.parseInt(values.degreeDetails.semestersPerYear, 10) || 2;

  const totalSemesters = useMemo(
    () =>
      computeTotalSemesters({
        program,
        startYear: values.startYear,
        endYear: values.endYear,
        currentlyStudying: values.currentlyStudying,
        semestersPerYear,
        lateralEntry: values.degreeDetails.lateralEntry,
      }),
    [
      program,
      values.startYear,
      values.endYear,
      values.currentlyStudying,
      semestersPerYear,
      values.degreeDetails.lateralEntry,
    ],
  );

  const rows = useMemo(
    () => syncSemesterRows(totalSemesters, values.degreeDetails.semesterRows),
    [totalSemesters, values.degreeDetails.semesterRows],
  );

  const semesterOptions = useMemo(
    () => Array.from({ length: totalSemesters }, (_, i) => i + 1),
    [totalSemesters],
  );

  function ensureRows(next: DegreeDetailsFormSlice) {
    onPatchDegreeDetails({
      ...next,
      semesterRows: syncSemesterRows(totalSemesters, next.semesterRows),
    });
  }

  function updateRow(index: number, patch: Partial<(typeof rows)[number]>) {
    const nextRows = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onPatchDegreeDetails({ semesterRows: nextRows });
  }

  return (
    <div className="space-y-4 rounded-[16px] bg-[var(--ds-surface-muted)]/50 p-4 ring-1 ring-[#101828]/[0.06]">
      <div>
        <h4 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ds-text)]">
          Course details
        </h4>
        <p className="mt-0.5 text-[12px] leading-snug tracking-[-0.01em] text-[var(--ds-text-muted)]">
          Semester rows match your course length ({totalSemesters} semesters · {semestersPerYear}
          /yr).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="edu-roll" className={fieldLabelClass}>
            Institute roll no. <span className="text-[var(--ds-text-muted)]">*</span>
          </label>
          <input
            id="edu-roll"
            type="text"
            value={values.degreeDetails.rollNumber}
            onChange={(e) => onPatchDegreeDetails({ rollNumber: e.target.value })}
            placeholder="e.g. 22ALR110"
            className={EDUCATION_MODAL_FIELD}
          />
        </div>
        <div>
          <label htmlFor="edu-current-sem" className={fieldLabelClass}>
            Current semester <span className="text-[var(--ds-text-muted)]">*</span>
          </label>
          <select
            id="edu-current-sem"
            value={values.degreeDetails.currentSemester}
            onChange={(e) => onPatchDegreeDetails({ currentSemester: e.target.value })}
            className={EDUCATION_MODAL_FIELD}
          >
            <option value="">Select semester</option>
            {semesterOptions.map((n) => (
              <option key={n} value={String(n)}>
                Semester {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edu-sem-per-year" className={fieldLabelClass}>
            Semesters per year
          </label>
          <select
            id="edu-sem-per-year"
            value={values.degreeDetails.semestersPerYear}
            onChange={(e) =>
              ensureRows({
                ...values.degreeDetails,
                semestersPerYear: e.target.value,
              })
            }
            className={EDUCATION_MODAL_FIELD}
          >
            <option value="2">2 (typical)</option>
            <option value="1">1</option>
            <option value="3">3</option>
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text-secondary)]">
        <input
          type="checkbox"
          checked={values.degreeDetails.lateralEntry}
          onChange={(e) =>
            ensureRows({
              ...values.degreeDetails,
              lateralEntry: e.target.checked,
            })
          }
          className="mt-0.5 size-4 rounded border-[var(--ds-border)]"
        />
        I am a lateral entry student in this course
      </label>

      <div className="overflow-hidden rounded-[14px] ring-1 ring-[#101828]/[0.06]">
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] gap-2 bg-[var(--ds-surface)] px-3 py-2 text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
          <span>Performance</span>
          <span className="text-center">Total</span>
          <span className="text-center">Ongoing</span>
        </div>
        <div className="max-h-[220px] divide-y divide-[var(--ds-border-subtle)] overflow-y-auto bg-[var(--ds-surface)]">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-2 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-16 shrink-0 text-[12px] font-medium text-[var(--ds-text-muted)]">
                  Sem {index + 1}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.performance}
                  onChange={(e) => updateRow(index, { performance: e.target.value })}
                  placeholder="—"
                  aria-label={`Semester ${index + 1} performance percent`}
                  className="h-9 min-w-0 flex-1 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-2.5 text-[13px] tabular-nums text-[var(--ds-text)] focus:border-[var(--ds-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-green-soft)]"
                />
                <span className="text-[12px] text-[var(--ds-text-subtle)]">%</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={row.backlogsTotal}
                onChange={(e) => updateRow(index, { backlogsTotal: e.target.value })}
                aria-label={`Semester ${index + 1} total backlogs`}
                className="h-9 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-2 text-center text-[13px] tabular-nums text-[var(--ds-text)] focus:border-[var(--ds-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-green-soft)]"
              />
              <input
                type="text"
                inputMode="numeric"
                value={row.backlogsOngoing}
                onChange={(e) => updateRow(index, { backlogsOngoing: e.target.value })}
                aria-label={`Semester ${index + 1} ongoing backlogs`}
                className="h-9 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-2 text-center text-[13px] tabular-nums text-[var(--ds-text)] focus:border-[var(--ds-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-green-soft)]"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="edu-course-notes" className={fieldLabelClass}>
          Notes / highlights{' '}
          <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
        </label>
        <textarea
          id="edu-course-notes"
          rows={3}
          value={values.degreeDetails.courseNotes}
          onChange={(e) => onPatchDegreeDetails({ courseNotes: e.target.value })}
          placeholder="Class rank, awards, or other academic highlights"
          className={`${EDUCATION_MODAL_FIELD} min-h-[72px] resize-y py-2.5`}
        />
      </div>

      <label className="flex items-start gap-2.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text-secondary)]">
        <input
          type="checkbox"
          checked={values.degreeDetails.hasCourseBacklog || values.hasActiveBacklog}
          onChange={(e) => onPatchDegreeDetails({ hasCourseBacklog: e.target.checked })}
          className="mt-0.5 size-4 rounded border-[var(--ds-border)]"
        />
        I have backlog(s) — past or ongoing standing arrears
      </label>

      <div>
        <span className={fieldLabelClass}>Course proof</span>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          className="sr-only"
          onChange={(e) => onProofFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-between gap-3 rounded-[14px] bg-[var(--ds-surface)] px-3.5 py-3 text-left ring-1 ring-[#101828]/[0.06] transition hover:bg-[var(--ds-surface-hover)]"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]">
              {values.courseProofFile ? (
                <FileText className="size-4" strokeWidth={1.5} aria-hidden />
              ) : (
                <Upload className="size-4" strokeWidth={1.5} aria-hidden />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-[var(--ds-text)]">
                {values.courseProofFile?.name ?? 'Attach marksheet or consolidated transcript'}
              </span>
              <span className="block text-[11px] text-[var(--ds-text-muted)]">
                PDF or image · saved with this entry
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
