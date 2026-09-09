/** Product-tour state — small, self-contained, no server round-trip needed for any of it. */

const COMPLETED_KEY = 'smart.candidate.tour.completed';
const AUTOSTART_KEY = 'smart.candidate.tour.autostart';

/** Set right before leaving onboarding, so the dashboard knows to auto-start the tour once. */
export function markTourAutostart(): void {
  try {
    sessionStorage.setItem(AUTOSTART_KEY, '1');
  } catch {
    // Storage unavailable (private mode, etc.) — the tour simply won't auto-start.
  }
}

/** Reads and clears the autostart flag — a one-shot check, not a persistent state read. */
export function consumeTourAutostart(): boolean {
  try {
    const flagged = sessionStorage.getItem(AUTOSTART_KEY) !== null;
    if (flagged) sessionStorage.removeItem(AUTOSTART_KEY);
    return flagged;
  } catch {
    return false;
  }
}

export function hasTourCompleted(): boolean {
  try {
    return localStorage.getItem(COMPLETED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTourCompleted(): void {
  try {
    localStorage.setItem(COMPLETED_KEY, '1');
  } catch {
    // Non-fatal — worst case the tour offers to run again next visit.
  }
}

/** Lets "Take a tour" in the nav menu replay it regardless of completion state. */
export const START_TOUR_EVENT = 'smart:start-tour';

export function requestTourStart(): void {
  window.dispatchEvent(new Event(START_TOUR_EVENT));
}
