import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { SubscriptionPlanDto } from '@smart/contracts';
import { PlansController } from './plans.controller.js';
import type { InstitutionsService } from './institutions.service.js';
import { ROLES_KEY } from '../../common/guards/roles.decorator.js';

describe('PlansController', () => {
  const mockPlans: SubscriptionPlanDto[] = [
    {
      planId: '11111111-1111-4111-8111-111111111111',
      code: 'FREE',
      name: 'Get Started',
      candidateCapacity: 100,
      priceInr: 0,
      isCustomPrice: false,
    },
    {
      planId: '22222222-2222-4222-8222-222222222222',
      code: 'BASIC',
      name: 'Find & Engage',
      candidateCapacity: 500,
      priceInr: 7500,
      isCustomPrice: false,
    },
    {
      planId: '33333333-3333-4333-8333-333333333333',
      code: 'PRO',
      name: 'Build Talent Pipelines',
      candidateCapacity: null,
      priceInr: 20000,
      isCustomPrice: false,
    },
    {
      planId: '44444444-4444-4444-8444-444444444444',
      code: 'ENTERPRISE',
      name: 'Talent Intelligence Suite',
      candidateCapacity: null,
      priceInr: null,
      isCustomPrice: true,
    },
  ];

  function createController(
    listPlansResult: Promise<SubscriptionPlanDto[]> = Promise.resolve(mockPlans),
  ) {
    const service = {
      listPlans: vi.fn().mockImplementation(() => listPlansResult),
    } as unknown as InstitutionsService;

    const controller = new PlansController(service);
    return { controller, service };
  }

  it('delegates to InstitutionsService.listPlans and returns all plans', async () => {
    const { controller, service } = createController();
    const result = await controller.listPlans();

    expect(service.listPlans).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      planId: '11111111-1111-4111-8111-111111111111',
      code: 'FREE',
      name: 'Get Started',
      candidateCapacity: 100,
      priceInr: 0,
      isCustomPrice: false,
    });
    expect(result[3]).toEqual({
      planId: '44444444-4444-4444-8444-444444444444',
      code: 'ENTERPRISE',
      name: 'Talent Intelligence Suite',
      candidateCapacity: null,
      priceInr: null,
      isCustomPrice: true,
    });
  });

  it('declares mandatory employer role protection', () => {
    const reflector = new Reflector();
    const roles = reflector.get<string[]>(ROLES_KEY, PlansController);

    expect(roles).toBeDefined();
    expect(roles).toContain('COMPANY');
    expect(roles).toContain('INSTITUTION_ADMIN');
    expect(roles).toContain('PLACEMENT_STAFF');
    expect(roles).toContain('SUPER_ADMIN');
    expect(roles).not.toContain('STUDENT');
  });

  it('propagates service exceptions without mutating state', async () => {
    const failure = Promise.reject(new Error('Database unavailable'));
    const { controller } = createController(failure);

    await expect(controller.listPlans()).rejects.toThrow('Database unavailable');
  });
});
