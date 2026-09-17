import type { JobOpeningDto } from '@smart/contracts';

export type CampusCompanyRow = {
  companyName: string;
  openingCount: number;
  activeOpenings: number;
  lastEngagementAt: string;
  companyLogoUrl?: string;
  locations: string[];
};

/** Distinct recruiters on campus derived from real JobOpening rows — no seeded placeholders. */
export function aggregateCampusCompanies(openings: JobOpeningDto[]): CampusCompanyRow[] {
  const byName = new Map<string, CampusCompanyRow>();

  for (const opening of openings) {
    const key = opening.companyName.trim();
    if (!key) continue;

    const existing = byName.get(key);
    const location = opening.location?.trim();
    const createdAt = opening.createdAt;
    const isActive = opening.status === 'OPEN';

    if (!existing) {
      byName.set(key, {
        companyName: key,
        openingCount: 1,
        activeOpenings: isActive ? 1 : 0,
        lastEngagementAt: createdAt,
        companyLogoUrl: opening.companyLogoUrl,
        locations: location ? [location] : [],
      });
      continue;
    }

    existing.openingCount += 1;
    if (isActive) existing.activeOpenings += 1;
    if (createdAt > existing.lastEngagementAt) {
      existing.lastEngagementAt = createdAt;
      if (opening.companyLogoUrl) existing.companyLogoUrl = opening.companyLogoUrl;
    }
    if (location && !existing.locations.includes(location)) {
      existing.locations.push(location);
    }
  }

  return [...byName.values()].sort(
    (a, b) =>
      b.lastEngagementAt.localeCompare(a.lastEngagementAt) ||
      a.companyName.localeCompare(b.companyName),
  );
}
