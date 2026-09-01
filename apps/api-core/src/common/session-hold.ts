import { ForbiddenException } from '@nestjs/common';
import { SESSION_HOLD_MESSAGE, type SessionHoldCode } from '@smart/contracts';

export type SessionHold = { code: SessionHoldCode; message: string };

export function resolveSessionHold(user: {
  role: string;
  heldAt: Date | null;
  institution: { heldAt: Date | null; deactivatedAt: Date | null } | null;
  company?: { heldAt: Date | null; deactivatedAt: Date | null } | null;
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
