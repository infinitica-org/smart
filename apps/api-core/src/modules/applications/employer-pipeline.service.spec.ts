import { TransitionApplicationRequestSchema } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDS } from '../company-profile/test-utils.js';
import { EmployerPipelineService } from './employer-pipeline.service.js';

const APP = '99999999-9999-4999-8999-999999999999';
const body = (over: Record<string, unknown> = {}) =>
  TransitionApplicationRequestSchema.parse({
    toStatus: 'REVIEWING',
    expectedFromStatus: 'APPLIED',
    ...over,
  });

describe('EmployerPipelineService (Th6-414)', () => {
  let actor: any;
  let hiring: any;
  let service: EmployerPipelineService;

  beforeEach(() => {
    actor = { role: 'COMPANY', companyId: IDS.companyA, companyRole: 'OWNER', deactivatedAt: null };
    hiring = { transition: vi.fn(async () => ({ applicationId: APP })) };
    service = new EmployerPipelineService(
      { user: { findUnique: vi.fn(async () => actor) } } as never,
      hiring,
    );
  });

  it("moves a candidate as an EMPLOYER scoped to the caller's own company, via the shared service", async () => {
    await service.transition(IDS.owner, APP, {
      key: 'k1',
      body: body({ note: 'strong portfolio' }),
    });
    expect(hiring.transition).toHaveBeenCalledWith({
      applicationId: APP,
      toStatus: 'REVIEWING',
      expectedFromStatus: 'APPLIED',
      note: 'strong portfolio',
      actor: { type: 'EMPLOYER', id: IDS.owner, companyId: IDS.companyA },
      idempotencyKey: 'k1',
      source: 'employer_board',
    });
  });

  it('lets both owners and recruiters move candidates', async () => {
    await service.transition(IDS.owner, APP, { key: 'a', body: body() });
    actor.companyRole = 'RECRUITER';
    await service.transition(IDS.recruiter, APP, { key: 'b', body: body() });
    expect(hiring.transition).toHaveBeenCalledTimes(2);
  });

  it('403s a non-company user and a deactivated member, and moves nothing', async () => {
    actor = { ...actor, role: 'STUDENT', companyId: null, companyRole: null };
    await expect(
      service.transition(IDS.owner, APP, { key: 'k', body: body() }),
    ).rejects.toMatchObject({ status: 403 });
    actor = {
      role: 'COMPANY',
      companyId: IDS.companyA,
      companyRole: 'OWNER',
      deactivatedAt: new Date(),
    };
    await expect(
      service.transition(IDS.owner, APP, { key: 'k', body: body() }),
    ).rejects.toMatchObject({ status: 403 });
    expect(hiring.transition).not.toHaveBeenCalled();
  });

  it('never lets the owner get 403 on their own company', async () => {
    await expect(
      service.transition(IDS.owner, APP, { key: 'k', body: body() }),
    ).resolves.toBeDefined();
  });

  it('validates the request (422 schema): status enum, expected status required, note length', () => {
    const parse = (over: Record<string, unknown>) =>
      TransitionApplicationRequestSchema.safeParse(over);
    expect(parse({ toStatus: 'REVIEWING', expectedFromStatus: 'APPLIED' }).success).toBe(true);
    expect(parse({ toStatus: 'MAYBE', expectedFromStatus: 'APPLIED' }).success).toBe(false);
    expect(parse({ toStatus: 'REVIEWING' }).success).toBe(false); // expectedFromStatus is required
    expect(
      parse({ toStatus: 'REVIEWING', expectedFromStatus: 'APPLIED', note: 'a'.repeat(1001) })
        .success,
    ).toBe(false);
    expect(
      parse({ toStatus: 'REVIEWING', expectedFromStatus: 'APPLIED', note: '   ' }).success,
    ).toBe(false);
  });
});
