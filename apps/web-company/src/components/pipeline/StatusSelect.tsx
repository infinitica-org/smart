'use client';

import {
  EMPLOYER_APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type EmployerApplicantCard,
} from '@smart/contracts';

interface StatusSelectProps {
  applicant: Pick<
    EmployerApplicantCard,
    'candidateName' | 'status' | 'statusLabel' | 'allowedNext'
  >;
  disabled?: boolean;
  onChange: (to: ApplicationStatus) => void;
}

/**
 * Status dropdown (Th6-414): the current status plus ONLY the stages the server allows next.
 * A finished application (Hired, Rejected, Withdrawn) has nothing to pick, so it renders as plain text.
 */
export function StatusSelect({ applicant, disabled, onChange }: StatusSelectProps) {
  if (applicant.allowedNext.length === 0) {
    return <span className="text-sm font-semibold">{applicant.statusLabel}</span>;
  }
  return (
    <select
      aria-label={`Status for ${applicant.candidateName}`}
      className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
      value={applicant.status}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as ApplicationStatus)}
    >
      <option value={applicant.status}>{applicant.statusLabel}</option>
      {applicant.allowedNext.map((status) => (
        <option key={status} value={status}>
          Move to {EMPLOYER_APPLICATION_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
