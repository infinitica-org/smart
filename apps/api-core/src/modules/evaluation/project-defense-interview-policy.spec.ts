import { describe, expect, it } from 'vitest';
import {
  candidateDeniedProjectOwnership,
  resolveInterviewFinalTurn,
} from './project-defense-interview-policy.js';

describe('candidateDeniedProjectOwnership', () => {
  it('detects explicit project denial', () => {
    expect(candidateDeniedProjectOwnership("I didn't build this project")).toBe(true);
    expect(candidateDeniedProjectOwnership('no I did not do this project')).toBe(true);
  });

  it('does not treat feature-level phrasing as ownership denial', () => {
    expect(
      candidateDeniedProjectOwnership("I didn't make the websocket layer reliable at first"),
    ).toBe(false);
    expect(candidateDeniedProjectOwnership("I didn't do the UI, my teammate handled that")).toBe(
      false,
    );
  });
});

describe('resolveInterviewFinalTurn', () => {
  it('ignores examiner early close before minimum candidate turns', () => {
    expect(
      resolveInterviewFinalTurn({
        candidateTurnsSubmitted: 1,
        examinerWantsFinal: true,
        secondsRemaining: 500,
        lastCandidateText: 'I built the Redis ingest myself.',
      }),
    ).toBe(false);
  });

  it('allows early close after minimum candidate turns', () => {
    expect(
      resolveInterviewFinalTurn({
        candidateTurnsSubmitted: 3,
        examinerWantsFinal: true,
        secondsRemaining: 500,
        lastCandidateText: 'I built the Redis ingest myself.',
      }),
    ).toBe(true);
  });

  it('ends when time is up regardless of turn count', () => {
    expect(
      resolveInterviewFinalTurn({
        candidateTurnsSubmitted: 1,
        examinerWantsFinal: false,
        secondsRemaining: 0,
        lastCandidateText: 'Short answer.',
      }),
    ).toBe(true);
  });
});
