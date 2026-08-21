/**
 * Item Response Theory — 2-parameter logistic model.
 *
 * PHASE 2, NOT V1. Adaptive IRT testing is explicitly deferred
 * (ARCHITECTURE.md §17), because calibrating discrimination and difficulty
 * parameters needs response data we will not have until several cohorts have
 * run.
 *
 * It lives here now, pure and tested, so that:
 *   1. the item-bank schema can already carry the parameters, and
 *   2. turning adaptive delivery on later is a delivery change, not a rewrite.
 *
 * Do not wire this into scoring for v1 — L1 uses weighted item scoring.
 *
 * Owner: Ramansh.
 */

export interface IrtItemParameters {
  readonly itemId: string;
  /** a — discrimination. How sharply the item separates ability levels. */
  readonly discrimination: number;
  /** b — difficulty, on the same logit scale as ability theta. */
  readonly difficulty: number;
}

/**
 * P(correct | theta) under the 2PL model:
 *
 *     P = 1 / (1 + exp(-a * (theta - b)))
 */
export function probabilityCorrect(theta: number, item: IrtItemParameters): number {
  const exponent = -item.discrimination * (theta - item.difficulty);
  return 1 / (1 + Math.exp(exponent));
}

/** Fisher information contributed by one item at a given ability. */
export function itemInformation(theta: number, item: IrtItemParameters): number {
  const p = probabilityCorrect(theta, item);
  return item.discrimination ** 2 * p * (1 - p);
}

export function testInformation(theta: number, items: readonly IrtItemParameters[]): number {
  return items.reduce((total, item) => total + itemInformation(theta, item), 0);
}

/** Standard error of the ability estimate at a given theta. */
export function standardErrorOfTheta(theta: number, items: readonly IrtItemParameters[]): number {
  const information = testInformation(theta, items);
  return information > 0 ? 1 / Math.sqrt(information) : Number.POSITIVE_INFINITY;
}

/**
 * Maximum-likelihood ability estimate via Newton-Raphson.
 *
 * Returns null when the response pattern is all-correct or all-incorrect: the
 * likelihood has no interior maximum there, and returning a fabricated theta
 * would be worse than admitting the pattern is uninformative.
 */
export function estimateAbility(
  responses: readonly { readonly item: IrtItemParameters; readonly correct: boolean }[],
  options: { readonly maxIterations?: number; readonly tolerance?: number } = {},
): number | null {
  const maxIterations = options.maxIterations ?? 50;
  const tolerance = options.tolerance ?? 1e-5;

  if (responses.length === 0) return null;
  const correctCount = responses.filter((response) => response.correct).length;
  if (correctCount === 0 || correctCount === responses.length) return null;

  let theta = 0;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let firstDerivative = 0;
    let secondDerivative = 0;

    for (const { item, correct } of responses) {
      const p = probabilityCorrect(theta, item);
      firstDerivative += item.discrimination * ((correct ? 1 : 0) - p);
      secondDerivative -= item.discrimination ** 2 * p * (1 - p);
    }

    if (secondDerivative === 0) break;

    const step = firstDerivative / secondDerivative;
    theta -= step;

    // Keep theta inside the range where the logistic model is meaningful; a
    // runaway estimate is a sign of bad parameters, not of a genius candidate.
    theta = Math.min(Math.max(theta, -4), 4);

    if (Math.abs(step) < tolerance) break;
  }

  return theta;
}

/**
 * Select the next item that maximises information at the current ability
 * estimate — the core of adaptive delivery.
 */
export function selectMostInformativeItem(
  theta: number,
  candidates: readonly IrtItemParameters[],
  alreadyAdministered: ReadonlySet<string>,
): IrtItemParameters | null {
  let best: IrtItemParameters | null = null;
  let bestInformation = -1;

  for (const item of candidates) {
    if (alreadyAdministered.has(item.itemId)) continue;
    const information = itemInformation(theta, item);
    if (information > bestInformation) {
      bestInformation = information;
      best = item;
    }
  }

  return best;
}

/** Map a theta estimate onto the 0–100 scale used elsewhere in SMART. */
export function thetaToPercentile(theta: number): number {
  // Normal CDF approximation; theta is conventionally ~ N(0, 1).
  const z = theta / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  const signedErf = z >= 0 ? erf : -erf;
  return Math.min(100, Math.max(0, 50 * (1 + signedErf)));
}
