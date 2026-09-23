import { applicationsApi, openingsApi } from './api';

const MAX_OPENINGS = 20;

/** Sum application rows across the first N institution openings (TPO dashboard / reports). */
export async function countInstitutionPlacementApplications(): Promise<{
  total: number;
  byOpeningId: Map<string, number>;
}> {
  const { openings } = await openingsApi.list().catch(() => ({ openings: [] }));
  const slice = openings.slice(0, MAX_OPENINGS);
  const byOpeningId = new Map<string, number>();

  if (slice.length === 0) {
    return { total: 0, byOpeningId };
  }

  const lists = await Promise.all(
    slice.map((opening) =>
      applicationsApi.listForOpening(opening.openingId).catch(() => ({ applications: [] })),
    ),
  );

  let total = 0;
  slice.forEach((opening, index) => {
    const count = lists[index]?.applications.length ?? 0;
    byOpeningId.set(opening.openingId, count);
    total += count;
  });

  return { total, byOpeningId };
}
