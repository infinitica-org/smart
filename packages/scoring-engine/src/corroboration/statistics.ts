/**
 * Offline weight-learning statistics (pure, unwired to batch job in v1).
 *
 * Owner: Ramansh.
 */

/** Point-biserial correlation between a binary outcome and a continuous predictor. */
export function pointBiserial(
  outcomes: readonly boolean[],
  predictor: readonly number[],
): number | null {
  if (outcomes.length !== predictor.length || outcomes.length < 2) return null;

  const n = outcomes.length;
  const n1 = outcomes.filter(Boolean).length;
  const n0 = n - n1;
  if (n0 === 0 || n1 === 0) return null;

  let sum1 = 0;
  let sum0 = 0;
  let sumAll = 0;
  for (let i = 0; i < n; i++) {
    const value = predictor[i] ?? 0;
    sumAll += value;
    if (outcomes[i]) sum1 += value;
    else sum0 += value;
  }
  const m1 = sum1 / n1;
  const m0 = sum0 / n0;
  const mean = sumAll / n;

  let variance = 0;
  for (let i = 0; i < n; i++) {
    const diff = (predictor[i] ?? 0) - mean;
    variance += diff * diff;
  }
  const sd = Math.sqrt(variance / n);
  if (sd === 0) return null;

  return ((m1 - m0) / sd) * Math.sqrt((n1 * n0) / (n * n));
}

/** Area under ROC curve via trapezoidal rule on sorted scores. */
export function auc(outcomes: readonly boolean[], scores: readonly number[]): number | null {
  if (outcomes.length !== scores.length || outcomes.length < 2) return null;

  const pairs = outcomes.map((label, i) => ({ label, score: scores[i] ?? 0 }));
  pairs.sort((a, b) => b.score - a.score);

  const nPos = pairs.filter((p) => p.label).length;
  const nNeg = pairs.length - nPos;
  if (nPos === 0 || nNeg === 0) return null;

  let tp = 0;
  let fp = 0;
  let prevScore = Number.POSITIVE_INFINITY;
  let area = 0;
  let tprPrev = 0;
  let fprPrev = 0;

  for (const pair of pairs) {
    if (pair.score !== prevScore) {
      const tpr = tp / nPos;
      const fpr = fp / nNeg;
      area += ((fpr - fprPrev) * (tpr + tprPrev)) / 2;
      tprPrev = tpr;
      fprPrev = fpr;
      prevScore = pair.score;
    }
    if (pair.label) tp++;
    else fp++;
  }

  const tpr = tp / nPos;
  const fpr = fp / nNeg;
  area += ((fpr - fprPrev) * (tpr + tprPrev)) / 2;

  return area;
}
