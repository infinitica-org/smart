import { describe, expect, it } from 'vitest';
import { authAppReturnToPath } from './return-to';

describe('authAppReturnToPath', () => {
  it('accepts same-app relative paths', () => {
    expect(authAppReturnToPath('/change-password')).toBe('/change-password');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(authAppReturnToPath('http://evil.example/phish')).toBeNull();
    expect(authAppReturnToPath('//evil.example/phish')).toBeNull();
  });
});
