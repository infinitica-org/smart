import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertSafePublicUsername } from './username.util.js';

describe('assertSafePublicUsername', () => {
  it('accepts a plain username', () => {
    expect(assertSafePublicUsername('ada_lovelace', 'username')).toBe('ada_lovelace');
  });

  it('rejects URL schemes and path segments (SSRF)', () => {
    expect(() => assertSafePublicUsername('https://evil.com', 'username')).toThrow(
      BadRequestException,
    );
    expect(() => assertSafePublicUsername('user/name', 'username')).toThrow(BadRequestException);
    expect(() => assertSafePublicUsername('@handle', 'username')).toThrow(BadRequestException);
  });
});
