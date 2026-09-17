'use client';

import type { FormEvent, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { AlertCircle, Check, FileText, Loader2, Upload, X } from 'lucide-react';
import {
  SKILL_DEFINITIONS,
  companyRequiresPublicIdentity,
  validateWorkExperienceLetterRules,
  type WorkExperienceDocumentDto,
  type WorkExperienceDto,
} from '@smart/contracts';

import {
  DOCUMENT_TYPE_LABELS,
  EXPERIENCE_BUILDER_STEPS,
  experienceInputClass,
  experienceLabelClass,
  experienceTextareaClass,
} from '@/components/profile/work-experience/work-experience-ui';
import {
  profilePrimaryButtonSmClass,
  profileSecondaryButtonSmClass,
} from '@/lib/profile-ui-classes';
import { nativeOptionClass, nativeSelectClass } from '@/lib/native-select';
import { CATEGORY_OPTIONS, skillsForCategory } from '@/lib/skills-catalog';

export type ModalPendingDocument = {
  localId: string;
  documentType: WorkExperienceDocumentDto['documentType'];
  file: File;
};

const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));

export interface ExperienceBuilderModalProps {
  editingId: string | null;
  modalStep: number;
  setModalStep: (step: number) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  error: string | null;
  experiences: WorkExperienceDto[];
  companyName: string;
  setCompanyName: (value: string) => void;
  role: string;
  setRole: (value: string) => void;
  employmentType: string;
  setEmploymentType: (value: string) => void;
  workLocation: string;
  setWorkLocation: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  isCurrent: boolean;
  setIsCurrent: (value: boolean) => void;
  companyWebsite: string;
  setCompanyWebsite: (value: string) => void;
  companyLinkedinUrl: string;
  setCompanyLinkedinUrl: (value: string) => void;
  domain: string;
  setDomain: (value: string) => void;
  responsibilities: string;
  setResponsibilities: (value: string) => void;
  skillQuery: string;
  setSkillQuery: (value: string) => void;
  selectedSkillCodes: string[];
  setSelectedSkillCodes: (value: string[] | ((current: string[]) => string[])) => void;
  verifierName: string;
  setVerifierName: (value: string) => void;
  verifierEmail: string;
  setVerifierEmail: (value: string) => void;
  verifierDesignation: string;
  setVerifierDesignation: (value: string) => void;
  modalPendingDocs: ModalPendingDocument[];
  setModalPendingDocs: (
    value: ModalPendingDocument[] | ((current: ModalPendingDocument[]) => ModalPendingDocument[]),
  ) => void;
  modalNewDocType: WorkExperienceDocumentDto['documentType'];
  setModalNewDocType: (value: WorkExperienceDocumentDto['documentType']) => void;
  modalNewProofFile: File | null;
  setModalNewProofFile: (file: File | null) => void;
  onAddPendingDocument: () => void;
}

