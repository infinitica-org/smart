import { SmartApiClient, createSmartApi, getAccessToken } from '@smart/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken,
});

export const api = createSmartApi(apiClient);
