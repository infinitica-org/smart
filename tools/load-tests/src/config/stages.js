/**
 * Parses a `target:duration,target:duration,...` env var into k6 `stages`
 * (e.g. `"100:2m,500:3m,2000:5m"`) — one string, one place to override an
 * entire ramp shape without editing a test file.
 */
export function parseStages(envValue, fallback) {
  if (!envValue) return fallback;
  return envValue.split(',').map((pair) => {
    const [target, duration] = pair.split(':');
    if (!target || !duration || Number.isNaN(Number(target))) {
      throw new Error(
        `Invalid stage "${pair}" in stages env var — expected "target:duration", e.g. "500:3m"`,
      );
    }
    return { target: Number(target), duration };
  });
}
