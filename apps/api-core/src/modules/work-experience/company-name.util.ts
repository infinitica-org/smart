/**
 * Pure company-name/domain helpers shared between `WorkExperienceService` and
 * `OrganizationsService` (INF-07). Kept in their own module (not re-exported
 * only from `work-experience.service.ts`) because that file also imports
 * `OrganizationsService` for injection — having `organizations.service.ts`
 * import these from `work-experience.service.ts` created a circular require
 * that only broke at runtime (`ReferenceError: Cannot access
 * 'OrganizationsService' before initialization`), not at typecheck/test time.
 */

export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCompanyName(name: string | null | undefined): string {
  if (!name) return '';
  return normalizeText(name)
    .replace(/\b(pvt|private|ltd|limited|inc|incorporated|llp|corp|corporation|co|company)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractDomain(urlOrEmail: string | null | undefined): string | null {
  if (!urlOrEmail || typeof urlOrEmail !== 'string') return null;
  const trimmed = urlOrEmail.trim().toLowerCase();
  if (!trimmed) return null;

  let hostname = '';
  if (trimmed.includes('@')) {
    hostname = trimmed.split('@').pop() || '';
  } else {
    try {
      const withProtocol = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
      const url = new URL(withProtocol);
      hostname = url.hostname;
    } catch {
      const firstPart = trimmed.split('/')[0] || '';
      hostname = firstPart.split(':')[0] || '';
    }
  }

  hostname = hostname.replace(/^www\./, '').trim();
  return hostname || null;
}

export function validateEmployerDomain(
  verifierEmail: string | null | undefined,
  companyWebsite: string | null | undefined,
): {
  verifierDomain: string | null;
  companyDomain: string | null;
  domainMatch: boolean;
} {
  const verifierDomain = extractDomain(verifierEmail);
  const companyDomain = extractDomain(companyWebsite);

  if (!verifierDomain || !companyDomain) {
    return {
      verifierDomain,
      companyDomain,
      domainMatch: false,
    };
  }

  const domainMatch =
    verifierDomain === companyDomain ||
    verifierDomain.endsWith(`.${companyDomain}`) ||
    companyDomain.endsWith(`.${verifierDomain}`);

  return {
    verifierDomain,
    companyDomain,
    domainMatch,
  };
}
