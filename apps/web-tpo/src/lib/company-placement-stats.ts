import type { PlacementRecordDto } from '@smart/contracts';

export type YearlyPlacementStat = {
  year: string;
  placed: number;
  highestCtc: number | null;
  averageCtc: number | null;
};

export type CompanyPlacementStats = {
  totalPlaced: number;
  highestCtc: number | null;
  medianCtc: number | null;
  lowestCtc: number | null;
  averageCtc: number | null;
  yearly: YearlyPlacementStat[];
};

/** Only an accepted offer is a real placement — offered-but-declined is not. */
const PLACED_OUTCOME = 'ACCEPTED';

function yearOf(placementCycle: string): string {
  return placementCycle.split('-')[0] ?? placementCycle;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Every number the company placement-stats page shows, computed from the
 * `placement_records` rows for one company. CTC stats only ever consider
 * records with a package on file — a placement with no CTC recorded still
 * counts toward `totalPlaced`, just not toward the CTC figures.
 */
export function computeCompanyPlacementStats(records: PlacementRecordDto[]): CompanyPlacementStats {
  const placed = records.filter((record) => record.outcome === PLACED_OUTCOME);
  const allCtc = placed
    .map((record) => record.offeredPackageLpa)
    .filter((value): value is number => value !== null);

  const byYear = new Map<string, PlacementRecordDto[]>();
  for (const record of placed) {
    const year = yearOf(record.placementCycle);
    const bucket = byYear.get(year) ?? [];
    bucket.push(record);
    byYear.set(year, bucket);
  }

  const yearly: YearlyPlacementStat[] = [...byYear.entries()]
    .map(([year, rows]) => {
      const ctcValues = rows
        .map((row) => row.offeredPackageLpa)
        .filter((value): value is number => value !== null);
      return {
        year,
        placed: rows.length,
        highestCtc: ctcValues.length > 0 ? Math.max(...ctcValues) : null,
        averageCtc: average(ctcValues),
      };
    })
    .sort((a, b) => b.year.localeCompare(a.year));

  return {
    totalPlaced: placed.length,
    highestCtc: allCtc.length > 0 ? Math.max(...allCtc) : null,
    medianCtc: median(allCtc),
    lowestCtc: allCtc.length > 0 ? Math.min(...allCtc) : null,
    averageCtc: average(allCtc),
    yearly,
  };
}
