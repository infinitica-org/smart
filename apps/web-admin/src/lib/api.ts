import {
  SmartApiClient,
  createRefreshAccessToken,
  createSmartApi,
  getAccessToken,
} from '@smart/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken: createRefreshAccessToken(() => api.auth.refresh()),
});

export const api = createSmartApi(apiClient);
