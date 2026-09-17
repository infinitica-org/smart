'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  MoreVertical,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  SKILL_DEFINITIONS,
  type WorkExperienceDocumentDto,
  type WorkExperienceDto,
} from '@smart/contracts';

import { profilePrimaryButtonSmClass } from '@/lib/profile-ui-classes';
import {
  DOCUMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from '@/components/profile/work-experience/work-experience-ui';
import {
  companyInitials,
  formatExperienceMonthYear,
  formatProofFileSize,
  getExperienceProjectLabels,
  getManagerEndorsementStatus,
  getNextActionGuidance,
  VERIFICATION_STATUS_LABELS,
  verificationStatusTone,
  workExperienceRuleCheck,
} from '@/components/profile/work-experience/work-experience-presenters';
import { WorkExperienceVerificationProgress } from '@/components/profile/work-experience/WorkExperienceVerificationProgress';
import { formatCooldownLabel } from '@/lib/use-per-action-cooldown';

const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));

function StatusBadge({ status }: { status: WorkExperienceDto['status'] }) {
  const tone = verificationStatusTone(status);
  const className =
    tone === 'verified'
      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'pending'
        ? 'border border-sky-200 bg-sky-50 text-sky-800'
        : tone === 'warning'
          ? 'border border-amber-200 bg-amber-50 text-amber-900'
          : tone === 'danger'
            ? 'border border-red-200 bg-red-50 text-red-800'
            : 'border border-[var(--ds-border)] bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}
    >
      {tone === 'verified' ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : tone === 'pending' || tone === 'warning' ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80"
          aria-hidden="true"
        />
      ) : null}
      {VERIFICATION_STATUS_LABELS[status] || status}
    </span>
  );
}

export type WorkExperienceExperienceCardProps = {
  exp: WorkExperienceDto;
  validationResults: Record<
    string,
    { validationStatus: string; rejectionReason?: string | null; reasonCode?: string | null }
  >;
  validatingDocId: string | null;
  sendingVerificationId: string | null;
  verificationResendRemainingMs: number;
  onEdit: (exp: WorkExperienceDto, options?: { initialStep?: number }) => void;
  onDelete: (id: string) => void;
  onSendVerification: (experienceId: string, exp: WorkExperienceDto) => void;
  onValidateProof: (expId: string, docId: string) => void;
  onRemoveDocument: (expId: string, docId: string) => void;
  onAttachProof: (expId: string) => void;
};

