export type DefenseReplyAction =
  | { action: 'ask'; questionText: string }
  | { action: 'close_then_grade'; questionText: string | null }
  | { action: 'grade' };

/** Maps a defense reply to the next client step after the student submits a turn. */
export function resolveDefenseReplyAction(reply: {
  isFinalTurn: boolean;
  questionText: string | null;
  secondsRemaining: number;
}): DefenseReplyAction {
  const timeUp = reply.secondsRemaining <= 0;

  if (reply.isFinalTurn) {
    return { action: 'close_then_grade', questionText: reply.questionText };
  }

  if (timeUp || !reply.questionText) {
    return { action: 'grade' };
  }

  return { action: 'ask', questionText: reply.questionText };
}
