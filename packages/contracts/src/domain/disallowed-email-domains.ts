/**
 * Free / personal mailbox providers. Anywhere SMART needs a work email
 * (certificate endorsers, student registration, employer onboarding), an
 * address at one of these is rejected: anyone can create one, so it proves
 * nothing about the organization behind it. This is a denylist heuristic
 * (anything not on it is accepted), not an exhaustive allowlist of companies.
 */
export const FREE_MAIL_DOMAINS: readonly string[] = [
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

/** True for a free/personal mailbox domain, or an address with no domain at all. */
export function isFreeMailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return true;
  return FREE_MAIL_DOMAINS.includes(domain);
}

/** @deprecated Use `FREE_MAIL_DOMAINS`; kept so existing endorser imports keep working. */
export const DISALLOWED_ENDORSER_EMAIL_DOMAINS = FREE_MAIL_DOMAINS;

/** @deprecated Use `isFreeMailDomain`; kept so existing endorser imports keep working. */
export const isDisallowedEndorserEmailDomain = isFreeMailDomain;
