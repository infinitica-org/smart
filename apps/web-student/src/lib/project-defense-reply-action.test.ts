import { describe, expect, it } from 'vitest';
import { resolveDefenseReplyAction } from './project-defense-reply-action';

describe('resolveDefenseReplyAction', () => {
  it('plays the closing line then grades when the examiner ends the interview', () => {
    expect(
      resolveDefenseReplyAction({
        isFinalTurn: true,
        questionText: 'Thank you — we are concluding this interview.',
        secondsRemaining: 400,
      }),
    ).toEqual({
      action: 'close_then_grade',
      questionText: 'Thank you — we are concluding this interview.',
    });
  });

  it('grades immediately when time is up with no follow-up question', () => {
    expect(
      resolveDefenseReplyAction({
        isFinalTurn: false,
        questionText: null,
        secondsRemaining: 0,
      }),
    ).toEqual({ action: 'grade' });
  });

  it('continues the interview with another question', () => {
    expect(
      resolveDefenseReplyAction({
        isFinalTurn: false,
        questionText: 'How did you handle websocket reconnects?',
        secondsRemaining: 500,
      }),
    ).toEqual({
      action: 'ask',
      questionText: 'How did you handle websocket reconnects?',
    });
  });
});
