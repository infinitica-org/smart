import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMPANY_ONBOARDING_SESSION_KEY,
  clearCompanyOnboardingSessionToken,
  readCompanyOnboardingSessionToken,
  writeCompanyOnboardingSessionToken,
} from './company-onboarding-session';

describe('company onboarding session storage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists and reads the opaque session token', () => {
    writeCompanyOnboardingSessionToken('abc123');
    expect(store.get(COMPANY_ONBOARDING_SESSION_KEY)).toBe('abc123');
    expect(readCompanyOnboardingSessionToken()).toBe('abc123');
  });

  it('clears stored token', () => {
    writeCompanyOnboardingSessionToken('abc123');
    clearCompanyOnboardingSessionToken();
    expect(readCompanyOnboardingSessionToken()).toBeNull();
  });
});
