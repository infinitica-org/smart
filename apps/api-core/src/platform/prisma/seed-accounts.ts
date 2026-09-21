export const DEFAULT_SEED_EMAIL_DOMAIN = 'smart.local';
export const DEFAULT_SEED_INSTITUTION_NAME = 'SMART Pilot Institute';
export const DEFAULT_SEED_TPO_FULL_NAME = 'Pilot TPO';
export const DEFAULT_SEED_PASSWORD = 'ChangeMe!Dev';

export function resolveSeedEmailDomain(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = env['SEED_EMAIL_DOMAIN']?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_SEED_EMAIL_DOMAIN;
}

export function resolveSeedPassword(env: Record<string, string | undefined> = process.env): string {
  const raw = env['SEED_PASSWORD']?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_SEED_PASSWORD;
}

export function resolveSeedInstitutionName(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = env['SEED_INSTITUTION_NAME']?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_SEED_INSTITUTION_NAME;
}

export function resolveSeedTpoFullName(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = env['SEED_TPO_FULL_NAME']?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_SEED_TPO_FULL_NAME;
}

export function seedAccountEmails(domain: string): {
  admin: string;
  tpo: string;
  student: string;
} {
  return {
    admin: `admin@${domain}`,
    tpo: `tpo@${domain}`,
    student: `student@${domain}`,
  };
}
