import {
  COMPANY_EMPLOYEE_COUNT_LABELS,
  UpdateCompanyProfileRequestSchema,
  type CompanyProfile,
  type UpdateCompanyProfileRequest,
} from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';

export const SOCIAL_NETWORKS = ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube'] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export interface ProfileFormState {
  displayName: string;
  website: string;
  industry: string;
  employeeCount: string;
  headquarters: string;
  additionalLocations: string[];
  about: string;
  /** One benefit per line. */
  benefitsText: string;
  social: Record<SocialNetwork, string>;
  logoFileId: string | null;
}

export function toFormState(profile: CompanyProfile): ProfileFormState {
  return {
    displayName: profile.displayName,
    website: profile.website ?? '',
    industry: profile.industry ?? '',
    employeeCount: profile.employeeCount ?? '',
    headquarters: profile.headquarters ?? '',
    additionalLocations: profile.additionalLocations,
    about: profile.about ?? '',
    benefitsText: profile.benefits.join('\n'),
    social: {
      linkedin: profile.socialLinks.linkedin ?? '',
      twitter: profile.socialLinks.twitter ?? '',
      facebook: profile.socialLinks.facebook ?? '',
      instagram: profile.socialLinks.instagram ?? '',
      youtube: profile.socialLinks.youtube ?? '',
    },
    logoFileId: null,
  };
}

/** Form → request body. Blank optional text becomes null; unchosen dropdowns are left out. */
export function toUpdateBody(form: ProfileFormState): UpdateCompanyProfileRequest {
  const socialLinks = Object.fromEntries(
    SOCIAL_NETWORKS.map((n) => [n, form.social[n].trim()] as const).filter(([, url]) => url),
  );
  return {
    displayName: form.displayName.trim(),
    website: form.website.trim() || null,
    about: form.about.trim() || null,
    benefits: form.benefitsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    socialLinks,
    ...(form.industry ? { industry: form.industry as never } : {}),
    ...(form.employeeCount ? { employeeCount: form.employeeCount as never } : {}),
    ...(form.headquarters.trim() ? { headquarters: form.headquarters.trim() } : {}),
    additionalLocations: form.additionalLocations.map((l) => l.trim()).filter(Boolean),
    ...(form.logoFileId ? { logoFileId: form.logoFileId } : {}),
  };
}

/** Client-side validation with the same Zod schema the server uses; keys are field paths. */
export function validateProfileBody(body: UpdateCompanyProfileRequest): Record<string, string> {
  const result = UpdateCompanyProfileRequestSchema.safeParse(body);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] ??= issue.message;
  }
  return errors;
}

/** Field errors from a server 422 (`details: [{ path, message }]`), or null for any other error. */
export function fieldErrorsFromError(error: unknown): Record<string, string> | null {
  if (!isSmartApiError(error) || error.statusCode !== 422 || error.details.length === 0) {
    return null;
  }
  const errors: Record<string, string> = {};
  for (const detail of error.details) errors[detail.path] ??= detail.message;
  return errors;
}

export function isVersionConflict(error: unknown): boolean {
  return isSmartApiError(error) && error.statusCode === 409 && error.code === 'version_conflict';
}

export const EMPLOYEE_COUNT_OPTIONS = Object.entries(COMPANY_EMPLOYEE_COUNT_LABELS).map(
  ([value, label]) => ({ value, label }),
);

/** New key for a submit; a retry of the same payload reuses it so the server never repeats the write. */
export function createKeyTracker(makeKey: () => string = () => crypto.randomUUID()) {
  let last: { fingerprint: string; key: string } | null = null;
  return {
    keyFor(fingerprint: string): string {
      if (!last || last.fingerprint !== fingerprint) last = { fingerprint, key: makeKey() };
      return last.key;
    },
    reset(): void {
      last = null;
    },
  };
}
