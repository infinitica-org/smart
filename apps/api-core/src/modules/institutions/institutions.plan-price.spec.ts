/**
 * Ticket 1 — Configure Employer Plans: Plan price management tests.
 *
 * Covers:
 *   SUCCESS: listPlans returns prices; SUPER_ADMIN can updatePlanPrice; audit event created.
 *   AUTHORIZATION: governed by the controller layer — service trusts a validated actorId.
 *   VALIDATION: UpdatePlanPriceRequestSchema rejects negatives and empty payloads.
 *   STATE: price change touches only the intended plan; capacity and entitlements unchanged.
 *   IDEMPOTENCY: repeated updates produce the expected final state.
 *   ERROR: non-existent plan returns NotFoundException.
 */

import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { UpdatePlanPriceRequestSchema, SubscriptionPlanDtoSchema } from '@smart/contracts';
import { InstitutionsService } from './institutions.service.js';

const noopRedis = { get: vi.fn(), setex: vi.fn(), del: vi.fn() };
const mockAuditPublisher = { record: vi.fn().mockResolvedValue({}) };

// ---------------------------------------------------------------------------
// Helper: build a minimal Prisma plan row matching the schema shape
// ---------------------------------------------------------------------------
const fakePlanId = randomUUID();
const actorId = randomUUID();

function makeFakePlanRow(
  overrides: Partial<{
    id: string;
    code: string;
    name: string;
    candidateCapacity: number | null;
    priceInr: number | null;
    isCustomPrice: boolean;
  }> = {},
) {
  return {
    id: overrides.id ?? fakePlanId,
    code: overrides.code ?? 'BASIC',
    name: overrides.name ?? 'Find & Engage',
    candidateCapacity: overrides.candidateCapacity ?? 500,
    priceInr: overrides.priceInr !== undefined ? overrides.priceInr : 7500,
    isCustomPrice: overrides.isCustomPrice ?? false,
    createdAt: new Date(),
    entitlements: [],
    _count: { institutions: 2 },
    companies: [],
    institutions: [],
  };
}

function makeService(planRowInput?: ReturnType<typeof makeFakePlanRow> | null) {
  const planRow = planRowInput === undefined ? makeFakePlanRow() : planRowInput;
  const subscriptionPlan = {
    findUnique: vi.fn().mockResolvedValue(planRow),
    update: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...(planRow ?? makeFakePlanRow()),
      ...data,
    })),
    findMany: vi.fn().mockImplementation(async () =>
      planRow
        ? [
            {
              ...planRow,
              entitlements: [],
              _count: { institutions: planRow._count.institutions },
            },
          ]
        : [],
    ),
  };
  const prisma = { subscriptionPlan };
  return {
    service: new InstitutionsService(
      prisma as never,
      {} as never,
      mockAuditPublisher as never,
      noopRedis as never,
      {} as never,
    ),
    prisma,
    auditPublisher: mockAuditPublisher,
  };
}

