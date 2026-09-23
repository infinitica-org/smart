import type { WorkExperienceDto } from '@smart/contracts';
import { validateWorkExperienceLetterRules } from '@smart/contracts';

export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted — Ready for Verification',
  PENDING_EMPLOYER: 'Pending Employer Response',
  VERIFIED: 'Verified & Confirmed',
  REJECTED: 'Verification Disputed / Rejected',
  EXPIRED: 'Verification Link Expired (Action Needed)',
};

export function getNextActionGuidance(
  exp: WorkExperienceDto,
  ruleCheck: { valid: boolean; missingDocuments: string[] },
): string {
  if (exp.status === 'VERIFIED') {
    return 'Work experience claim is fully verified and locked on your candidate profile.';
  }
  if (exp.status === 'EXPIRED') {
    return 'Link Expired — Resend or Try Another Verifier. Click "Restart Verification" or update verifier details.';
  }
  if (exp.status === 'REJECTED') {
    return 'Verification was disputed or rejected by employer verifier. Update verifier details or review claim.';
  }
  if (exp.status === 'PENDING_EMPLOYER') {
    return 'Verification request is active. Automated reminder sent at 6h; expires at 48h. You can resend if needed.';
  }
  if (!ruleCheck.valid) {
    return 'Upload required proof documents (Offer Letter / Relieving Letter) to proceed with claim verification.';
  }
  if (!exp.verifierEmail) {
    return 'Click "Add Verifier" to configure employer HR/Manager contact details for verification.';
  }
  return 'Click "Send Verification Link" to dispatch verification request to your employer verifier.';
}

export function formatExperienceMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getExperienceProjectLabels(projects: WorkExperienceDto['projects']): string[] {
  if (!projects || !Array.isArray(projects)) return [];
  return projects.flatMap((entry) => {
    if (typeof entry === 'string' && entry.trim()) return [entry.trim()];
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      if (typeof record.title === 'string' && record.title.trim()) return [record.title.trim()];
      if (typeof record.name === 'string' && record.name.trim()) return [record.name.trim()];
    }
    return [];
  });
}

export function formatProofFileSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function companyInitials(companyName: string): string {
  const parts = companyName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const word = parts[0] ?? '';
    return word.slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase();
}

export function getManagerEndorsementStatus(exp: WorkExperienceDto): string | null {
  return exp.managerEndorsement?.status ?? null;
}

export function workExperienceRuleCheck(exp: WorkExperienceDto) {
  return validateWorkExperienceLetterRules({
    isCurrent: exp.isCurrent,
    endDate: exp.endDate,
    documents: exp.documents ?? [],
  });
}

export function verificationStatusTone(
  status: WorkExperienceDto['status'],
): 'verified' | 'pending' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'VERIFIED':
      return 'verified';
    case 'PENDING_EMPLOYER':
      return 'pending';
    case 'EXPIRED':
      return 'warning';
    case 'REJECTED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export { WORK_EXPERIENCE_CARD_ACCENTS } from '@/lib/student-bento-accents';

export function verificationStatusShortLabel(status: WorkExperienceDto['status']): string {
  switch (status) {
    case 'VERIFIED':
      return 'Verified';
    case 'PENDING_EMPLOYER':
      return 'Pending employer';
    case 'EXPIRED':
      return 'Link expired';
    case 'REJECTED':
      return 'Needs attention';
    case 'SUBMITTED':
      return 'Ready to verify';
    default:
      return 'In progress';
  }
}
