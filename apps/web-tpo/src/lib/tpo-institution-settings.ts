const EXTRA_DOMAINS_KEY = (institutionId: string) =>
  `smart:tpo:settings:${institutionId}:extraDomains`;
const AUTO_APPROVE_KEY = (institutionId: string) =>
  `smart:tpo:settings:${institutionId}:autoApproveInvites`;
const DISMISSED_EMPLOYERS_KEY = (institutionId: string) =>
  `smart:tpo:settings:${institutionId}:dismissedEmployers`;
const SCHOOL_PROFILE_KEY = (institutionId: string) =>
  `smart:tpo:settings:${institutionId}:schoolProfile`;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadExtraEmailDomains(institutionId: string): string[] {
  const list = readJson<string[]>(EXTRA_DOMAINS_KEY(institutionId), []);
  return [...new Set(list.map((d) => d.trim().toLowerCase()).filter(Boolean))];
}

export function saveExtraEmailDomains(institutionId: string, domains: string[]): void {
  writeJson(EXTRA_DOMAINS_KEY(institutionId), domains);
}

export function loadAutoApproveInvites(institutionId: string): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(AUTO_APPROVE_KEY(institutionId));
  if (raw === null) return true;
  return raw === 'true';
}

export function saveAutoApproveInvites(institutionId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTO_APPROVE_KEY(institutionId), enabled ? 'true' : 'false');
}

export function loadDismissedEmployerIds(institutionId: string): string[] {
  return readJson<string[]>(DISMISSED_EMPLOYERS_KEY(institutionId), []);
}

export function dismissEmployerFromQueue(institutionId: string, employerId: string): void {
  const current = loadDismissedEmployerIds(institutionId);
  if (current.includes(employerId)) return;
  writeJson(DISMISSED_EMPLOYERS_KEY(institutionId), [...current, employerId]);
}

export type StoredSchoolProfile = {
  tagline: string;
  about: string;
  website: string;
  location: string;
  careersEmail: string;
  logoDataUrl: string;
  bannerDataUrl: string;
};

export function loadSchoolPublicProfile(institutionId: string): StoredSchoolProfile | null {
  const saved = readJson<Partial<StoredSchoolProfile> | null>(
    SCHOOL_PROFILE_KEY(institutionId),
    null,
  );
  if (!saved) return null;
  return {
    tagline: saved.tagline ?? '',
    about: saved.about ?? '',
    website: saved.website ?? '',
    location: saved.location ?? '',
    careersEmail: saved.careersEmail ?? '',
    logoDataUrl: saved.logoDataUrl ?? '',
    bannerDataUrl: saved.bannerDataUrl ?? '',
  };
}

export function saveSchoolPublicProfile(institutionId: string, profile: StoredSchoolProfile): void {
  writeJson(SCHOOL_PROFILE_KEY(institutionId), profile);
}

export function isValidExtraDomainInput(value: string): boolean {
  const domain = value.trim().toLowerCase().replace(/^@+/, '');
  if (!domain || domain.includes('@') || domain.includes(' ')) return false;
  if (domain === 'localhost') return true;
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain);
}
