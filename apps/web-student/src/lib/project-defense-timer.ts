/** Timer props aligned with server session clock (same pattern as skill verify). */
export function projectDefenseTimerProps(session: {
  startedAt: string;
  maxDurationSeconds: number;
  secondsRemaining: number;
}) {
  const duration = session.maxDurationSeconds;
  const expires = Date.parse(session.startedAt) + duration * 1000;
  return {
    duration,
    startedAt: session.startedAt,
    serverNow: new Date(expires - session.secondsRemaining * 1000).toISOString(),
  };
}
