import { describe, expect, it } from 'vitest';
import {
  DEFENSE_INTERVIEW_CLOSING_MESSAGE,
  DEFENSE_INTERVIEW_TIME_UP_CLOSING_MESSAGE,
  resolveDefenseClosingAnnouncement,
} from './project-defense-closing';

describe('resolveDefenseClosingAnnouncement', () => {
  it('uses the examiner closing line when it already signals wrap-up', () => {
    expect(
      resolveDefenseClosingAnnouncement({
        isFinalTurn: true,
        questionText: 'Thank you — we are concluding this interview.',
        secondsRemaining: 400,
      }),
    ).toBe('Thank you — we are concluding this interview.');
  });

  it('appends a clear closing notice when the final turn is still a substantive question', () => {
    const text = resolveDefenseClosingAnnouncement({
      isFinalTurn: true,
      questionText: 'Which part of the stack was hardest to apply?',
      secondsRemaining: 400,
    });
    expect(text).toContain('Which part of the stack');
    expect(text).toContain('closing this interview');
  });

  it('uses the default closing copy when the server ends with no follow-up question', () => {
    expect(
      resolveDefenseClosingAnnouncement({
        isFinalTurn: false,
        questionText: null,
        secondsRemaining: 0,
      }),
    ).toBe(DEFENSE_INTERVIEW_TIME_UP_CLOSING_MESSAGE);

    expect(
      resolveDefenseClosingAnnouncement({
        isFinalTurn: true,
        questionText: null,
        secondsRemaining: 120,
      }),
    ).toBe(DEFENSE_INTERVIEW_CLOSING_MESSAGE);
  });
});
