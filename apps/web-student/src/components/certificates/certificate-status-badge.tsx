import type { CandidateCertificateStatus } from '@smart/contracts';

const STATUS_COPY: Record<CandidateCertificateStatus, { label: string; className: string }> = {
  DECLARED: { label: 'Not started', className: 'border-white/15 bg-white/5 text-white/60' },
  UPLOADED: { label: 'In progress', className: 'border-white/15 bg-white/5 text-white/60' },
  IN_VERIFICATION: {
    label: 'In verification',
    className: 'border-info/40 bg-info/10 text-info',
  },
  VERIFIED: {
    label: 'Verified',
    className: 'border-success/40 bg-success/10 text-success',
  },
  REJECTED: {
    label: 'Not verified',
    className: 'border-danger/40 bg-danger/10 text-danger',
  },
};

export function CertificateStatusBadge({ status }: { status: CandidateCertificateStatus }) {
  const copy = STATUS_COPY[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${copy.className}`}
    >
      {copy.label}
    </span>
  );
}
