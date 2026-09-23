'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
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
  formatExperienceMonthYear,
  formatProofFileSize,
  getManagerEndorsementStatus,
  getNextActionGuidance,
  VERIFICATION_STATUS_LABELS,
  verificationStatusShortLabel,
  verificationStatusTone,
  WORK_EXPERIENCE_CARD_ACCENTS,
  workExperienceRuleCheck,
} from '@/components/profile/work-experience/work-experience-presenters';
import { WorkExperienceVerificationProgress } from '@/components/profile/work-experience/WorkExperienceVerificationProgress';
import { formatCooldownLabel } from '@/lib/use-per-action-cooldown';

const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));

const metricTileBase =
  'flex min-h-[4.5rem] flex-col justify-center gap-0.5 rounded-[14px] px-3.5 py-3 ring-1';

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
  accentIndex: number;
  validationResults: Record<
    string,
    { validationStatus: string; rejectionReason?: string | null; reasonCode?: string | null }
  >;
  validatingDocId: string | null;
  sendingVerificationId: string | null;
  verificationResendRemainingMs: number;
  sendingEndorsementId: string | null;
  onEdit: (exp: WorkExperienceDto, options?: { focusVerification?: boolean }) => void;
  onDelete: (id: string) => void;
  onSendVerification: (experienceId: string, exp: WorkExperienceDto) => void;
  onRequestEndorsement: (
    experienceId: string,
    body: { managerEmail: string; managerName: string },
  ) => void;
  onValidateProof: (expId: string, docId: string) => void;
  onRemoveDocument: (expId: string, docId: string) => void;
  onAttachProof: (expId: string) => void;
};

