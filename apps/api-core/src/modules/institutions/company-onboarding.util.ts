import { createHash, randomBytes, randomInt } from 'node:crypto';
import type {
  CompanyRepresentative,
  CompanySignupProfile,
  CompanyVerification,
} from '@smart/contracts';
import { env } from '../../platform/config/env.js';

export const EMAIL_VERIFICATION_TTL_MINUTES = 15;
export const EMAIL_RESEND_COOLDOWN_SECONDS = 60;

export type OnboardingDraftStore = {
  profile?: Partial<CompanySignupProfile>;
  verification?: Partial<CompanyVerification>;
};

export function generateOnboardingSessionToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashOnboardingSecret(raw) };
}

export function hashOnboardingSecret(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function onboardingSessionExpiresAt(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + env.INVITATION_TTL_DAYS);
  return expires;
}

export function generateEmailVerificationCode(): { raw: string; hash: string } {
  const raw = String(randomInt(100_000, 1_000_000));
  return { raw, hash: hashOnboardingSecret(raw) };
}

export function emailVerificationExpiresAt(): Date {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + EMAIL_VERIFICATION_TTL_MINUTES);
  return expires;
}

export function emailResendAvailableAt(lastSentAt: Date | null): Date {
  const base = lastSentAt ?? new Date(0);
  return new Date(base.getTime() + EMAIL_RESEND_COOLDOWN_SECONDS * 1000);
}

export function parseDraftStore(raw: unknown): OnboardingDraftStore {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const record = raw as Record<string, unknown>;
  if ('profile' in record || 'verification' in record) {
    return {
      profile: (record.profile as Partial<CompanySignupProfile> | undefined) ?? undefined,
      verification: (record.verification as Partial<CompanyVerification> | undefined) ?? undefined,
    };
  }
  return { profile: record as Partial<CompanySignupProfile> };
}

export function mergeDraftStore(
  existing: OnboardingDraftStore,
  patch: OnboardingDraftStore,
): OnboardingDraftStore {
  return {
    profile: patch.profile ? { ...existing.profile, ...patch.profile } : existing.profile,
    verification: patch.verification
      ? { ...existing.verification, ...patch.verification }
      : existing.verification,
  };
}

export function mergeRepresentativeSnapshot(
  existing: Partial<CompanyRepresentative> | null,
  patch: Partial<CompanyRepresentative> | undefined,
  workEmail: string,
): Partial<CompanyRepresentative> {
  const base = existing ?? { workEmail };
  if (!patch) return { ...base, workEmail };
  return { ...base, ...patch, workEmail };
}

export function formatCompanyLocation(profile: CompanySignupProfile): string {
  const parts = [profile.address.city, profile.address.stateProvince].filter(Boolean);
  return parts.join(', ').slice(0, 120);
}
