import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACCESS_KEY = 'auditAccess';

export interface AuditAccessOptions {
  /** Audit `resourceType`, e.g. 'user', 'company', 'institution_students'. */
  resourceType: string;
  /** Route param holding the resource id. */
  idParam: string;
  /** Audit action; defaults to `admin.data_accessed`. */
  action?: string;
  /** Route param holding the data subject (the student) when it isn't the resource itself. */
  subjectParam?: string;
}

/**
 * S6-VV-103 (#493) — records `admin.data_accessed` when this read succeeds for
 * someone other than the data subject. Put it on GET routes that return one
 * person's (or one tenant's) personal data to an admin, TPO or company user.
 * Enforced by AuditAccessInterceptor; throttled per actor + resource.
 */
export const AuditAccess = (
  resourceType: string,
  idParam: string,
  extra: Pick<AuditAccessOptions, 'action' | 'subjectParam'> = {},
) =>
  SetMetadata(AUDIT_ACCESS_KEY, { resourceType, idParam, ...extra } satisfies AuditAccessOptions);
