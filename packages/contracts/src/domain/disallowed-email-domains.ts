/**
 * Certificate endorsement requires a work email — a personal/free-provider
 * address is too easy for a candidate to control themselves and self-endorse.
 * This is a denylist heuristic (anything not on it is accepted), not an
 * exhaustive allowlist of real companies.
 */
export const DISALLOWED_ENDORSER_EMAIL_DOMAINS: readonly string[] = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'rediffmail.com',
  'rocketmail.com',
  'inbox.com',
  'fastmail.com',
  'tutanota.com',
];

export function isDisallowedEndorserEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return true;
  return DISALLOWED_ENDORSER_EMAIL_DOMAINS.includes(domain);
}
