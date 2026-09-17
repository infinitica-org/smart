'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import {
  BOARD_UNIVERSITY_OPTIONS,
  BRANCH_SPECIALIZATION_OPTIONS,
  CUSTOM_OPTION,
  EDUCATION_TYPE_OPTIONS,
  PROGRAM_DEGREE_OPTIONS,
  type EducationFormValues,
  emptyEducationFormValues,
} from '@/lib/education-form';
import {
  programLevelForDegree,
  programScoreUiConfig,
  resolveProgramDegree,
} from '@/lib/education-form-program';
import { computeTotalSemesters, syncSemesterRows } from '@/lib/education-degree-details';
import { EducationDegreeDetailsSection } from '@/components/profile/EducationDegreeDetailsSection';
import {
  EDUCATION_MODAL_FIELD,
  EDUCATION_MODAL_SCORE_INPUT,
  EducationFormField,
} from '@/components/profile/education-details-modal-ui';

interface EducationDetailsModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: EducationFormValues;
  submitting: boolean;
  formError: string | null;
  onClose: () => void;
  onSubmit: (values: EducationFormValues) => void;
}

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= current - 40; y -= 1) years.push(y);
  return years;
}

const YEARS = yearOptions();

export function EducationDetailsModal({
  open,
  mode,
  initialValues,
  submitting,
  formError,
  onClose,
  onSubmit,
}: EducationDetailsModalProps) {
  const [values, setValues] = useState<EducationFormValues>(
    initialValues ?? emptyEducationFormValues(),
  );
  const [showCustomProgram, setShowCustomProgram] = useState(
    initialValues?.programDegree === CUSTOM_OPTION,
  );
  const [showCustomBoard, setShowCustomBoard] = useState(
    initialValues?.boardUniversity === CUSTOM_OPTION,
  );
  const [showCustomBranch, setShowCustomBranch] = useState(
    initialValues?.branchSpecialization === CUSTOM_OPTION,
  );

  const resolvedProgram = useMemo(
    () => resolveProgramDegree(values.programDegree, values.customProgramDegree),
    [values.programDegree, values.customProgramDegree],
  );

  const scoreConfig = useMemo(
    () => (resolvedProgram ? programScoreUiConfig(resolvedProgram) : null),
    [resolvedProgram],
  );

  useEffect(() => {
    if (!open) return;
    const base = initialValues ?? emptyEducationFormValues();
    setValues(base);
    setShowCustomProgram(base.programDegree === CUSTOM_OPTION);
    setShowCustomBoard(base.boardUniversity === CUSTOM_OPTION);
    setShowCustomBranch(base.branchSpecialization === CUSTOM_OPTION);
  }, [open, initialValues, mode]);

  useEffect(() => {
    if (!scoreConfig || scoreConfig.allowUnitChoice) return;
    setValues((prev) =>
      prev.scoreUnit === scoreConfig.defaultUnit
        ? prev
        : { ...prev, scoreUnit: scoreConfig.defaultUnit },
    );
  }, [scoreConfig?.defaultUnit, scoreConfig?.allowUnitChoice]);

  useEffect(() => {
    if (!resolvedProgram || programLevelForDegree(resolvedProgram) !== 'degree') return;
    const perYear = Number.parseInt(values.degreeDetails.semestersPerYear, 10) || 2;
    const total = computeTotalSemesters({
      program: resolvedProgram,
      startYear: values.startYear,
      endYear: values.endYear,
      currentlyStudying: values.currentlyStudying,
      semestersPerYear: perYear,
      lateralEntry: values.degreeDetails.lateralEntry,
    });
    setValues((prev) => {
      const nextRows = syncSemesterRows(total, prev.degreeDetails.semesterRows);
      if (nextRows.length === prev.degreeDetails.semesterRows.length) return prev;
      return {
        ...prev,
        degreeDetails: { ...prev.degreeDetails, semesterRows: nextRows },
      };
    });
  }, [
    resolvedProgram,
    values.startYear,
    values.endYear,
    values.currentlyStudying,
    values.degreeDetails.semestersPerYear,
    values.degreeDetails.lateralEntry,
  ]);

  if (!open) return null;

  const title = mode === 'edit' ? 'Edit Education Details' : 'Add Education Details';

  function patch(partial: Partial<EducationFormValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="education-details-title"
        className="font-[family-name:var(--tpo-font-sans)] flex max-h-[min(92vh,880px)] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
      >
        <div className="relative shrink-0 border-b border-[var(--ds-border)] px-6 py-4">
          <h3
            id="education-details-title"
            className="text-center text-[17px] font-semibold tracking-[-0.02em] text-[var(--ds-text)]"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--ds-text-muted)] transition hover:bg-[var(--ds-surface-hover)]"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(values);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-5">
            {formError ? (
              <p className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {formError}
              </p>
            ) : null}

            <div className="space-y-4">
              <EducationFormField id="edu-school" label="School / Institution name" required>
                <input
                  id="edu-school"
                  type="text"
                  required
                  value={values.schoolInstitutionName}
                  onChange={(e) => patch({ schoolInstitutionName: e.target.value })}
                  placeholder="e.g. RV College of Engineering"
                  className={EDUCATION_MODAL_FIELD}
                />
              </EducationFormField>

              <div className="grid gap-4 md:grid-cols-2">
                <EducationFormField id="edu-program" label="Program / Degree" required>
                  <select
                    id="edu-program"
                    required
                    value={values.programDegree}
                    onChange={(e) => {
                      const next = e.target.value;
                      patch({ programDegree: next });
                      setShowCustomProgram(next === CUSTOM_OPTION);
                    }}
                    className={EDUCATION_MODAL_FIELD}
                  >
                    <option value="">Select program</option>
                    {PROGRAM_DEGREE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value={CUSTOM_OPTION}>Other</option>
                  </select>
                </EducationFormField>

                <EducationFormField id="edu-branch" label="Branch / Specialization" optional>
                  <select
                    id="edu-branch"
                    value={values.branchSpecialization}
                    onChange={(e) => {
                      const next = e.target.value;
                      patch({ branchSpecialization: next });
                      setShowCustomBranch(next === CUSTOM_OPTION);
                    }}
                    className={EDUCATION_MODAL_FIELD}
                  >
                    <option value="">Select branch</option>
                    {BRANCH_SPECIALIZATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value={CUSTOM_OPTION}>Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      patch({ branchSpecialization: CUSTOM_OPTION });
                      setShowCustomBranch(true);
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--ds-link)] hover:underline"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add branch / specialization
                  </button>
                </EducationFormField>
              </div>

              {showCustomProgram ? (
                <EducationFormField label="Program / Degree (other)" required>
                  <input
                    type="text"
                    value={values.customProgramDegree}
                    onChange={(e) => patch({ customProgramDegree: e.target.value })}
                    placeholder="Enter program or degree"
                    className={EDUCATION_MODAL_FIELD}
                  />
                </EducationFormField>
              ) : null}

              {showCustomBranch ? (
                <EducationFormField label="Branch / Specialization (other)" optional>
                  <input
                    type="text"
                    value={values.customBranchSpecialization}
                    onChange={(e) => patch({ customBranchSpecialization: e.target.value })}
                    placeholder="Enter branch or specialization"
                    className={EDUCATION_MODAL_FIELD}
                  />
                </EducationFormField>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <EducationFormField id="edu-board" label="Board / University" required>
                  <select
                    id="edu-board"
                    required
                    value={values.boardUniversity}
                    onChange={(e) => {
                      const next = e.target.value;
                      patch({ boardUniversity: next });
                      setShowCustomBoard(next === CUSTOM_OPTION);
                    }}
                    className={EDUCATION_MODAL_FIELD}
                  >
                    <option value="">Select board or university</option>
                    {BOARD_UNIVERSITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value={CUSTOM_OPTION}>Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      patch({ boardUniversity: CUSTOM_OPTION });
                      setShowCustomBoard(true);
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--ds-link)] hover:underline"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add board / university
                  </button>
                </EducationFormField>

                <EducationFormField
                  id="edu-study-mode"
                  label="Study mode"
                  required
                  helper="How you attended this program (stored with your degree record)."
                >
                  <select
                    id="edu-study-mode"
                    required
                    value={values.educationType}
                    onChange={(e) => patch({ educationType: e.target.value })}
                    className={EDUCATION_MODAL_FIELD}
                  >
                    <option value="">Select study mode</option>
                    {EDUCATION_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </EducationFormField>
              </div>

              {showCustomBoard ? (
                <EducationFormField label="Board / University (other)" required>
                  <input
                    type="text"
                    value={values.customBoardUniversity}
                    onChange={(e) => patch({ customBoardUniversity: e.target.value })}
                    placeholder="Enter board or university"
                    className={EDUCATION_MODAL_FIELD}
                  />
                </EducationFormField>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <EducationFormField id="edu-start-year" label="Start year" required>
                  <div className="relative">
                    <select
                      id="edu-start-year"
                      required
                      value={values.startYear}
                      onChange={(e) => patch({ startYear: e.target.value })}
                      className={`${EDUCATION_MODAL_FIELD} appearance-none pr-10`}
                    >
                      <option value="">Select year</option>
                      {YEARS.map((year) => (
                        <option key={year} value={String(year)}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <Calendar
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ds-text-subtle)]"
                      aria-hidden="true"
                    />
                  </div>
                </EducationFormField>

                <EducationFormField
                  id="edu-end-year"
                  label="End year"
                  required={!values.currentlyStudying}
                  optional={values.currentlyStudying}
                >
                  <div className="relative">
                    <select
                      id="edu-end-year"
                      required={!values.currentlyStudying}
                      disabled={values.currentlyStudying}
                      value={values.endYear}
                      onChange={(e) => patch({ endYear: e.target.value })}
                      className={`${EDUCATION_MODAL_FIELD} appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <option value="">Select year</option>
                      {YEARS.map((year) => (
                        <option key={year} value={String(year)}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <Calendar
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ds-text-subtle)]"
                      aria-hidden="true"
                    />
                  </div>
                </EducationFormField>
              </div>

              <label className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--ds-text-secondary)]">
                <input
                  type="checkbox"
                  checked={values.currentlyStudying}
                  onChange={(e) =>
                    patch({
                      currentlyStudying: e.target.checked,
                      endYear: e.target.checked ? '' : values.endYear,
                    })
                  }
                  className="size-4 rounded border-[var(--ds-border)]"
                />
                I am currently studying here
              </label>

              {scoreConfig ? (
                <div className="space-y-4 rounded-[14px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]/60 p-4">
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--ds-text)]">
                      Academic scores
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--ds-text-muted)]">
                      Add the academic result relevant to this education entry.
                    </p>
                  </div>

                  <EducationFormField
                    id="edu-score"
                    label={scoreConfig.scoreLabel}
                    required
                    helper={scoreConfig.scoreHelper}
                  >
                    <div
                      className={
                        scoreConfig.allowUnitChoice
                          ? 'grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_9.5rem]'
                          : 'grid grid-cols-1'
                      }
                    >
                      <input
                        id="edu-score"
                        type="text"
                        inputMode="decimal"
                        required
                        value={values.score}
                        onChange={(e) => patch({ score: e.target.value })}
                        placeholder={
                          scoreConfig.level === 'degree' ? 'e.g. 8.5 or 92.4' : 'e.g. 92.4'
                        }
                        className={`${EDUCATION_MODAL_SCORE_INPUT} min-w-0 flex-1`}
                        data-testid="education-score-input"
                      />
                      {scoreConfig.allowUnitChoice ? (
                        <div
                          className="flex h-12 items-stretch overflow-hidden rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1 shadow-sm"
                          role="group"
                          aria-label="Score unit"
                        >
                          {(
                            [
                              { value: 'percentage', label: '%' },
                              { value: 'cgpa', label: 'CGPA' },
                            ] as const
                          ).map((option) => {
                            const active = values.scoreUnit === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={active}
                                onClick={() =>
                                  patch({
                                    scoreUnit: option.value,
                                  })
                                }
                                className={`flex-1 rounded-[10px] text-sm font-semibold transition ${
                                  active
                                    ? 'bg-[var(--ds-green-soft)] text-[var(--ds-text)] shadow-sm'
                                    : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="flex h-12 items-center justify-center rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface)] text-sm font-semibold text-[var(--ds-text-muted)] sm:hidden">
                          %
                        </span>
                      )}
                    </div>
                    {!scoreConfig.allowUnitChoice ? (
                      <p className="mt-1.5 text-[11px] font-medium text-[var(--ds-text-muted)]">
                        Enter percentage as shown on your marksheet (0–100).
                      </p>
                    ) : null}
                  </EducationFormField>

                  {scoreConfig.showBacklogCheckbox &&
                  (!resolvedProgram || programLevelForDegree(resolvedProgram) !== 'degree') ? (
                    <label className="flex items-start gap-2.5 text-[13px] font-medium text-[var(--ds-text-secondary)]">
                      <input
                        type="checkbox"
                        checked={values.hasActiveBacklog}
                        onChange={(e) => patch({ hasActiveBacklog: e.target.checked })}
                        className="mt-0.5 size-4 rounded border-[var(--ds-border)]"
                      />
                      I currently have active academic backlogs (standing arrears).
                    </label>
                  ) : null}
                </div>
              ) : (
                <p className="text-[12px] text-[var(--ds-text-muted)]">
                  Select a program to enter the academic score for this entry.
                </p>
              )}

              {resolvedProgram && programLevelForDegree(resolvedProgram) === 'degree' ? (
                <EducationDegreeDetailsSection
                  program={resolvedProgram}
                  values={values}
                  onPatchDegreeDetails={(partial) =>
                    patch({
                      degreeDetails: { ...values.degreeDetails, ...partial },
                    })
                  }
                  onProofFile={(file) => patch({ courseProofFile: file })}
                />
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--ds-border)] bg-[var(--ds-surface)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--ds-border)] px-5 py-2 text-sm font-medium text-[var(--ds-text-secondary)] transition hover:bg-[var(--ds-surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-w-[120px] rounded-full bg-[var(--ds-green)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ds-green-hover)] disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
