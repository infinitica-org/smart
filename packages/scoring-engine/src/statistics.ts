/**
 * Descriptive statistics primitives.
 *
 * Deliberately pure and dependency-free: no I/O, no `Date.now()`, no
 * randomness. That purity is what makes a tier reproducible two years later
 * when someone challenges a certificate.
 *
 * Owner: Ramansh.
 */

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Sample standard deviation (Bessel-corrected, n-1).
 *
 * Sample rather than population is correct here: a calibration panel of 3–5
 * practitioners is a *sample* of expert judgment, not the whole population of
 * possible judges. Using the population formula would understate sigma and
 * therefore publish a confidence band narrower than the evidence supports —
 * which would be exactly the kind of inflation SMART promises not to do.
 */
export function standardDeviation(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mu = mean(values);
  const sumSquares = values.reduce((sum, value) => sum + (value - mu) ** 2, 0);
  return Math.sqrt(sumSquares / (n - 1));
}

export function variance(values: readonly number[]): number {
  return standardDeviation(values) ** 2;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * The most frequently occurring value(s).
 *
 * Used for BARS **mode consensus**: the panel's anchor is the most commonly
 * agreed rating, not the average of ratings. Averaging behavioural anchors
 * destroys the specificity that makes them gradeable, so this is not
 * interchangeable with `mean`.
 */
export function modes<T extends string | number>(values: readonly T[]): readonly T[] {
  if (values.length === 0) return [];
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const max = Math.max(...counts.values());
  return [...counts.entries()].filter(([, count]) => count === max).map(([value]) => value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round to a fixed number of decimals without float drift surprises. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Pearson correlation. Returns 0 when either series has no variance. */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let numerator = 0;
  let sumDx2 = 0;
  let sumDy2 = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (xs[i] ?? 0) - mx;
    const dy = (ys[i] ?? 0) - my;
    numerator += dx * dy;
    sumDx2 += dx * dx;
    sumDy2 += dy * dy;
  }
  const denominator = Math.sqrt(sumDx2 * sumDy2);
  return denominator === 0 ? 0 : numerator / denominator;
}
