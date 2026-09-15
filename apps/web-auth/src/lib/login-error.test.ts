import { describe, expect, it } from 'vitest';
import { SmartApiError, SmartNetworkError } from '@smart/api-client';
import { formatLoginError } from './login-error';

describe('formatLoginError', () => {
  it('maps unauthorized API errors to a credential message', () => {
    const err = new SmartApiError({
      error: 'unauthorized',
      message: 'Email or password is incorrect.',
      statusCode: 401,
    });
    expect(formatLoginError(err)).toMatch(/incorrect/i);
  });

  it('surfaces network failures with an API startup hint', () => {
    expect(formatLoginError(new SmartNetworkError('timeout'))).toMatch(/api-core/i);
  });
});
