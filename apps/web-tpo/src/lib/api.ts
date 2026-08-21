import { SmartApiClient, createSmartApi } from '@smart/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken: () => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem('smart.accessToken');
  },
});

export const api = createSmartApi(apiClient);
