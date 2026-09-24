import type { CompanyPortalAccount } from '@smart/contracts';

export function verificationStatusLabel(
  status: CompanyPortalAccount['companyVerificationStatus'],
): string {
  switch (status) {
    case 'APPROVED':
      return 'Approved';
    case 'PENDING':
      return 'Pending review';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
}
