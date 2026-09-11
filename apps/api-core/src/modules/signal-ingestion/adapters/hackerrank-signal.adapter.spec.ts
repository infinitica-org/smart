import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { HackerrankApiClient } from '../clients/hackerrank-api.client.js';
import { HackerrankSignalAdapter } from './hackerrank-signal.adapter.js';

describe('HackerrankSignalAdapter', () => {
  const client = {
    probeProfileExists: vi.fn().mockResolvedValue(true),
    fetchProfile: vi.fn().mockResolvedValue({
      badges: [],
      contestRatings: [],
      solvedByTag: [{ tag: 'Python', count: 5, difficulty: 'UNKNOWN' as const }],
    }),
  } as unknown as HackerrankApiClient;

  const adapter = new HackerrankSignalAdapter(client);

  it('rejects unsafe usernames (SSRF)', async () => {
    await expect(
      adapter.validateConnectInput({ hackerrankUsername: 'https://evil.com' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates a plain username', async () => {
    const result = await adapter.validateConnectInput({ hackerrankUsername: 'ada_hr' });
    expect(result.externalAccountId).toBe('ada_hr');
    expect(result.consentScope).toBe('hackerrank.profile.public');
  });
});
