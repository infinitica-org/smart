import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../__fixtures__/hackerrank-profile.json',
);

const HackerrankProfileResponseSchema = z.object({
  model: z
    .object({
      badges: z
        .array(z.object({ badge_name: z.string(), level: z.string().optional() }))
        .optional(),
      skills: z
        .array(
          z.object({
            name: z.string(),
            total_solved: z.number().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

describe('HackerrankApiClient fixture', () => {
  it('parses golden HackerRank profile JSON', () => {
    const raw = JSON.parse(readFileSync(fixturePath, 'utf8'));
    const parsed = HackerrankProfileResponseSchema.parse(raw);
    expect(parsed.model?.skills?.length).toBeGreaterThan(0);
    expect(parsed.model?.badges?.[0]?.badge_name).toBe('Python');
  });
});
