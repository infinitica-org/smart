import { clearAccessToken, getAccessToken, storeAccessToken } from '@smart/api-client';
import { api } from './api';

export async function loginWithPassword(email: string, password: string) {
  const result = await api.auth.login({ email: email.trim().toLowerCase(), password });
  if (result.accessToken) {
    storeAccessToken(result.accessToken);
  }
  return result;
}

export async function signOut() {
  try {
    await api.auth.logout();
  } catch {
    // Best effort server logout
  }
  clearAccessToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export async function getCurrentUser() {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const user = await api.auth.me();
    return user;
  } catch {
    return null;
  }
}
