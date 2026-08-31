import {
  SmartApiClient,
  buildPortalRedirectUrl,
  createRefreshAccessToken,
  createSmartApi,
  getAccessToken,
  portalHomeForRole,
  returnToForRole,
  storeAccessToken,
} from '@smart/api-client';
import type { AuthenticatedUser } from '@smart/contracts';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const studentUrl = process.env.NEXT_PUBLIC_STUDENT_URL ?? 'http://localhost:3001';
const tpoUrl = process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002';
const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3003';

const portalOrigins = { student: studentUrl, tpo: tpoUrl, admin: adminUrl };

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken: createRefreshAccessToken(() => api.auth.refresh()),
});
export const api = createSmartApi(apiClient);

export function storeSession(accessToken: string): void {
  storeAccessToken(accessToken);
}

export function redirectForRole(
  role: AuthenticatedUser['role'],
  accessToken: string,
  returnTo?: string | null,
): void {
  const target =
    returnToForRole(role, returnTo ?? null, portalOrigins) ??
    portalHomeForRole('STUDENT', portalOrigins) ??
    studentUrl;
  window.location.href = buildPortalRedirectUrl(target, accessToken);
}

export { buildPortalRedirectUrl, studentUrl, tpoUrl, adminUrl, portalOrigins };

export const studentDashboardUrl = `${studentUrl.replace(/\/$/u, '')}/dashboard`;