export function WorkExperienceExperienceCard({
  exp,
  accentIndex,
  validationResults,
  validatingDocId,
  sendingVerificationId,
  verificationResendRemainingMs,
  sendingEndorsementId,
  onEdit,
  onDelete,
  onSendVerification,
  onRequestEndorsement,
  onValidateProof,
  onRemoveDocument,
  onAttachProof,
}: WorkExperienceExperienceCardProps) {
  const accent =
    WORK_EXPERIENCE_CARD_ACCENTS[accentIndex % WORK_EXPERIENCE_CARD_ACCENTS.length] ??
    WORK_EXPERIENCE_CARD_ACCENTS[0];
  const ruleCheck = workExperienceRuleCheck(exp);
  const docCount = exp.documents?.length ?? 0;
  const dateRangeLabel = `${formatExperienceMonthYear(exp.startDate)} — ${exp.isCurrent ? 'Present' : exp.endDate ? formatExperienceMonthYear(exp.endDate) : 'N/A'}`;
  const managerEndorsementStatus = getManagerEndorsementStatus(exp);
  const managerEndorsement = exp.managerEndorsement ?? null;
  const [managerEmail, setManagerEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const isVerified = exp.status === 'VERIFIED';
  const endorsementBusy = sendingEndorsementId === exp.id;
  const canRequestManagerEndorsement =
    ruleCheck.valid &&
    managerEndorsement?.status !== 'CONFIRMED' &&
    managerEndorsement?.status !== 'PENDING';
  const endorserContactReady = managerEmail.trim().length > 0 && managerName.trim().length >= 2;

  useEffect(() => {
    if (
      managerEndorsement &&
      (managerEndorsement.status === 'EXPIRED' || managerEndorsement.status === 'DISPUTED')
    ) {
      setManagerEmail(managerEndorsement.managerEmail);
      setManagerName(managerEndorsement.managerName ?? '');
    }
  }, [exp.id, managerEndorsement?.endorsementId, managerEndorsement?.status]);

  const employmentMeta = [
    EMPLOYMENT_TYPE_LABELS[exp.employmentType] || exp.employmentType,
    exp.domain,
  ]
    .filter(Boolean)
    .join(' · ');

  const resendOnCooldown = exp.status === 'PENDING_EMPLOYER' && verificationResendRemainingMs > 0;
  const verificationBusy = sendingVerificationId === exp.id;

  return (
    <article
      className={`font-[family-name:var(--tpo-font-sans)] overflow-hidden rounded-[18px] border bg-[var(--ds-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${accent.cardBorder}`}
    >
      <div
        className={`flex items-start justify-between gap-3 border-b border-[var(--ds-border-subtle)]/80 px-4 py-3.5 ${accent.headerWash}`}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full shadow-sm ${accent.marker}`}
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.022em] text-[var(--ds-text)]">
                {exp.role}
              </h3>
              {exp.isCurrent ? (
                <span className="rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-medium text-[var(--ds-text-secondary)] ring-1 ring-[#101828]/[0.06]">
                  Active employment
                </span>
              ) : null}
              <StatusBadge status={exp.status} />
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] leading-snug tracking-[-0.01em] text-[var(--ds-text-muted)]">
              <span>{exp.companyName}</span>
              {exp.workLocation ? (
                <>
                  <span className="text-[var(--ds-text-subtle)]">·</span>
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{exp.workLocation}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onEdit(exp)}
            aria-label="Edit experience"
            className="flex size-8 items-center justify-center rounded-lg bg-white/60 text-[var(--ds-text-muted)] ring-1 ring-[#101828]/[0.05] transition hover:bg-white hover:text-[var(--ds-text)]"
          >
            <Pencil className="size-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(exp.id)}
            aria-label="Delete experience"
            className="flex size-8 items-center justify-center rounded-lg bg-white/60 text-[var(--ds-text-muted)] ring-1 ring-[#101828]/[0.05] transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-[var(--ds-surface-muted)]/30 p-3 pt-2.5">
        <div className={`${metricTileBase} ${accent.durationTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Duration
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text)]">
            <Calendar className={`size-3.5 shrink-0 ${accent.durationIcon}`} strokeWidth={1.5} />
            {dateRangeLabel}
          </span>
        </div>
        <div className={`${metricTileBase} ${accent.employmentTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Employment
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text)]">
            <Briefcase className={`size-3.5 shrink-0 ${accent.employmentIcon}`} strokeWidth={1.5} />
            <span className="line-clamp-2">{employmentMeta || '—'}</span>
          </span>
        </div>
        <div className={`${metricTileBase} ${accent.docsTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Documents
          </span>
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-medium text-[var(--ds-text-secondary)]">
              <FileText className={`size-3.5 shrink-0 ${accent.docsIcon}`} strokeWidth={1.5} />
              {docCount === 0 ? 'No files' : `${docCount} file${docCount === 1 ? '' : 's'}`}
            </span>
            <button
              type="button"
              onClick={() => onAttachProof(exp.id)}
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-white/70 px-2 py-1 text-[12px] font-semibold tracking-[-0.01em] text-[var(--ds-green)] ring-1 ring-[var(--ds-green)]/15 transition hover:bg-[var(--ds-green-soft)]"
            >
              {docCount > 0 ? (
                <>
                  Manage
                  <MoreHorizontal className="size-3.5" aria-hidden />
                </>
              ) : (
                <>
                  Upload
                  <Upload className="size-3.5" aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>
        <div className={`${metricTileBase} ${accent.statusTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Verification
          </span>
          <p
            className={`text-[15px] font-semibold leading-snug tracking-[-0.02em] ${accent.statusText}`}
          >
            {verificationStatusShortLabel(exp.status)}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
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
                  onClick={() => onEdit(exp, { focusVerification: true })}
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
                  onClick={() => onEdit(exp, { focusVerification: true })}
                  className="shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium hover:bg-amber-200"
                >
                  Add Verifier
                </button>
              </div>
            )}

            {ruleCheck.valid ? (
              <section className="mt-5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)]/50 p-4">
                <h5 className="text-xs font-semibold text-[var(--ds-text)]">Manager endorsement</h5>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">
                  Who will endorse this experience? Enter their professional work contact below.
                  This is separate from employer HR verification above.
                </p>

                {managerEndorsement?.status === 'CONFIRMED' ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    <p className="font-medium">Manager endorsement confirmed</p>
                    <p className="mt-1">
                      {managerEndorsement.managerName
                        ? `${managerEndorsement.managerName} (${managerEndorsement.managerEmail})`
                        : managerEndorsement.managerEmail}{' '}
                      confirmed your work experience as your manager, including your {exp.role} role
                      ({dateRangeLabel}){exp.responsibilities ? ' and stated responsibilities' : ''}
                      .
                    </p>
                  </div>
                ) : managerEndorsement?.status === 'PENDING' ? (
                  <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                    <p className="font-medium">Endorsement request pending</p>
                    <p className="mt-1">
                      Waiting for{' '}
                      {managerEndorsement.managerName
                        ? `${managerEndorsement.managerName} (${managerEndorsement.managerEmail})`
                        : managerEndorsement.managerEmail}{' '}
                      to respond. The secure link expires on{' '}
                      {new Date(managerEndorsement.expiresAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      .
                    </p>
                  </div>
                ) : canRequestManagerEndorsement ? (
                  <div className="mt-3 flex flex-col gap-3">
                    {managerEndorsement?.status === 'EXPIRED' ? (
                      <p className="text-xs text-amber-900">
                        The previous manager endorsement link expired. You can send a new request.
                      </p>
                    ) : null}
                    {managerEndorsement?.status === 'DISPUTED' ? (
                      <p className="text-xs text-amber-900">
                        The previous manager endorsement was disputed. Update the contact and try
                        again if appropriate.
                      </p>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="font-medium text-[var(--ds-text)]">
                          Endorser&apos;s work email <span className="text-red-600">*</span>
                        </span>
                        <input
                          type="email"
                          value={managerEmail}
                          onChange={(event) => setManagerEmail(event.target.value)}
                          placeholder="manager@yourcompany.com"
                          className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="font-medium text-[var(--ds-text)]">
                          Endorser&apos;s name <span className="text-red-600">*</span>
                        </span>
                        <input
                          type="text"
                          value={managerName}
                          onChange={(event) => setManagerName(event.target.value)}
                          placeholder="Jane Smith"
                          className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={endorsementBusy || !endorserContactReady}
                      onClick={() =>
                        onRequestEndorsement(exp.id, {
                          managerEmail: managerEmail.trim(),
                          managerName: managerName.trim(),
                        })
                      }
                      className={`${profilePrimaryButtonSmClass} self-start disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {endorsementBusy ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Sending request...
                        </>
                      ) : (
                        'Request Endorsement'
                      )}
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        ) : (
          <p className="mt-4 text-sm text-emerald-800">
            Employer confirmation complete. Supporting evidence remains accessible below.
          </p>
        )}

        {managerEndorsementStatus ? (
          <section className="mt-4 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)]/50 p-4">
            <h5 className="text-xs font-semibold text-[var(--ds-text)]">Manager endorsement</h5>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--ds-text)]">
                  {((
                    (exp as unknown as Record<string, unknown>).managerEndorsement as
                      Record<string, unknown> | undefined
                  )?.managerName as string) ||
                    ((exp as unknown as Record<string, unknown>).managerName as string) ||
                    'Hiring Manager'}
                </p>
                <p className="text-xs text-[var(--ds-text-secondary)]">
                  {((
                    (exp as unknown as Record<string, unknown>).managerEndorsement as
                      Record<string, unknown> | undefined
                  )?.managerEmail as string) ||
                    ((exp as unknown as Record<string, unknown>).managerEmail as string) ||
                    ''}
                </p>
                <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
                  Status:{' '}
                  <span className="font-semibold text-[var(--ds-text)]">
                    {managerEndorsementStatus}
                  </span>
                </p>
              </div>
              {managerEndorsementStatus === 'PENDING' && onResendManagerEndorsement ? (
                <button
                  type="button"
                  onClick={() => onResendManagerEndorsement(exp.id)}
                  disabled={resendingManagerId === exp.id || managerResendRemainingMs > 0}
                  title={
                    managerResendRemainingMs > 0
                      ? `You can resend reminder again in ${formatCooldownLabel(managerResendRemainingMs)}`
                      : undefined
                  }
                  className={`${profilePrimaryButtonSmClass} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {resendingManagerId === exp.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Resending...
                    </>
                  ) : managerResendRemainingMs > 0 ? (
                    `Resend in ${formatCooldownLabel(managerResendRemainingMs)}`
                  ) : (
                    'Resend Reminder'
                  )}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="rounded-[14px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]/40 p-3">
          <h5 className="text-xs font-semibold text-[var(--ds-text)]">Supporting documents</h5>

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
    </article>
  );
}
