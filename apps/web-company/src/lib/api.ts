import {
  SmartApiClient,
  clearAccessToken,
  createRefreshAccessToken,
  createSmartApi,
  getAccessToken,
} from '@smart/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken: createRefreshAccessToken(() => api.auth.refresh()),
  onUnauthorized: () => {
    clearAccessToken();
    window.location.href = `${authUrl}/login`;
  },
});

export const api = createSmartApi(apiClient);