function StepPanel({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return null;
  return <div className="space-y-4">{children}</div>;
}

export function ExperienceBuilderModal(props: ExperienceBuilderModalProps) {
  const {
    editingId,
    modalStep,
    setModalStep,
    onClose,
    onSubmit,
    submitting,
    error,
    experiences,
    companyName,
    setCompanyName,
    role,
    setRole,
    employmentType,
    setEmploymentType,
    workLocation,
    setWorkLocation,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isCurrent,
    setIsCurrent,
    companyWebsite,
    setCompanyWebsite,
    companyLinkedinUrl,
    setCompanyLinkedinUrl,
    domain,
    setDomain,
    responsibilities,
    setResponsibilities,
    skillQuery,
    setSkillQuery,
    selectedSkillCodes,
    setSelectedSkillCodes,
    verifierName,
    setVerifierName,
    verifierEmail,
    setVerifierEmail,
    verifierDesignation,
    setVerifierDesignation,
    modalPendingDocs,
    setModalPendingDocs,
    modalNewDocType,
    setModalNewDocType,
    setModalNewProofFile,
    onAddPendingDocument,
  } = props;

  const editingExp = editingId ? experiences.find((exp) => exp.id === editingId) : undefined;
  const savedModalDocs = editingExp?.documents ?? [];
  const modalLetterCheck = validateWorkExperienceLetterRules({
    isCurrent,
    endDate: !isCurrent && endDate ? new Date(endDate).toISOString() : null,
    documents: [
      ...savedModalDocs.map((doc) => ({ documentType: doc.documentType })),
      ...modalPendingDocs.map((doc) => ({ documentType: doc.documentType })),
    ],
  });

  const requiresPublicIdentity = companyRequiresPublicIdentity({
    companyId: editingExp?.companyId ?? null,
    companyWebsite,
  });

  const isLastStep = modalStep === EXPERIENCE_BUILDER_STEPS.length - 1;
  const scrollPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = scrollPanelRef.current;
    if (!panel) return;
    if (typeof panel.scrollTo === 'function') {
      panel.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      panel.scrollTop = 0;
    }
  }, [modalStep]);

  const goToStep = (index: number) => {
    if (index < 0 || index >= EXPERIENCE_BUILDER_STEPS.length) return;
    setModalStep(index);
  };

  const handleNextStep = () => {
    if (modalStep < EXPERIENCE_BUILDER_STEPS.length - 1) {
      setModalStep(modalStep + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="experience-builder-title"
        className="flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[20px] border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[var(--ds-card-shadow)]"
      >
        <div className="border-b border-[var(--ds-border)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3
                id="experience-builder-title"
                className="text-lg font-semibold text-[var(--ds-text)]"
              >
                {editingId ? 'Edit Work Experience' : 'Add Work Experience'}
              </h3>
              <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
                Tell us about your professional experience
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="Experience builder steps"
            className="hidden border-r border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-4 py-5 md:block"
          >
            <ol className="space-y-1">
              {EXPERIENCE_BUILDER_STEPS.map((step, index) => {
                const active = index === modalStep;
                const complete = index < modalStep;
                return (
                  <li key={step.id} className="relative pb-4 last:pb-0">
                    {index < EXPERIENCE_BUILDER_STEPS.length - 1 ? (
                      <span className="absolute left-[15px] top-8 h-[calc(100%-12px)] w-px bg-[var(--ds-border)]" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => goToStep(index)}
                      className="relative z-[1] flex w-full gap-3 rounded-lg py-0.5 text-left transition-colors hover:bg-[var(--ds-surface-hover)]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-green)]/40"
                      aria-current={active ? 'step' : undefined}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          active
                            ? 'bg-[var(--ds-green)] text-white'
                            : complete
                              ? 'bg-[var(--ds-green-soft)] text-[var(--ds-green)]'
                              : 'border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-muted)]'
                        }`}
                      >
                        {complete ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      <div className={active ? 'pt-0.5' : 'pt-1'}>
                        <p
                          className={`text-sm font-medium ${
                            active ? 'text-[var(--ds-text)]' : 'text-[var(--ds-text-secondary)]'
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-[var(--ds-text-muted)]">{step.subtitle}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="flex min-h-0 flex-col">
            <div className="border-b border-[var(--ds-border)] px-6 py-3 md:hidden">
              <label htmlFor="experience-builder-step-select" className="sr-only">
                Jump to step
              </label>
              <select
                id="experience-builder-step-select"
                value={modalStep}
                onChange={(event) => goToStep(Number.parseInt(event.target.value, 10))}
                className={`${nativeSelectClass} ${experienceInputClass} py-2 text-sm`}
              >
                {EXPERIENCE_BUILDER_STEPS.map((step, index) => (
                  <option key={step.id} value={index} className={nativeOptionClass}>
                    Step {index + 1}: {step.title}
                  </option>
                ))}
              </select>
            </div>
            <div ref={scrollPanelRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ds-text-subtle)]">
                {EXPERIENCE_BUILDER_STEPS[modalStep]?.title}
              </p>
              <p className="mb-4 text-sm text-[var(--ds-text-muted)]">
                {modalStep === 0
                  ? "Let's start with the basic details about your role."
                  : modalStep === 1
                    ? 'Add company links when you have them.'
                    : modalStep === 2
                      ? 'Describe your domain, responsibilities, and catalog skills.'
                      : modalStep === 3
                        ? 'Upload supporting documents for verification.'
                        : 'Optional employer contact for verification dispatch.'}
              </p>

              {error ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <form id="experience-builder-form" onSubmit={onSubmit} className="space-y-4">
                <StepPanel active={modalStep === 0}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={experienceLabelClass}>Company Name *</label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        placeholder="e.g. Acme Corporation"
                        className={experienceInputClass}
                      />
                    </div>
                    <div>
                      <label className={experienceLabelClass}>Role / Designation *</label>
                      <input
                        type="text"
                        required
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        placeholder="e.g. Software Engineer Intern"
                        className={experienceInputClass}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={experienceLabelClass}>Employment Type *</label>
                      <select
                        value={employmentType}
                        onChange={(event) => setEmploymentType(event.target.value)}
                        className={`${nativeSelectClass} ${experienceInputClass} py-2`}
                      >
                        <option value="FULL_TIME" className={nativeOptionClass}>
                          Full-time
                        </option>
                        <option value="PART_TIME" className={nativeOptionClass}>
                          Part-time
                        </option>
                        <option value="CONTRACT" className={nativeOptionClass}>
                          Contract
                        </option>
                        <option value="INTERNSHIP" className={nativeOptionClass}>
                          Internship
                        </option>
                        <option value="FREELANCE" className={nativeOptionClass}>
                          Freelance
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className={experienceLabelClass}>Work Location</label>
                      <input
                        type="text"
                        value={workLocation}
                        onChange={(event) => setWorkLocation(event.target.value)}
                        placeholder="e.g. Bengaluru, India (or Remote)"
                        className={experienceInputClass}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={experienceLabelClass}>Start Date *</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className={experienceInputClass}
                      />
                    </div>
                    <div>
                      <label className={experienceLabelClass}>
                        End Date{!isCurrent ? ' *' : ''}
                      </label>
                      <input
                        type="date"
                        disabled={isCurrent}
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className={`${experienceInputClass} disabled:opacity-50`}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--ds-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={isCurrent}
                      onChange={(event) => setIsCurrent(event.target.checked)}
                      className="h-4 w-4 rounded border-[var(--ds-border)]"
                    />
                    I currently work in this role
                  </label>
                </StepPanel>

                <StepPanel active={modalStep === 1}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={experienceLabelClass}>
                        Company Website{requiresPublicIdentity ? ' *' : ''}
                      </label>
                      <input
                        type="url"
                        value={companyWebsite}
                        onChange={(event) => setCompanyWebsite(event.target.value)}
                        placeholder="https://company.com"
                        className={experienceInputClass}
                      />
                    </div>
                    <div>
                      <label className={experienceLabelClass}>
                        Company LinkedIn URL{requiresPublicIdentity ? ' *' : ''}
                      </label>
                      <input
                        type="url"
                        value={companyLinkedinUrl}
                        onChange={(event) => setCompanyLinkedinUrl(event.target.value)}
                        placeholder="https://linkedin.com/company/acme"
                        className={experienceInputClass}
                      />
                    </div>
                  </div>
                </StepPanel>

                <StepPanel active={modalStep === 2}>
                  <div>
                    <label className={experienceLabelClass}>Professional Domain *</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(event) => setDomain(event.target.value)}
                      placeholder="e.g. Software Engineering, Business Analytics"
                      className={experienceInputClass}
                    />
                  </div>
                  <div>
                    <label className={experienceLabelClass}>
                      Responsibilities & Accomplishments *
                    </label>
                    <textarea
                      rows={4}
                      value={responsibilities}
                      onChange={(event) => setResponsibilities(event.target.value)}
                      placeholder="Key responsibilities, projects, and technologies used..."
                      className={experienceTextareaClass}
                    />
                  </div>
                  <div>
                    <label className={experienceLabelClass}>Skills used (from catalog) *</label>
                    <p className="mt-0.5 text-xs text-[var(--ds-text-muted)]">
                      Pick skills from the SMART catalog — free-text tags are not accepted.
                    </p>
                    <div className="mt-2">
                      <label htmlFor="experience-skill-picker" className="sr-only">
                        Select skill from catalog
                      </label>
                      <select
                        id="experience-skill-picker"
                        value=""
                        onChange={(event) => {
                          const code = event.target.value;
                          if (!code) return;
                          setSelectedSkillCodes((current) =>
                            current.includes(code) ? current : [...current, code],
                          );
                        }}
                        className={`${nativeSelectClass} ${experienceInputClass} py-2`}
                      >
                        <option value="">Browse skills — choose from list…</option>
                        {CATEGORY_OPTIONS.map((category) => (
                          <optgroup key={category.id} label={category.name}>
                            {skillsForCategory(category.id).map((skill) => (
                              <option
                                key={skill.code}
                                value={skill.code}
                                disabled={selectedSkillCodes.includes(skill.code)}
                                className={nativeOptionClass}
                              >
                                {skill.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    {selectedSkillCodes.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedSkillCodes.map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() =>
                              setSelectedSkillCodes((current) =>
                                current.filter((item) => item !== code),
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-2.5 py-1 text-xs text-[var(--ds-text-secondary)]"
                          >
                            {SKILL_NAME_BY_CODE.get(code) ?? code}
                            <X className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={skillQuery}
                      onChange={(event) => setSkillQuery(event.target.value)}
                      placeholder="Search skills…"
                      className={experienceInputClass}
                    />
                    {skillQuery.trim().length >= 2 ? (
                      <ul className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)]">
                        {SKILL_DEFINITIONS.filter((skill) => {
                          const q = skillQuery.trim().toLowerCase();
                          return (
                            (skill.name.toLowerCase().includes(q) ||
                              skill.code.toLowerCase().includes(q)) &&
                            !selectedSkillCodes.includes(skill.code)
                          );
                        })
                          .slice(0, 6)
                          .map((skill) => (
                            <li key={skill.code}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSkillCodes((current) => [...current, skill.code]);
                                  setSkillQuery('');
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)]"
                              >
                                {skill.name}
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : null}
                  </div>
                </StepPanel>

                <StepPanel active={modalStep === 3}>
                  <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ds-text)]">
                      <FileText className="h-4 w-4 text-[var(--ds-green)]" />
                      Document Requirement Rules
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--ds-text-muted)]">
                      {isCurrent ? (
                        <>
                          <strong className="text-[var(--ds-text)]">
                            Ongoing Role: Offer letter required.
                          </strong>{' '}
                          Status will display as Active — pending final documentation.
                        </>
                      ) : (
                        <>
                          <strong className="text-[var(--ds-text)]">
                            Ended Role: Offer Letter + Completion/Relieving Letter required.
                          </strong>{' '}
                          Both an Offer Letter and a Completion/Relieving Letter are required before
                          submission.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--ds-border)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--ds-text)]">
                          Proof Documents *
                        </h4>
                        <p className="mt-0.5 text-xs text-[var(--ds-text-muted)]">
                          PDF, JPG, or PNG up to 5MB each.
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          modalLetterCheck.valid
                            ? 'bg-[var(--ds-green-soft)] text-[var(--ds-green)]'
                            : 'bg-amber-50 text-amber-900'
                        }`}
                      >
                        {modalLetterCheck.valid ? 'Requirements met' : 'Upload required'}
                      </span>
                    </div>

                    {(savedModalDocs.length > 0 || modalPendingDocs.length > 0) && (
                      <div className="mt-3 space-y-2">
                        {savedModalDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--ds-border)] px-3 py-2 text-xs"
                          >
                            <span className="truncate font-medium text-[var(--ds-text)]">
                              {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}:{' '}
                              {doc.fileName}
                            </span>
                            <span className="text-[var(--ds-text-muted)]">Saved</span>
                          </div>
                        ))}
                        {modalPendingDocs.map((doc) => (
                          <div
                            key={doc.localId}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--ds-green)]/30 bg-[var(--ds-green-soft)]/40 px-3 py-2 text-xs"
                          >
                            <span className="truncate font-medium text-[var(--ds-text)]">
                              {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}:{' '}
                              {doc.file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setModalPendingDocs((current) =>
                                  current.filter((item) => item.localId !== doc.localId),
                                )
                              }
                              className="text-[var(--ds-text-muted)] hover:text-red-600"
                              aria-label={`Remove ${doc.file.name}`}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!modalLetterCheck.valid ? (
                      <p className="mt-3 text-xs text-amber-900">{modalLetterCheck.message}</p>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end">
                      <div>
                        <label htmlFor="modal-proof-document-type" className={experienceLabelClass}>
                          Document type
                        </label>
                        <select
                          id="modal-proof-document-type"
                          value={modalNewDocType}
                          onChange={(event) =>
                            setModalNewDocType(
                              event.target.value as WorkExperienceDocumentDto['documentType'],
                            )
                          }
                          className={`${nativeSelectClass} ${experienceInputClass} py-2`}
                        >
                          <option value="OFFER_LETTER">Offer Letter</option>
                          <option value="RELIEVING_LETTER">Relieving Letter</option>
                          <option value="EXPERIENCE_LETTER">Experience Letter</option>
                          <option value="PAYSLIP">Payslip</option>
                          <option value="FORM_16">Form 16</option>
                          <option value="OTHER">Other Proof Document</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="modal-proof-document-file" className={experienceLabelClass}>
                          Proof document
                        </label>
                        <input
                          id="modal-proof-document-file"
                          type="file"
                          accept="application/pdf,image/jpeg,image/jpg,image/png"
                          onChange={(event) =>
                            setModalNewProofFile(event.target.files?.[0] ?? null)
                          }
                          className="mt-1.5 block w-full text-xs text-[var(--ds-text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--ds-green-soft)] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[var(--ds-green)]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={onAddPendingDocument}
                        className={`${profileSecondaryButtonSmClass} h-11`}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Add file
                      </button>
                    </div>
                  </div>
                </StepPanel>

                <StepPanel active={modalStep === 4}>
                  <div
                    className={`rounded-xl border p-4 text-sm ${
                      modalLetterCheck.valid
                        ? 'border-[var(--ds-green)]/30 bg-[var(--ds-green-soft)]/40 text-[var(--ds-text-secondary)]'
                        : 'border-amber-200 bg-amber-50 text-amber-950'
                    }`}
                  >
                    <p className="font-medium text-[var(--ds-text)]">Proof documents</p>
                    {modalLetterCheck.valid ? (
                      <p className="mt-1 text-xs">
                        Required letters are attached
                        {(savedModalDocs.length > 0 || modalPendingDocs.length > 0) &&
                          ` (${savedModalDocs.length + modalPendingDocs.length} on this experience)`}
                        . You can save and continue to employer verification.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs">
                        {modalLetterCheck.message}{' '}
                        <button
                          type="button"
                          onClick={() => setModalStep(3)}
                          className="font-semibold underline underline-offset-2"
                        >
                          Go back to Evidence
                        </button>
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-green-muted)]/40 p-4 text-sm text-[var(--ds-text-secondary)]">
                    <p className="font-medium text-[var(--ds-text)]">Employer Verification</p>
                    <p className="mt-1 text-xs">
                      Provide an employer contact when you&apos;re ready to send this experience for
                      verification. The verifier will receive a secure verification link.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={experienceLabelClass}>Verifier Name</label>
                      <input
                        type="text"
                        value={verifierName}
                        onChange={(event) => setVerifierName(event.target.value)}
                        placeholder="Jane Manager"
                        className={experienceInputClass}
                      />
                    </div>
                    <div>
                      <label className={experienceLabelClass}>Designation</label>
                      <input
                        type="text"
                        value={verifierDesignation}
                        onChange={(event) => setVerifierDesignation(event.target.value)}
                        placeholder="Engineering Lead"
                        className={experienceInputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="verifier-official-email" className={experienceLabelClass}>
                        Official Work Email
                      </label>
                      <input
                        id="verifier-official-email"
                        type="email"
                        value={verifierEmail}
                        onChange={(event) => setVerifierEmail(event.target.value)}
                        placeholder="jane.manager@yourcompany.com"
                        autoComplete="email"
                        className={`${experienceInputClass} min-w-0 text-base sm:text-sm`}
                      />
                      <p className="mt-1.5 text-xs text-[var(--ds-text-muted)]">
                        Use your manager or HR&apos;s corporate email (must match your company
                        domain). Personal addresses like Gmail cannot receive verification links.
                      </p>
                    </div>
                  </div>
                </StepPanel>
              </form>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--ds-border)] px-6 py-4">
              <button type="button" onClick={onClose} className={profileSecondaryButtonSmClass}>
                Cancel
              </button>
              <div className="flex items-center gap-2">
                {modalStep > 0 ? (
                  <button
                    type="button"
                    onClick={() => setModalStep(modalStep - 1)}
                    className={profileSecondaryButtonSmClass}
                  >
                    Back
                  </button>
                ) : null}
                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className={profilePrimaryButtonSmClass}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="experience-builder-form"
                    disabled={submitting}
                    className={`${profilePrimaryButtonSmClass} disabled:opacity-50`}
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {editingId
                      ? verifierEmail.trim()
                        ? 'Save & Send Verification'
                        : 'Save Changes'
                      : verifierEmail.trim()
                        ? 'Submit & Send Verification'
                        : 'Submit Experience'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
