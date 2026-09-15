/**
 * Human-readable labels for audit log `action` strings.
 *
 * Actions are emitted verbatim by `AuditPublisherService.record(...)` (directly, or via each
 * service's `writeAudit(...)` helper) across the api-core modules — e.g. institutions.service.ts,
 * companies.service.ts, username.service.ts, work-experience.service.ts. New actions are added
 * there over time; this dictionary is best-effort and any action missing from it falls back to a
 * readable title-cased rendering (see `formatAuditAction`) so new/unmapped actions never look
 * broken in the UI.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  // institutions.service.ts
  'institution.plan_changed': 'Changed institution plan',
  'institution.held': 'Held institution',
  'institution.hold_released': 'Released institution hold',
  'institution.deactivated': 'Deactivated institution',
  'institution.restored': 'Restored institution',
  'institution.flag_override': 'Set institution feature flag override',
  'institution.verification': 'Updated institution verification',
  'batch.members_imported': 'Imported batch members',
  'candidate.profile_viewed': 'Viewed candidate profile',
  'plan.capacity_updated': 'Updated plan capacity',
  'plan.entitlements_updated': 'Updated plan entitlements',
  'platform_admin.invited': 'Invited platform admin',
  'student.held': 'Held student',
  'student.hold_released': 'Released student hold',

  // companies.service.ts
  'company.created': 'Created company',
  'company.deactivated': 'Deactivated company',
  'company.flag_override': 'Set company feature flag override',
  'company.held': 'Held company',
  'company.hold_released': 'Released company hold',
  'company.plan_changed': 'Changed company plan',
  'company.restored': 'Restored company',
  'company.verification': 'Updated company verification',

  // organizations.service.ts
  'organization.verification_updated': 'Updated organization verification',

  // username.service.ts / blocked-words-admin.service.ts
  'username.reserved': 'Reserved username',
  'profile_visibility.updated': 'Updated profile visibility',
  'blocked_word.created': 'Added blocked word',
  'blocked_word.removed': 'Removed blocked word',

  // candidate-certificates.service.ts
  'candidate_certificate.voided': 'Voided candidate certificate',

  // corroboration.service.ts
  'corroboration.review_flag.created': 'Flagged item for review',
  'corroboration.review_flag.resolved': 'Resolved review flag',

  // signal-ingestion.service.ts
  'signal.connection.created': 'Connected signal source',
  'signal.connection.revoked': 'Revoked signal source',
  'signal.fetch.completed': 'Completed signal fetch',
  'signal.fetch.failed': 'Failed signal fetch',

  // assessment.service.ts
  'integrity.voided': 'Voided integrity flag',
  'integrity.cleared': 'Cleared integrity flag',

  // work-experience.service.ts
  WORK_EXPERIENCE_SUBMITTED: 'Submitted work experience',
  WORK_EXPERIENCE_UPDATED: 'Updated work experience',
  WORK_EXPERIENCE_DELETED: 'Deleted work experience',
  WORK_EXPERIENCE_DOCUMENT_ATTACHED: 'Attached work experience document',
  WORK_EXPERIENCE_DOCUMENT_AUTHENTICITY_CHECKED: 'Checked document authenticity',
  WORK_EXPERIENCE_DOCUMENT_REMOVED: 'Removed work experience document',
  WORK_EXPERIENCE_EMPLOYER_VERIFICATION_SENT: 'Sent employer verification request',
  WORK_EXPERIENCE_EMPLOYER_VERIFICATION_APPROVED: 'Approved employer verification',
  WORK_EXPERIENCE_EMPLOYER_VERIFICATION_REJECTED: 'Rejected employer verification',
  WORK_EXPERIENCE_MANAGER_ENDORSEMENT_SENT: 'Sent manager endorsement request',
  WORK_EXPERIENCE_MANAGER_ENDORSEMENT_CONFIRMED: 'Confirmed manager endorsement',
  WORK_EXPERIENCE_MANAGER_ENDORSEMENT_DISPUTED: 'Disputed manager endorsement',
  'work_experience.voided': 'Voided work experience',
  'work_experience.authenticity_approved': 'Approved work experience authenticity',
};

/** Title-cases a raw `SCREAMING_SNAKE_CASE` or `dot.snake_case` string as a graceful fallback. */
function titleCaseFallback(raw: string): string {
  const words = raw
    .split(/[._]+/)
    .filter(Boolean)
    .flatMap((segment) => segment.split(/(?<=[a-z0-9])(?=[A-Z])/));
  if (words.length === 0) return raw;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

/** Renders a raw audit `action` string as a human-readable label, falling back gracefully. */
export function formatAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? titleCaseFallback(action);
}

/** Renders a raw audit `resourceType` string (e.g. `candidate_certificate`, `WorkExperience`). */
export function formatResourceType(resourceType: string): string {
  return titleCaseFallback(resourceType);
}
