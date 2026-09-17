'use client';

import type { ReactNode } from 'react';
import { FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import type { CredentialType, ProfessionalCredentialDto } from '@smart/contracts';

import { CERTIFICATE_CARD_ACCENTS } from '@/lib/certificate-entry-presenters';

const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  CERTIFICATION: 'Certification',
  LICENSE: 'License',
  DEGREE: 'Degree',
  BADGE: 'Badge',
  PROFESSIONAL_MEMBERSHIP: 'Professional membership',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:
    'bg-[var(--student-success-soft)] text-[var(--student-success)] ring-1 ring-[var(--student-success-border)]',
  PENDING_VERIFICATION:
    'bg-[var(--student-warning-soft)] text-[var(--student-warning)] ring-1 ring-[var(--student-warning-border)]',
  EXPIRED:
    'bg-[var(--student-surface-subtle)] text-[var(--student-text-secondary)] ring-1 ring-[var(--student-border-subtle)]',
  REVOKED:
    'bg-[var(--student-error-soft)] text-[var(--student-error)] ring-1 ring-[var(--student-error-border)]',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Verified',
  PENDING_VERIFICATION: 'Pending verification',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

const metricTileBase =
  'flex min-h-[4rem] flex-col justify-center gap-0.5 rounded-[14px] px-3.5 py-3 ring-1';

type DocumentPreview = {
  objectUrl: string;
  fileName: string;
  isImage: boolean;
};

interface CredentialEntryCardProps {
  credential: ProfessionalCredentialDto;
  accentIndex: number;
  preview?: DocumentPreview | null;
  fileName?: string | null;
  uploading: boolean;
  onUploadClick: () => void;
  fileInput: ReactNode;
}

export function CredentialEntryCard({
  credential,
  accentIndex,
  preview,
  fileName,
  uploading,
  onUploadClick,
  fileInput,
}: CredentialEntryCardProps) {
  const accent =
    CERTIFICATE_CARD_ACCENTS[accentIndex % CERTIFICATE_CARD_ACCENTS.length] ??
    CERTIFICATE_CARD_ACCENTS[0];
  const statusClass =
    STATUS_BADGE[credential.status] ?? 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]';

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
            <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.022em] text-[var(--ds-text)]">
              {credential.credentialName}
            </h3>
            <p className="mt-0.5 text-[13px] leading-snug tracking-[-0.01em] text-[var(--ds-text-muted)]">
              {credential.issuer}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${statusClass}`}
        >
          {STATUS_LABELS[credential.status] ?? credential.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-[var(--ds-surface-muted)]/30 p-3 pt-2.5">
        <div className={`${metricTileBase} ${accent.issuedTile}`}>
          <span className="text-[11px] font-medium text-[var(--ds-text-subtle)]">Type</span>
          <span className="text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text)]">
            {CREDENTIAL_TYPE_LABELS[credential.credentialType]}
          </span>
        </div>
        <div className={`${metricTileBase} ${accent.proofTile}`}>
          <span className="text-[11px] font-medium text-[var(--ds-text-subtle)]">Document</span>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-[var(--ds-text-secondary)]">
            <FileText className={`size-3.5 shrink-0 ${accent.proofIcon}`} aria-hidden />
            <span className="truncate">{fileName ?? 'None attached'}</span>
          </span>
        </div>
      </div>

      {preview?.isImage && fileName ? (
        <div className="border-t border-[var(--ds-border-subtle)]/80 px-4 py-3">
          <div className="flex items-center gap-3 rounded-[14px] bg-white/70 p-2.5 ring-1 ring-[#101828]/[0.05]">
            <img
              src={preview.objectUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg border border-[var(--ds-border-subtle)] object-cover"
            />
            <p className="truncate text-xs text-[var(--ds-text-secondary)]">{fileName}</p>
          </div>
        </div>
      ) : null}

      {credential.status === 'PENDING_VERIFICATION' ? (
        <div className="space-y-2.5 border-t border-[var(--ds-border-subtle)]/80 px-4 py-3">
          <button
            type="button"
            disabled={uploading}
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-[12px] font-semibold text-[var(--ds-text)] ring-1 ring-[#101828]/[0.06] transition hover:bg-white disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-3.5" aria-hidden />
            )}
            {credential.documentObjectKey
              ? 'Replace supporting document'
              : 'Upload supporting document'}
          </button>
          {fileInput}
          <p className="inline-flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--ds-text-muted)]">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--ds-green)]" aria-hidden />
            All verification runs on our backend — we&apos;ll update this status as soon as the
            issuer check completes.
          </p>
        </div>
      ) : null}
    </article>
  );
}
