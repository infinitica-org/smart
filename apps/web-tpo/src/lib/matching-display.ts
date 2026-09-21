import type { PotentialFit } from '@smart/contracts';

/** TPO-facing labels for ranker `potentialFit` bands (not certification tiers). */
export function potentialFitLabel(band: PotentialFit): string {
  switch (band) {
    case 'STRONG':
      return 'Strong fit for role';
    case 'MODERATE':
      return 'Good fit with some gaps';
    case 'STRETCH':
      return 'Partial fit — upskilling likely';
    default:
      return 'Fit summary';
  }
}
