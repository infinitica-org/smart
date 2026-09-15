/**
 * Browser calls in local dev go through the Next.js `/api/v1` rewrite (same origin)
 * so login works even when api-core is on :3000 and web-auth is on :3005.
 */
export function resolveWebAuthApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/u, '') ?? '';
  const isDev = process.env.NODE_ENV === 'development';

  if (typeof window !== 'undefined' && isDev) {
    if (!configured || /^https?:\/\/(localhost|127\.0\.0\.1):3000$/u.test(configured)) {
      return '';
    }
  }

  return configured || 'http://localhost:3000';
}