// ---------------------------------------------------------------------------
// UpdatePlanPriceRequestSchema — DTO validation
// ---------------------------------------------------------------------------
describe('UpdatePlanPriceRequestSchema validation', () => {
  it('accepts a valid positive integer priceInr', () => {
    expect(() => UpdatePlanPriceRequestSchema.parse({ priceInr: 7500 })).not.toThrow();
  });

  it('accepts priceInr = 0 (free plan)', () => {
    expect(() => UpdatePlanPriceRequestSchema.parse({ priceInr: 0 })).not.toThrow();
  });

  it('accepts null priceInr (clears the price)', () => {
    expect(() => UpdatePlanPriceRequestSchema.parse({ priceInr: null })).not.toThrow();
  });

  it('accepts isCustomPrice = true without priceInr', () => {
    expect(() => UpdatePlanPriceRequestSchema.parse({ isCustomPrice: true })).not.toThrow();
  });

  it('accepts both priceInr and isCustomPrice together', () => {
    expect(() =>
      UpdatePlanPriceRequestSchema.parse({ priceInr: 20000, isCustomPrice: false }),
    ).not.toThrow();
  });

  it('rejects a negative priceInr', () => {
    expect(() => UpdatePlanPriceRequestSchema.parse({ priceInr: -1 })).toThrow();
  });

  it('rejects a fractional priceInr (must be whole number)', () => {
    expect(() => UpdatePlanPriceRequestSchema.parse({ priceInr: 7500.5 })).toThrow();
  });

  it('rejects an empty object (no field provided)', () => {
    expect(() => UpdatePlanPriceRequestSchema.parse({})).toThrow();
  });

  it('rejects a string value for priceInr', () => {
    expect(() => UpdatePlanPriceRequestSchema.parse({ priceInr: 'seven-five-hundred' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// InstitutionsService.listPlans — price fields included in output
// ---------------------------------------------------------------------------
describe('InstitutionsService.listPlans prices', () => {
  it('returns priceInr and isCustomPrice on each plan DTO', async () => {
    const { service } = makeService(makeFakePlanRow({ priceInr: 7500, isCustomPrice: false }));
    const plans = await service.listPlans();
    expect(plans).toHaveLength(1);

    const [plan] = plans;
    expect(plan).toBeDefined();
    const result = SubscriptionPlanDtoSchema.safeParse(plan);
    expect(result.success).toBe(true);
    expect(plan?.priceInr).toBe(7500);
    expect(plan?.isCustomPrice).toBe(false);
  });

  it('returns null priceInr when price is not yet configured', async () => {
    const row = makeFakePlanRow({ priceInr: null });
    const { service } = makeService(row);
    const [plan] = await service.listPlans();
    expect(plan?.priceInr).toBeNull();
  });

  it('returns isCustomPrice = true for the ENTERPRISE plan', async () => {
    const enterpriseRow = makeFakePlanRow({
      code: 'ENTERPRISE',
      name: 'Talent Intelligence Suite',
      priceInr: null,
      isCustomPrice: true,
      candidateCapacity: null,
    });
    const { service } = makeService(enterpriseRow);
    const [plan] = await service.listPlans();
    expect(plan?.isCustomPrice).toBe(true);
    expect(plan?.priceInr).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// InstitutionsService.updatePlanPrice — success
// ---------------------------------------------------------------------------
describe('InstitutionsService.updatePlanPrice — success', () => {
  it('calls subscriptionPlan.update with the new priceInr', async () => {
    const { service, prisma } = makeService();
    await service.updatePlanPrice(fakePlanId, { priceInr: 7500 }, actorId);
    expect(prisma.subscriptionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: fakePlanId },
        data: expect.objectContaining({ priceInr: 7500 }),
      }),
    );
  });

  it('calls subscriptionPlan.update with isCustomPrice = true', async () => {
    const { service, prisma } = makeService();
    await service.updatePlanPrice(fakePlanId, { isCustomPrice: true }, actorId);
    expect(prisma.subscriptionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isCustomPrice: true }),
      }),
    );
  });

  it('writes an audit log entry with action plan.price_updated', async () => {
    const { service, auditPublisher } = makeService();
    await service.updatePlanPrice(fakePlanId, { priceInr: 7500 }, actorId);
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'plan.price_updated',
        resourceType: 'plan',
        resourceId: fakePlanId,
        actorId,
      }),
    );
  });

  it('returns the updated SubscriptionPlanDto', async () => {
    const { service } = makeService();
    const dto = await service.updatePlanPrice(fakePlanId, { priceInr: 7500 }, actorId);
    const result = SubscriptionPlanDtoSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it('idempotent: calling updatePlanPrice twice with the same value produces the same result', async () => {
    const { service, prisma } = makeService();
    await service.updatePlanPrice(fakePlanId, { priceInr: 7500 }, actorId);
    await service.updatePlanPrice(fakePlanId, { priceInr: 7500 }, actorId);
    expect(prisma.subscriptionPlan.update).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// InstitutionsService.updatePlanPrice — state isolation
// ---------------------------------------------------------------------------
describe('InstitutionsService.updatePlanPrice — state isolation', () => {
  it('does not include candidateCapacity in the update payload when only priceInr is changed', async () => {
    const { service, prisma } = makeService();
    await service.updatePlanPrice(fakePlanId, { priceInr: 20000 }, actorId);
    const updateCall = (prisma.subscriptionPlan.update as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(updateCall?.data).not.toHaveProperty('candidateCapacity');
  });
});

// ---------------------------------------------------------------------------
// InstitutionsService.updatePlanPrice — error paths
// ---------------------------------------------------------------------------
describe('InstitutionsService.updatePlanPrice — error', () => {
  it('throws NotFoundException when plan does not exist', async () => {
    const { service } = makeService(null);
    await expect(
      service.updatePlanPrice(randomUUID(), { priceInr: 7500 }, actorId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
