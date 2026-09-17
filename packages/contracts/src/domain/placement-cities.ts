/** Shared Indian metro options for placement location pickers (student onboarding uses the same set). */
export const PLACEMENT_CITY_OPTIONS = [
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Mumbai',
  'Delhi NCR',
  'Kolkata',
  'Ahmedabad',
  'Kochi',
  'Coimbatore',
  'Remote / Anywhere',
] as const;

export type PlacementCity = (typeof PLACEMENT_CITY_OPTIONS)[number];
