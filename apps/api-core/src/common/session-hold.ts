import { ForbiddenException } from '@nestjs/common';
import { SESSION_HOLD_MESSAGE, type SessionHoldCode } from '@smart/contracts';

export type SessionHold = { code: SessionHoldCode; message: string };

/** S6-VV-139 — reuses `company_held` so no contract change is needed; the message says why. */
export const COMPANY_UNVERIFIED_MESSAGE =
  'This company is no longer verified. You cannot use SMART until verification is approved again.';

export function resolveSessionHold(user: {
  role: string;
  heldAt: Date | null;
  institution: { heldAt: Date | null; deactivatedAt: Date | null } | null;
  company?: {
    heldAt: Date | null;
    deactivatedAt: Date | null;
    verificationStatus?: string | null;
  } | null;
}): SessionHold | null {
  if (user.role === 'SUPER_ADMIN') return null;
  if (user.institution?.deactivatedAt) {
    return {
      code: 'institution_deactivated',
      message: SESSION_HOLD_MESSAGE.institution_deactivated,
    };
  }
  if (user.institution?.heldAt) {
    return { code: 'institution_held', message: SESSION_HOLD_MESSAGE.institution_held };
  }
  if (user.company?.deactivatedAt) {
    return {
      code: 'company_deactivated',
      message: SESSION_HOLD_MESSAGE.company_deactivated,
    };
  }
  if (user.company?.heldAt) {
    return { code: 'company_held', message: SESSION_HOLD_MESSAGE.company_held };
  }
  // A company whose verification is revoked after sign-in must lose access on the
  // next request, not when its access token expires (S6-VV-139).
  if (
    user.role === 'COMPANY' &&
    user.company?.verificationStatus &&
    user.company.verificationStatus !== 'APPROVED'
  ) {
    return { code: 'company_held', message: COMPANY_UNVERIFIED_MESSAGE };
  }
  if (user.heldAt) {
    return { code: 'account_held', message: SESSION_HOLD_MESSAGE.account_held };
  }
  return null;
}

export function throwSessionHoldForbidden(hold: SessionHold): never {
  throw new ForbiddenException({
    error: hold.code,
    message: hold.message,
    statusCode: 403,
  });
}
