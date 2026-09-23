function trimSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Auth portal login (web-auth). */
export function authLoginUrl(): string {
  const base = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';
  return `${trimSlash(base)}/login`;
}

/** Sign up: auth login with return to student onboarding. */
export function authSignUpUrl(): string {
  const login = authLoginUrl();
  const returnTo = `${studentAppUrl()}/onboarding`;
  return `${login}?returnTo=${encodeURIComponent(returnTo)}`;
}

/** Public certificate verification (web-verify). */
export function verifyHomeUrl(): string {
  const base = process.env.NEXT_PUBLIC_VERIFY_URL ?? 'http://localhost:3004';
  return trimSlash(base);
}

/** Student app entry (optional marketing CTA). */
export function studentAppUrl(): string {
  const base = process.env.NEXT_PUBLIC_STUDENT_URL ?? 'http://localhost:3001';
  return trimSlash(base);
}
