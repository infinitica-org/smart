import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEED_EMAIL_DOMAIN,
  DEFAULT_SEED_PASSWORD,
  resolveSeedEmailDomain,
  resolveSeedPassword,
  seedAccountEmails,
} from './seed-accounts.js';

describe('seed account env', () => {
  it('defaults dest-style domain and password when env is empty', () => {
    expect(resolveSeedEmailDomain({})).toBe(DEFAULT_SEED_EMAIL_DOMAIN);
    expect(resolveSeedPassword({})).toBe(DEFAULT_SEED_PASSWORD);
  });

  it('falls back when override is blank', () => {
    expect(resolveSeedEmailDomain({ SEED_EMAIL_DOMAIN: '   ' })).toBe(DEFAULT_SEED_EMAIL_DOMAIN);
    expect(resolveSeedPassword({ SEED_PASSWORD: '' })).toBe(DEFAULT_SEED_PASSWORD);
  });

  it('uses production domain and password from env', () => {
    expect(resolveSeedEmailDomain({ SEED_EMAIL_DOMAIN: 'becomesmart.online' })).toBe(
      'becomesmart.online',
    );
    expect(resolveSeedPassword({ SEED_PASSWORD: 'ProdOnly!Pass' })).toBe('ProdOnly!Pass');
  });

  it('builds the three login emails on that domain', () => {
    expect(seedAccountEmails('becomesmart.online')).toEqual({
      admin: 'admin@becomesmart.online',
      tpo: 'tpo@becomesmart.online',
      student: 'student@becomesmart.online',
    });
  });
});
