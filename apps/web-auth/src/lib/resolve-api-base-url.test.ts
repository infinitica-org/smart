import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveWebAuthApiBaseUrl } from './resolve-api-base-url';

describe('resolveWebAuthApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses same-origin proxy in dev when API URL is default localhost:3000', () => {
    vi.stubGlobal('window', {} as Window);
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000');
    expect(resolveWebAuthApiBaseUrl()).toBe('');
  });

  it('keeps explicit remote API URLs', () => {
    vi.stubGlobal('window', {} as Window);
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://dev.api.becomesmart.online');
    expect(resolveWebAuthApiBaseUrl()).toBe('https://dev.api.becomesmart.online');
  });
});
