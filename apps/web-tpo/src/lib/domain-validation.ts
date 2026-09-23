/**
 * Validates whether a candidate email address belongs to the institution's locked domain
 * or any of its valid subdomains (e.g. `student@cs.psgtech.ac.in` for domain `psgtech.ac.in`).
 * Supports `localhost` domain for local development and testing.
 */
export function normalizeEmailDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@+/, '');
}

export function validateDomain(email: string, domain: string | null | undefined): boolean {
  if (!domain || !domain.trim()) return false;
  return validateInstitutionEmail(email, domain, []);
}

/** Primary domain plus optional extra verified domains (TPO settings). */
export function validateInstitutionEmail(
  email: string,
  primaryDomain: string | null | undefined,
  extraDomains: readonly string[],
): boolean {
  const domains = [
    ...(primaryDomain ? [normalizeEmailDomain(primaryDomain)] : []),
    ...extraDomains.map(normalizeEmailDomain).filter(Boolean),
  ];
  if (domains.length === 0) return false;

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@')) return false;
  const emailDomain = cleanEmail.split('@')[1];
  if (!emailDomain) return false;

  return domains.some((cleanDomain) => {
    if (cleanDomain === 'localhost') {
      return emailDomain === 'localhost' || emailDomain.endsWith('.localhost');
    }
    return emailDomain === cleanDomain || emailDomain.endsWith(`.${cleanDomain}`);
  });
}
