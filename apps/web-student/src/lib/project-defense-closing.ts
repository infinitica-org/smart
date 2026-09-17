const CLOSING_HINT =
  /\b(thank you|thanks|conclud|clos(e|ing)|wrap up|enough for now|that'?s all|we'?re done)\b/i;

export const DEFENSE_INTERVIEW_CLOSING_MESSAGE =
  'Thank you for walking me through your project. I have enough for now — I am closing this interview and submitting your answers for review.';

export const DEFENSE_INTERVIEW_TIME_UP_CLOSING_MESSAGE =
  'We are out of time. Thank you for your answers — I am closing this interview now and submitting them for review.';

/** Spoken line before auto-grade when the examiner ends early or time runs out. */
export function resolveDefenseClosingAnnouncement(input: {
  isFinalTurn: boolean;
  questionText: string | null;
  secondsRemaining: number;
}): string {
  const timeUp = input.secondsRemaining <= 0;
  const fallback = timeUp
    ? DEFENSE_INTERVIEW_TIME_UP_CLOSING_MESSAGE
    : DEFENSE_INTERVIEW_CLOSING_MESSAGE;

  const examiner = input.questionText?.trim();
  if (!examiner) return fallback;

  if (input.isFinalTurn) {
    if (CLOSING_HINT.test(examiner)) return examiner;
    return `${examiner} ${fallback}`;
  }

  return fallback;
}
