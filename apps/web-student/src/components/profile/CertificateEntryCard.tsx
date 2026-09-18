'use client';

import Link from 'next/link';
import {
  Award,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Sparkles,
  Timer,
} from 'lucide-react';
import type { CandidateCertificateDto } from '@smart/contracts';

import {
  CERTIFICATE_CARD_ACCENTS,
  certificateManageCtaLabel,
  certificateNeedsAssessment,
  certificateProofSummary,
  certificateStatusIsPending,
  certificateStatusIsRejected,
  certificateStatusIsVerified,
  certificateStatusLabel,
} from '@/lib/certificate-entry-presenters';

const metricTileBase =
  'flex min-h-[4.5rem] flex-col justify-center gap-0.5 rounded-[14px] px-3.5 py-3 ring-1';

function formatDisplayDate(raw: string | null | undefined): string {
  if (!raw?.trim()) return '—';
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return raw.trim();
  return new Date(parsed).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface CertificateEntryCardProps {
  certificate: CandidateCertificateDto;
  accentIndex: number;
}

export function CertificateEntryCard({ certificate, accentIndex }: CertificateEntryCardProps) {
  const accent =
    CERTIFICATE_CARD_ACCENTS[accentIndex % CERTIFICATE_CARD_ACCENTS.length] ??
    CERTIFICATE_CARD_ACCENTS[0];
  const proof = certificateProofSummary(certificate);
  const skillCount = certificate.skills.length;
  const manageHref = `/certificates/add?id=${certificate.certificateId}`;
  const assessmentHref = `/certificates/${certificate.certificateId}/verify`;

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
                {certificate.title?.trim() || 'Untitled certificate'}
              </h3>
              {certificateStatusIsVerified(certificate.status) ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--ds-green-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-green)]">
                  <CheckCircle2 className="size-3" aria-hidden />
                  Verified
                </span>
              ) : null}
              {certificateStatusIsRejected(certificate.status) ? (
                <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                  {certificateStatusLabel(certificate.status)}
                </span>
              ) : null}
              {certificateStatusIsPending(certificate.status) ? (
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${accent.pendingBadge}`}
                >
                  {certificateStatusLabel(certificate.status)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[13px] leading-snug tracking-[-0.01em] text-[var(--ds-text-muted)]">
              {certificate.issuer?.trim() || 'Issuer not set'}
              {certificate.certificateNumber ? (
                <span className="text-[var(--ds-text-subtle)]">
                  {' '}
                  · ID {certificate.certificateNumber}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <Link
          href={manageHref}
          className="shrink-0 rounded-lg bg-white/70 px-3 py-1.5 text-[12px] font-semibold tracking-[-0.01em] text-[var(--ds-text)] ring-1 ring-[#101828]/[0.06] transition hover:bg-white hover:ring-[var(--ds-green)]/25 hover:text-[var(--ds-green)]"
        >
          {certificateManageCtaLabel(certificate.status)}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-[var(--ds-surface-muted)]/30 p-3 pt-2.5">
        <div className={`${metricTileBase} ${accent.issuedTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Issued
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text)]">
            <Calendar
              className={`size-3.5 shrink-0 ${accent.issuedIcon}`}
              strokeWidth={1.5}
              aria-hidden
            />
            {formatDisplayDate(certificate.issueDate)}
          </span>
        </div>

        <div className={`${metricTileBase} ${accent.expiryTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Expires
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text)]">
            <Timer
              className={`size-3.5 shrink-0 ${accent.expiryIcon}`}
              strokeWidth={1.5}
              aria-hidden
            />
            {formatDisplayDate(certificate.expiryDate)}
          </span>
        </div>

        <div className={`${metricTileBase} ${accent.skillsTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Skills claimed
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text)]">
            <Sparkles
              className={`size-3.5 shrink-0 ${accent.skillsIcon}`}
              strokeWidth={1.5}
              aria-hidden
            />
            {skillCount === 0 ? 'None yet' : `${skillCount} skill${skillCount === 1 ? '' : 's'}`}
          </span>
        </div>

        <div className={`${metricTileBase} ${accent.proofTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            {proof.label}
          </span>
          <span
            className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text-secondary)]"
            title={proof.detail}
          >
            <FileText
              className={`size-3.5 shrink-0 ${accent.proofIcon}`}
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="truncate">{proof.detail}</span>
          </span>
        </div>
      </div>

      {skillCount > 0 || certificate.verificationUrl || certificateNeedsAssessment(certificate) ? (
        <div className="space-y-2.5 border-t border-[var(--ds-border-subtle)]/80 px-4 py-3">
          {skillCount > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {certificate.skills.slice(0, 4).map((skill) => (
                <span
                  key={skill.skillCode}
                  className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-[var(--ds-text-secondary)] ring-1 ring-[#101828]/[0.06]"
                >
                  {skill.skillName}
                </span>
              ))}
              {skillCount > 4 ? (
                <span className="rounded-md px-2 py-0.5 text-[11px] font-medium text-[var(--ds-text-muted)]">
                  +{skillCount - 4} more
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium">
            {certificate.verificationUrl ? (
              <a
                href={certificate.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--ds-green)] hover:underline"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                Verify on issuer site
              </a>
            ) : null}
            {certificateNeedsAssessment(certificate) ? (
              <Link
                href={assessmentHref}
                className="inline-flex items-center gap-1 text-[var(--ds-text)] hover:text-[var(--ds-green)]"
              >
                <Award className="size-3.5" aria-hidden />
                Take assessment
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