export function WorkExperienceExperienceCard({
  exp,
  validationResults,
  validatingDocId,
  sendingVerificationId,
  verificationResendRemainingMs,
  onEdit,
  onDelete,
  onSendVerification,
  onValidateProof,
  onRemoveDocument,
  onAttachProof,
}: WorkExperienceExperienceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ruleCheck = workExperienceRuleCheck(exp);
  const managerEndorsementStatus = getManagerEndorsementStatus(exp);
  const projectLabels = getExperienceProjectLabels(exp.projects);
  const visibleProjects = projectLabels.slice(0, 2);
  const hiddenProjectCount = Math.max(0, projectLabels.length - visibleProjects.length);
  const isVerified = exp.status === 'VERIFIED';
  const markerClass =
    exp.status === 'VERIFIED'
      ? 'border-[var(--ds-green)] bg-[var(--ds-green)]'
      : exp.isCurrent
        ? 'border-[var(--ds-green)] bg-[var(--ds-surface)]'
        : 'border-[var(--ds-border)] bg-[var(--ds-text-muted)]/30';

  const endLabel = exp.isCurrent
    ? 'Present'
    : exp.endDate
      ? formatExperienceMonthYear(exp.endDate)
      : 'N/A';

  const employmentMeta = [
    EMPLOYMENT_TYPE_LABELS[exp.employmentType] || exp.employmentType,
    exp.domain,
  ]
    .filter(Boolean)
    .join(' · ');

  const resendOnCooldown = exp.status === 'PENDING_EMPLOYER' && verificationResendRemainingMs > 0;
  const verificationBusy = sendingVerificationId === exp.id;

  return (
    <article className="relative grid grid-cols-1 gap-3 lg:grid-cols-[7.25rem_minmax(0,1fr)] lg:gap-x-4">
      <div className="hidden pt-1 lg:block">
        <p className="text-xs font-medium leading-snug text-[var(--ds-text)]">
          {formatExperienceMonthYear(exp.startDate)}
        </p>
        <p className="text-xs leading-snug text-[var(--ds-text-muted)]">{endLabel}</p>
      </div>

      <div className="relative pl-6 lg:pl-0">
        <span
          className={`absolute left-0 top-8 z-[1] h-3 w-3 rounded-full border-2 lg:-left-[calc(0.75rem+6px)] ${markerClass}`}
          aria-hidden="true"
        />

        <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-5 shadow-[var(--ds-card-shadow)] transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)] text-sm font-semibold text-[var(--ds-green)]">
                {companyInitials(exp.companyName)}
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold leading-snug text-[var(--ds-text)]">
                  {exp.role}
                </h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-1 text-sm text-[var(--ds-text-secondary)]">
                  <Building2
                    className="h-3.5 w-3.5 shrink-0 text-[var(--ds-text-muted)]"
                    aria-hidden="true"
                  />
                  <span>{exp.companyName}</span>
                  {exp.workLocation ? (
                    <>
                      <span className="text-[var(--ds-text-muted)]">·</span>
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0 text-[var(--ds-text-muted)]"
                        aria-hidden="true"
                      />
                      <span>{exp.workLocation}</span>
                    </>
                  ) : null}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ds-text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatExperienceMonthYear(exp.startDate)} — {endLabel}
                  </span>
                  {employmentMeta ? (
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                      {employmentMeta}
                    </span>
                  ) : null}
                  {exp.isCurrent ? (
                    <span className="text-[var(--ds-text-secondary)]">Active employment</span>
                  ) : null}
                  {exp.isCurrent && !ruleCheck.valid ? (
                    <span className="text-amber-800">Documentation required</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <StatusBadge status={exp.status} />
              <button
                type="button"
                onClick={() => onEdit(exp)}
                className="rounded-lg p-2 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]"
                aria-label="Edit experience"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="rounded-lg p-2 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]"
                  aria-label="More actions"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] py-1 shadow-[var(--ds-card-shadow)]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(exp.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          {(exp.companyWebsite || exp.companyLinkedinUrl) && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-[var(--ds-green)]">
              {exp.companyWebsite ? (
                <a
                  href={exp.companyWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  Website
                </a>
              ) : null}
              {exp.companyLinkedinUrl ? (
                <a
                  href={exp.companyLinkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  LinkedIn
                </a>
              ) : null}
            </div>
          )}

          {exp.responsibilities ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--ds-text)]">Responsibilities</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--ds-text-secondary)]">
                {exp.responsibilities}
              </p>
            </div>
          ) : null}

          {exp.skillsClaimed.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--ds-text)]">Skills</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {exp.skillsClaimed.map((skillCode) => (
                  <span
                    key={skillCode}
                    className="rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)] px-2 py-0.5 text-[11px] text-[var(--ds-text-secondary)]"
                  >
                    {SKILL_NAME_BY_CODE.get(skillCode) ?? skillCode}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {projectLabels.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--ds-text)]">Projects</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {visibleProjects.map((label) => (
                  <span
                    key={label}
                    className="rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)] px-2 py-0.5 text-[11px] text-[var(--ds-text-secondary)]"
                  >
                    {label}
                  </span>
                ))}
                {hiddenProjectCount > 0 ? (
                  <span className="rounded-md border border-dashed border-[var(--ds-border)] px-2 py-0.5 text-[11px] text-[var(--ds-text-muted)]">
                    + {hiddenProjectCount} more
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {!isVerified ? (
            <>
              <WorkExperienceVerificationProgress
                exp={exp}
                validationResults={validationResults}
                managerEndorsementStatus={managerEndorsementStatus}
              />

              {exp.status === 'EXPIRED' ? (
                <div className="mt-4 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Link Expired — Resend or Try Another Verifier
                  </div>
                  <p className="leading-relaxed text-amber-900/85">
                    Verification link expired after 48h without a response. You can restart
                    verification with the current verifier or update verifier details first to try
                    another contact.
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSendVerification(exp.id, exp)}
                      disabled={sendingVerificationId === exp.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 disabled:opacity-50"
                    >
                      {sendingVerificationId === exp.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Restarting...
                        </>
                      ) : (
                        'Restart Verification'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(exp)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Update Verifier Details
                    </button>
                  </div>
                </div>
              ) : null}

              {exp.status === 'REJECTED' ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                  <p className="font-semibold">Verification needs attention</p>
                  <p className="mt-1 leading-relaxed">{getNextActionGuidance(exp, ruleCheck)}</p>
                  <button
                    type="button"
                    onClick={() => onEdit(exp, { initialStep: 4 })}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-red-50/80"
                  >
                    Update verifier
                  </button>
                </div>
              ) : null}

              <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs text-[var(--ds-text-secondary)]">
                <p className="font-semibold text-[var(--ds-text)]">Next step</p>
                <p className="mt-1 leading-relaxed">{getNextActionGuidance(exp, ruleCheck)}</p>
              </div>

              {exp.verifierEmail ? (
                <section className="mt-5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)]/50 p-4">
                  <h5 className="text-xs font-semibold text-[var(--ds-text)]">
                    Employer verification
                  </h5>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--ds-text)]">
                        {exp.verifierName || 'Verification contact'}
                      </p>
                      {exp.verifierDesignation ? (
                        <p className="text-xs text-[var(--ds-text-muted)]">
                          {exp.verifierDesignation}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--ds-text-muted)]">Verification contact</p>
                      )}
                      <p className="mt-0.5 text-xs text-[var(--ds-text-secondary)]">
                        {exp.verifierEmail}
                      </p>
                    </div>
                    {exp.status !== 'VERIFIED' ? (
                      <button
                        type="button"
                        onClick={() => onSendVerification(exp.id, exp)}
                        disabled={verificationBusy || resendOnCooldown}
                        title={
                          resendOnCooldown
                            ? `You can resend again in ${formatCooldownLabel(verificationResendRemainingMs)}`
                            : undefined
                        }
                        className={`${profilePrimaryButtonSmClass} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {verificationBusy ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Sending...
                          </>
                        ) : resendOnCooldown ? (
                          `Resend in ${formatCooldownLabel(verificationResendRemainingMs)}`
                        ) : exp.status === 'EXPIRED' ? (
                          'Restart Verification'
                        ) : exp.status === 'PENDING_EMPLOYER' ? (
                          'Resend Verification Link'
                        ) : (
                          'Send Verification Link'
                        )}
                      </button>
                    ) : (
                      <p className="text-xs text-emerald-800">Employer confirmation complete.</p>
                    )}
                  </div>
                </section>
              ) : (
                <div className="mt-5 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    No verifier email configured. Add verifier details to initiate employer
                    verification.
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(exp, { initialStep: 4 })}
                    className="shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium hover:bg-amber-200"
                  >
                    Add Verifier
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-emerald-800">
              Employer confirmation complete. Supporting evidence remains accessible below.
            </p>
          )}

          <section className="mt-5 border-t border-[var(--ds-border-subtle)] pt-4">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-semibold text-[var(--ds-text)]">Supporting documents</h5>
              <button
                type="button"
                onClick={() => onAttachProof(exp.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ds-green)] hover:underline"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Attach Proof
              </button>
            </div>

            {exp.documents && exp.documents.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2">
                {exp.documents.map((doc: WorkExperienceDocumentDto) => {
                  const docRecord = doc as unknown as Record<string, unknown>;
                  const validationResultRecord = docRecord.validationResult as
                    Record<string, unknown> | undefined;
                  const valState = validationResults[doc.id] || {
                    validationStatus: docRecord.validationStatus as string | undefined,
                    rejectionReason: validationResultRecord?.rejectionReason as string | undefined,
                    reasonCode: validationResultRecord?.reasonCode as string | undefined,
                  };
                  const isValidating = validatingDocId === doc.id;
                  const isOfferAttachment = doc.documentType === 'OFFER_LETTER';
                  const sizeLabel = formatProofFileSize(doc.fileSizeBytes);

                  return (
                    <li
                      key={doc.id}
                      className="flex flex-col gap-2 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)]/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[10px] font-bold uppercase text-[var(--ds-text-muted)]">
                          {doc.mimeType.includes('pdf') ? 'PDF' : 'IMG'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--ds-text)]">
                            {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                          </p>
                          <p className="truncate text-xs text-[var(--ds-text-muted)]">
                            {doc.fileName}
                            {sizeLabel ? ` · ${sizeLabel}` : ''}
                          </p>
                          {valState.validationStatus === 'VALIDATED' ? (
                            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              Validated
                            </p>
                          ) : null}
                          {valState.validationStatus === 'NEEDS_MANUAL_REVIEW' ? (
                            <p className="mt-1 text-[11px] font-medium text-amber-900">
                              Manual review:{' '}
                              {valState.rejectionReason || 'Role or date variance detected'}
                            </p>
                          ) : null}
                          {valState.validationStatus === 'REJECTED' ? (
                            <p className="mt-1 text-[11px] font-medium text-red-700">
                              Rejected:{' '}
                              {valState.reasonCode === 'INVALID_DOCUMENT_TYPE'
                                ? valState.rejectionReason ||
                                  'Offer letters support your claim but cannot be validated as employment proof.'
                                : valState.rejectionReason || 'Document mismatch detected'}
                            </p>
                          ) : null}
                          {isOfferAttachment && !valState.validationStatus ? (
                            <p className="mt-1 text-[11px] text-[var(--ds-text-muted)]">
                              Offer letters support your claim but cannot be validated as employment
                              proof.
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!valState.validationStatus && !isOfferAttachment ? (
                          <button
                            type="button"
                            onClick={() => onValidateProof(exp.id, doc.id)}
                            disabled={isValidating}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--ds-text)] hover:bg-[var(--ds-surface-hover)] disabled:opacity-50"
                          >
                            {isValidating ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" /> Validating...
                              </>
                            ) : (
                              'Validate Proof'
                            )}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onRemoveDocument(exp.id, doc.id)}
                          className="rounded-lg p-1.5 text-[var(--ds-text-muted)] hover:bg-red-50 hover:text-red-700"
                          aria-label="Remove document"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] italic text-[var(--ds-text-muted)]">
                No proof document attached yet.
              </p>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
