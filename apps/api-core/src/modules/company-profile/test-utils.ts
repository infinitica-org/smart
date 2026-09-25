/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';
import { IdempotencyService } from './idempotency.service.js';

/** In-memory idempotency ledger + a $transaction that runs against the same mock client. */
export function withIdempotencyLedger<T extends Record<string, unknown>>(base: T) {
  const records = new Map<string, { requestHash: string; responseBody: unknown }>();
  const id = (w: { userId_scope_key: { userId: string; scope: string; key: string } }) =>
    `${w.userId_scope_key.userId}|${w.userId_scope_key.scope}|${w.userId_scope_key.key}`;

  const prisma: any = {
    ...base,
    idempotencyRecord: {
      findUnique: vi.fn(async ({ where }: any) => records.get(id(where)) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const key = `${data.userId}|${data.scope}|${data.key}`;
        if (records.has(key)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        records.set(key, { requestHash: data.requestHash, responseBody: data.responseBody });
        return data;
      }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma, idempotency: new IdempotencyService(prisma), records };
}

export const IDS = {
  companyA: '11111111-1111-4111-8111-111111111111',
  companyB: '22222222-2222-4222-8222-222222222222',
  owner: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  owner2: 'a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2',
  recruiter: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  recruiter2: 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2',
  otherCompanyUser: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
} as const;
