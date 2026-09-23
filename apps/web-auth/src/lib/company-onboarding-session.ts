export const COMPANY_ONBOARDING_SESSION_KEY = 'smart:company-onboarding:session-token';

export function readCompanyOnboardingSessionToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(COMPANY_ONBOARDING_SESSION_KEY);
  return raw && raw.length > 0 ? raw : null;
}

export function writeCompanyOnboardingSessionToken(sessionToken: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(COMPANY_ONBOARDING_SESSION_KEY, sessionToken);
}

export function clearCompanyOnboardingSessionToken(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(COMPANY_ONBOARDING_SESSION_KEY);
}
