'use client';

import Link from 'next/link';
import { Award, Calendar, CheckCircle2, FileText, Sparkles, Clock } from 'lucide-react';
import type { CandidateCertificateDto } from '@smart/contracts';

import {
  certificateManageCtaLabel,
  certificateNeedsAssessment,
  certificateProofSummary,
  certificateStatusIsPending,
  certificateStatusIsRejected,
  certificateStatusIsVerified,
  certificateStatusLabel,
} from '@/lib/certificate-entry-presenters';

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
  accentIndex?: number;
}

export function CertificateEntryCard({ certificate }: CertificateEntryCardProps) {
  const proof = certificateProofSummary(certificate);
  const skillCount = certificate.skills.length;
  const manageHref = `/certificates/add?id=${certificate.certificateId}`;
  const assessmentHref = `/certificates/${certificate.certificateId}/verify`;

  const isVerified = certificateStatusIsVerified(certificate.status);
  const isRejected = certificateStatusIsRejected(certificate.status);
  const isPending = certificateStatusIsPending(certificate.status);

  return (
    <article className="overflow-hidden rounded-md border border-zinc-200/80 bg-white shadow-2xs font-sans select-none dark:border-zinc-800 dark:bg-[#161616]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-[#161616]">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <Award className="size-4.5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                {certificate.title?.trim() || 'Untitled certificate'}
              </h3>

              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Verified
                </span>
              )}

              {isPending && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Clock className="size-3 text-amber-600" />
                  {certificateStatusLabel(certificate.status)}
                </span>
              )}

              {isRejected && (
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
                  Rejected
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {certificate.issuer?.trim() || 'Issuer not specified'}
            </p>
          </div>
        </div>

        <Link
          href={manageHref}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {certificateManageCtaLabel(certificate.status)}
        </Link>
      </div>

      {/* Bento Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Issue Date
          </span>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
            <Calendar className="size-3.5 text-zinc-400 shrink-0" />
            <span>{formatDisplayDate(certificate.issueDate)}</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Credential Proof
          </span>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
            <FileText className="size-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{proof.label}</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-3.5 shadow-2xs sm:col-span-2 dark:border-zinc-800 dark:bg-[#161616]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Mapped Skills ({skillCount})
            </span>
            {certificateNeedsAssessment(certificate) && (
              <Link
                href={assessmentHref}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
              >
                <Sparkles className="size-3 text-amber-400" />
                Take Assessment
              </Link>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {skillCount > 0 ? (
              certificate.skills.map((skill) => (
                <span
                  key={skill.skillCode}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {skill.skillName}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-400">No skills mapped yet</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
