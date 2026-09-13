import { describe, expect, it } from 'vitest';
import { SmartApiError, SmartNetworkError } from '@smart/api-client';
import type { SkillVerifySessionDto } from '@smart/contracts';
import {
  areAllSkillVerifyItemsAnswered,
  isSkillVerifyAnswered,
  skillVerifyErrorFromUnknown,
  skillVerifyIncompleteError,
} from './skill-verify-errors';

function session(items: SkillVerifySessionDto['items']): SkillVerifySessionDto {
  return {
    sessionId: '55555555-5555-4555-8555-555555555555',
    claimId: '44444444-4444-4444-8444-444444444444',
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    proficiency: 'BEGINNER',
    timeMinutes: 30,
    passMarkPercent: 70,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    serverRemainingSeconds: 1800,
    items,
    answers: [],
  };
}

describe('skillVerifyErrorFromUnknown', () => {
  it('maps provider failures to a friendly generation message', () => {
    const mapped = skillVerifyErrorFromUnknown(
      new SmartApiError({
        error: 'skill_form_unavailable',
        message: 'Skill form could not be generated.',
        statusCode: 502,
      }),
      'generate',
    );
    expect(mapped.kind).toBe('generation_failed');
    expect(mapped.title).toBe('Assessment unavailable');
    expect(mapped.message).not.toContain('API key');
  });

  it('sanitizes technical gateway errors', () => {
    const mapped = skillVerifyErrorFromUnknown(
      new Error('Anthropic API key has expired'),
      'generate',
    );
    expect(mapped.kind).toBe('generation_failed');
    expect(mapped.message).not.toMatch(/anthropic|api key/i);
  });

  it('maps network failures separately from server errors', () => {
    const mapped = skillVerifyErrorFromUnknown(new SmartNetworkError('offline'), 'save');
    expect(mapped.kind).toBe('network');
    expect(mapped.title).toBe('Connection lost');
  });

  it('maps login-required responses', () => {
    const mapped = skillVerifyErrorFromUnknown(
      new SmartApiError({ error: 'token_expired', message: 'expired', statusCode: 401 }),
      'prepare',
    );
    expect(mapped.kind).toBe('login_required');
  });
});

describe('skill verify answer completeness', () => {
  it('treats whitespace-only text as unanswered', () => {
    expect(isSkillVerifyAnswered({ text: '   ' })).toBe(false);
    expect(isSkillVerifyAnswered({ selectedKey: 'A' })).toBe(true);
  });

  it('requires every item to be answered before submit', () => {
    const live = session([
      {
        index: 1,
        format: 'MCQ',
        prompt: 'One',
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
      },
      {
        index: 2,
        format: 'SCENARIO',
        prompt: 'Two',
        options: null,
      },
    ]);
    expect(areAllSkillVerifyItemsAnswered(live, { 1: { selectedKey: 'A' } })).toBe(false);
    expect(
      areAllSkillVerifyItemsAnswered(live, {
        1: { selectedKey: 'A' },
        2: { text: 'Done' },
      }),
    ).toBe(true);
  });

  it('returns a client-side incomplete submit error', () => {
    const err = skillVerifyIncompleteError();
    expect(err.kind).toBe('incomplete');
    expect(err.message).toMatch(/every question/i);
  });
});
