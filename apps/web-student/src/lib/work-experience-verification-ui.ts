import { isDisallowedEndorserEmailDomain } from '@smart/contracts';

/** Minimum wait before resending an active employer verification link (client guard). */
export const WORK_EXPERIENCE_RESEND_COOLDOWN_MS = 5 * 60 * 1000;

export function extractEmployerEmailDomain(urlOrEmail: string | null | undefined): string | null {
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

function employerDomainsMatch(verifierDomain: string, companyDomain: string): boolean {
  return (
    verifierDomain === companyDomain ||
    verifierDomain.endsWith(`.${companyDomain}`) ||
    companyDomain.endsWith(`.${verifierDomain}`)
  );
}

/** Client-side guard before dispatch — mirrors api-core sendEmployerVerification rules. */
export function validateVerifierEmailForEmployerSend(params: {
  verifierEmail: string;
  companyWebsite: string | null;
}): { valid: true } | { valid: false; message: string } {
  const email = params.verifierEmail.trim();
  if (!email) {
    return { valid: false, message: 'Verifier email is required.' };
  }

  if (isDisallowedEndorserEmailDomain(email)) {
    return {
      valid: false,
      message:
        'Use an official corporate work email — personal or free email providers cannot verify employment.',
    };
  }

  const companyWebsite = params.companyWebsite?.trim() || null;
  if (!companyWebsite) {
    return { valid: true };
  }

  const verifierDomain = extractEmployerEmailDomain(email);
  const companyDomain = extractEmployerEmailDomain(companyWebsite);
  if (verifierDomain && companyDomain && !employerDomainsMatch(verifierDomain, companyDomain)) {
    return {
      valid: false,
      message: `Manager email domain (${verifierDomain}) does not match employer domain (${companyDomain}). Please use your official company email.`,
    };
  }

  return { valid: true };
}
