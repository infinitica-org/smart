import {
  SmartApiClient,
  buildPortalRedirectUrl,
  createSmartApi,
  getAccessToken,
  storeAccessToken,
} from '@smart/api-client';
import type { AuthenticatedUser } from '@smart/contracts';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const studentUrl = process.env.NEXT_PUBLIC_STUDENT_URL ?? 'http://localhost:3001';
const studentDashboardUrl = `${studentUrl}/dashboard`;
const tpoUrl = process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002';
const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3003';

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken,
});
export const api = createSmartApi(apiClient);

export function storeSession(accessToken: string): void {
  storeAccessToken(accessToken);
}

export function redirectForRole(role: AuthenticatedUser['role'], accessToken: string): void {
  // Land on a concrete route — portal roots may server-redirect and strip ?accessToken=
  let target = studentDashboardUrl;
  switch (role) {
    case 'STUDENT':
      target = studentDashboardUrl;
      break;
    case 'INSTITUTION_ADMIN':
    case 'PLACEMENT_STAFF':
      target = `${tpoUrl}/batches`;
      break;
    case 'SUPER_ADMIN':
      target = `${adminUrl}/admin/health`;
      break;
  }
  window.location.href = buildPortalRedirectUrl(target, accessToken);
}

export { buildPortalRedirectUrl, studentUrl, studentDashboardUrl, tpoUrl, adminUrl };
