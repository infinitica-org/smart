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
  'admin.level.created': 'Created assessment level',
  'admin.level.updated': 'Updated assessment level',
  'admin.item.created': 'Created assessment item',
  'admin.item.updated': 'Updated assessment item',
  'admin.cut_score.upserted': 'Upserted cut score',
  'admin.response.graded': 'Manually graded response',

  // attempt-result-recalculation.service.ts / qlix-recalibration.service.ts (S6-VV-102)
  'score.recalculated': 'Recalculated attempt score',
  'score.recalibration_run': 'Ran scoring recalibration',
  'admin.skill_retake_policy.updated': 'Updated skill retake policy',

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

/**
 * Explicit allowlist of `AuditLog.metadata` keys that are safe to render verbatim to a
 * SUPER_ADMIN in the audit detail Sheet. Anything not listed here stays hidden behind the
 * "N additional fields (raw)" affordance — a new key showing up at a call site does not
 * automatically become visible; adding it here is a deliberate decision.
 *
 * Built the same way as `AUDIT_ACTION_LABELS` above: by enumerating every metadata object
 * actually passed to `AuditPublisherService.record(...)` / `writeAudit(...)` across api-core
 * (institutions.service.ts, companies.service.ts, organizations.service.ts, username.service.ts,
 * blocked-words-admin.service.ts, corroboration.service.ts, signal-ingestion.service.ts,
 * work-experience.service.ts).
 *
 * Deliberately excluded: `verifierEmail` (employer-verification metadata) and `managerEmail`
 * (manager-endorsement metadata) in work-experience.service.ts — these are third-party contact
 * addresses collected for the verification workflow, not something an admin needs while
 * triaging the audit log. They stay visible on the work-experience review screen itself; this
 * dictionary just avoids giving them a second, easy-to-forget-about home.
 */
export const ALLOWED_AUDIT_METADATA_KEYS = new Set<string>([
  // institutions.service.ts / companies.service.ts
  'planCode',
  'key',
  'enabled',
  'decision',
  'institutionId',
  'candidateCapacity',
  'entitlements',
  'reasonCode',
  'email', // platform_admin.invited — the invited admin's own address, core to that event

  // institutions.service.ts (batch import counts)
  'imported',
  'skipped',
  'existingStudents',
  'newAccounts',
  'pendingInvitations',

  // organizations.service.ts
  'verificationStatus',
  'verificationReason',

  // username.service.ts / blocked-words-admin.service.ts
  'profileVisible',
  'showInProgressItems',
  'word',

  // corroboration.service.ts
  'userId',
  'claimId',
  'skillCode',
  'resolutionNote',
  'passiveScore',
  'assessmentScore',

  // signal-ingestion.service.ts
  'sourceId',
  'externalAccountId',
  'message',

  // attempt-result-recalculation.service.ts / qlix-recalibration.service.ts (S6-VV-102)
  'trigger',
  'levelId',
  'previousScorePercent',
  'nextScorePercent',
  'previousTier',
  'nextTier',
  'predictor',
  'sampleSize',
  'correlation',
  'auc',
  'previousWeight',
  'nextWeight',
  'published',

  // work-experience.service.ts
  'attemptId',
  'approved',
  'comments',
  'endorsementId',
  'overallVerified',
  'skillRatings',
  'verifierDomain',
  'companyDomain',
  'domainMatch',
  'resolvedDomain',
  'managerEmailDistinctStudentCount',
  'managerEmailDisputedCount',
  'submissionIpDistinctStudentCount',
]);

/** Title-cases a raw `SCREAMING_SNAKE_CASE` or `dot.snake_case` string as a graceful fallback. */
function titleCaseFallback(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const words = raw
    .split(/[._]+/)
    .filter(Boolean)
    .flatMap((segment) => segment.split(/(?<=[a-z0-9])(?=[A-Z])/));
  if (words.length === 0) return raw;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

/** Renders a raw audit `action` string as a human-readable label, falling back gracefully. */
export function formatAuditAction(action?: string | null): string {
  if (!action) return '—';
  return AUDIT_ACTION_LABELS[action] ?? titleCaseFallback(action);
}

/**
 * Reverse lookup: human label (lowercased) -> raw action string. Lets the Action filter accept
 * either representation, since the table now only ever shows the label and an admin filtering
 * by what they see on screen has no way to get back to the raw `institution.held`-style string.
 */
const LABEL_TO_ACTION = new Map<string, string>(
  Object.entries(AUDIT_ACTION_LABELS).map(([action, label]) => [label.toLowerCase(), action]),
);

/**
 * Resolves an Action filter input to the raw action string the API expects. An exact
 * (case-insensitive) match against a known human label is translated to its raw action;
 * anything else — including a raw action substring like `institution.` — passes through
 * unchanged, since the API already filters with a case-insensitive `contains`.
 */
export function resolveActionFilterValue(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  return LABEL_TO_ACTION.get(trimmed.toLowerCase()) ?? trimmed;
}

/** Renders a raw audit `resourceType` string (e.g. `candidate_certificate`, `WorkExperience`). */
export function formatResourceType(resourceType?: string | null): string {
  if (!resourceType) return '—';
  return titleCaseFallback(resourceType);
}
