import { describe, expect, it } from 'vitest';
import {
  isKnownConsentScope,
  isValidConsentScope,
  SIGNAL_CONSENT_SCOPES,
} from './signal-consent-scopes.js';

describe('signal-consent-scopes', () => {
  it('accepts registered GitHub onboarding scope', () => {
    expect(isValidConsentScope('GITHUB', 'github.onboarding.public_repos')).toBe(true);
  });

  it('rejects unknown scope for a source', () => {
    expect(isValidConsentScope('GITHUB', 'github.admin.override')).toBe(false);
  });

  it('rejects cross-source scope misuse', () => {
    expect(isValidConsentScope('LEETCODE', 'github.onboarding.public_repos')).toBe(false);
  });

  it('isKnownConsentScope covers every registered scope', () => {
    for (const scopes of Object.values(SIGNAL_CONSENT_SCOPES)) {
      for (const scope of scopes) {
        expect(isKnownConsentScope(scope)).toBe(true);
      }
    }
    expect(isKnownConsentScope('not.a.real.scope')).toBe(false);
  });
});
