/**
 * Validates whether a candidate email address belongs to the institution's locked domain
 * or any of its valid subdomains (e.g. `student@cs.psgtech.ac.in` for domain `psgtech.ac.in`).
 * Supports `localhost` domain for local development and testing.
 */
export function validateDomain(email: string, domain: string | null | undefined): boolean {
  if (!domain || !domain.trim()) return false;
  const cleanEmail = email.trim().toLowerCase();
  const cleanDomain = domain.trim().toLowerCase().replace(/^@/, '');
  if (!cleanEmail.includes('@')) return false;

  const emailDomain = cleanEmail.split('@')[1];
  if (!emailDomain) return false;

  if (cleanDomain === 'localhost') {
    return emailDomain === 'localhost' || emailDomain.endsWith('.localhost');
  }

  return emailDomain === cleanDomain || emailDomain.endsWith(`.${cleanDomain}`);
}
