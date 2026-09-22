import type { TenantEntitlementsDto, TenantVerificationStatus } from '@smart/contracts';

export type SchoolProfileOverrides = {
  tagline?: string;
  about?: string;
  website?: string;
  location?: string;
  careersEmail?: string;
};

export type SchoolPublicProfile = {
  institutionName: string;
  domain: string | null;
  verificationStatus: TenantVerificationStatus;
  candidateUsage: number;
  candidateCapacity: number | null;
  tagline: string;
  about: string;
  website: string | null;
  location: string | null;
  careersEmail: string | null;
};

export function defaultSchoolTagline(): string {
  return 'Verified careers · Trusted by employers';
}

export function defaultSchoolAbout(institutionName: string): string {
  return `${institutionName} partners with SMART to certify student readiness and connect verified talent with employers recruiting on campus.`;
}

function normalizeDomain(domain: string | undefined): string | null {
  const trimmed = domain?.trim().replace(/^@+/, '');
  return trimmed || null;
}

function defaultWebsite(domain: string | null): string | null {
  if (!domain) return null;
  return domain.startsWith('http') ? domain : `https://${domain}`;
}

function defaultCareersEmail(domain: string | null): string | null {
  if (!domain) return null;
  return `careers@${domain}`;
}

export function buildSchoolPublicProfile(
  entitlements: TenantEntitlementsDto,
  overrides?: SchoolProfileOverrides | null,
): SchoolPublicProfile {
  const institutionName = entitlements.institutionName?.trim() || 'Your institution';
  const domain = normalizeDomain(entitlements.domain);

  return {
    institutionName,
    domain,
    verificationStatus: entitlements.verificationStatus ?? 'APPROVED',
    candidateUsage: entitlements.candidateUsage ?? 0,
    candidateCapacity: entitlements.candidateCapacity ?? null,
    tagline: overrides?.tagline?.trim() || defaultSchoolTagline(),
    about: overrides?.about?.trim() || defaultSchoolAbout(institutionName),
    website: overrides?.website?.trim() || defaultWebsite(domain),
    location: overrides?.location?.trim() || null,
    careersEmail: overrides?.careersEmail?.trim() || defaultCareersEmail(domain),
  };
}

export function isInstitutionVerified(status: TenantVerificationStatus): boolean {
  return status === 'APPROVED';
}

export function overridesFromStored(stored: {
  tagline: string;
  about: string;
  website: string;
  location: string;
  careersEmail: string;
}): SchoolProfileOverrides {
  return {
    tagline: stored.tagline.trim() || undefined,
    about: stored.about.trim() || undefined,
    website: stored.website.trim() || undefined,
    location: stored.location.trim() || undefined,
    careersEmail: stored.careersEmail.trim() || undefined,
  };
}

export function emptyStoredFromEntitlements(entitlements: TenantEntitlementsDto | null): {
  tagline: string;
  about: string;
  website: string;
  location: string;
  careersEmail: string;
  logoDataUrl: string;
  bannerDataUrl: string;
} {
  const name = entitlements?.institutionName?.trim() || 'Your institution';
  const domain = entitlements?.domain?.trim().replace(/^@+/, '');
  return {
    tagline: defaultSchoolTagline(),
    about: defaultSchoolAbout(name),
    website: domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : '',
    location: '',
    careersEmail: domain ? `careers@${domain}` : '',
    logoDataUrl: '',
    bannerDataUrl: '',
  };
}
