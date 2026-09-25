import 'reflect-metadata';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AUDIT_ACCESS_KEY, AuditAccess } from '../decorators/audit-access.decorator.js';
import { ProjectReviewAdminController } from '../../modules/evaluation/project-review-admin.controller.js';
import { CompaniesAdminController } from '../../modules/institutions/companies-admin.controller.js';
import { InstitutionsAdminController } from '../../modules/institutions/institutions-admin.controller.js';
import { InstitutionsTpoController } from '../../modules/institutions/institutions-tpo.controller.js';
import { PlacementMatchController } from '../../modules/matching/placement-match.controller.js';
import {
  AUDIT_ACCESS_THROTTLE_SECONDS,
  AuditAccessInterceptor,
} from './audit-access.interceptor.js';

class Controller {
  audited() {}

  plain() {}
}
// Applied by hand: the spec transform doesn't compile decorator syntax.
AuditAccess('user', 'studentId')(
  Controller.prototype,
  'audited',
  Object.getOwnPropertyDescriptor(Controller.prototype, 'audited') as PropertyDescriptor,
);

function setup(
  options: { setResult?: string | null; redisFails?: boolean; auditFails?: boolean } = {},
) {
  const redis = {
    set: options.redisFails
      ? vi.fn().mockRejectedValue(new Error('redis down'))
      : vi.fn().mockResolvedValue(options.setResult === undefined ? 'OK' : options.setResult),
  };
  const audit = {
    record: options.auditFails
      ? vi.fn().mockRejectedValue(new Error('outbox down'))
      : vi.fn().mockResolvedValue(undefined),
  };
  const interceptor = new AuditAccessInterceptor(new Reflector(), audit as never, redis as never);
  return { interceptor, audit, redis };
}

function context(
  handler: keyof Controller,
  user: { sub: string; role: string } | undefined,
  params: Record<string, string>,
): ExecutionContext {
  const request = {
    user,
    params,
    method: 'GET',
    url: `/api/v1/placement/candidates/${params.studentId ?? ''}/x?y=1`,
    routeOptions: { url: '/api/v1/placement/candidates/:studentId/x' },
  };
  return {
    getHandler: () => Controller.prototype[handler],
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const ok: CallHandler = { handle: () => of({ body: true }) };
const tpo = { sub: 'tpo-1', role: 'PLACEMENT_STAFF' };

describe('AuditAccessInterceptor (S6-VV-103)', () => {
  it('records who read whose data after a successful response', async () => {
    const { interceptor, audit, redis } = setup();

    const body = await firstValueFrom(
      interceptor.intercept(context('audited', tpo, { studentId: 'stu-1' }), ok),
    );

    expect(body).toEqual({ body: true });
    expect(redis.set).toHaveBeenCalledWith(
      'audit:access:tpo-1:user:stu-1',
      '1',
      'EX',
      AUDIT_ACCESS_THROTTLE_SECONDS,
      'NX',
    );
    expect(audit.record).toHaveBeenCalledWith({
      actorId: 'tpo-1',
      action: 'admin.data_accessed',
      resourceType: 'user',
      resourceId: 'stu-1',
      reasonCode: null,
      metadata: {
        actorRole: 'PLACEMENT_STAFF',
        route: 'GET /api/v1/placement/candidates/:studentId/x',
      },
    });
  });

  it('writes one row per actor and resource per window', async () => {
    const { interceptor, audit } = setup({ setResult: null });

    await firstValueFrom(
      interceptor.intercept(context('audited', tpo, { studentId: 'stu-1' }), ok),
    );

    expect(audit.record).not.toHaveBeenCalled();
  });

  it('does not record a subject reading their own data', async () => {
    const { interceptor, audit } = setup();

    await firstValueFrom(
      interceptor.intercept(
        context('audited', { sub: 'stu-1', role: 'STUDENT' }, { studentId: 'stu-1' }),
        ok,
      ),
    );

    expect(audit.record).not.toHaveBeenCalled();
  });

  it('records nothing when the request fails', async () => {
    const { interceptor, audit } = setup();
    const failing: CallHandler = { handle: () => throwError(() => new Error('403')) };

    await expect(
      firstValueFrom(
        interceptor.intercept(context('audited', tpo, { studentId: 'stu-1' }), failing),
      ),
    ).rejects.toThrow('403');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('ignores routes without @AuditAccess', async () => {
    const { interceptor, audit, redis } = setup();

    await firstValueFrom(interceptor.intercept(context('plain', tpo, { studentId: 'stu-1' }), ok));

    expect(redis.set).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('still records when Redis is down (fails toward more audit, not less)', async () => {
    const { interceptor, audit } = setup({ redisFails: true });

    await firstValueFrom(
      interceptor.intercept(context('audited', tpo, { studentId: 'stu-1' }), ok),
    );

    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('never fails the read because auditing failed', async () => {
    const { interceptor } = setup({ auditFails: true });

    await expect(
      firstValueFrom(interceptor.intercept(context('audited', tpo, { studentId: 'stu-1' }), ok)),
    ).resolves.toEqual({ body: true });
  });
});

describe('routes that expose one person or tenant to an admin carry @AuditAccess', () => {
  it.each([
    [InstitutionsAdminController, 'getPartnershipRequest', 'partnership_request', 'id'],
    [InstitutionsAdminController, 'verificationReview', 'tenant_verification', 'tenantId'],
    [InstitutionsAdminController, 'listStudents', 'institution_students', 'institutionId'],
    [InstitutionsAdminController, 'listAdmins', 'institution_admins', 'institutionId'],
    [CompaniesAdminController, 'get', 'company', 'companyId'],
    [ProjectReviewAdminController, 'detail', 'project', 'projectId'],
    [PlacementMatchController, 'getCandidateFit', 'user', 'studentId'],
    [PlacementMatchController, 'inspectCandidateSkill', 'user', 'studentId'],
    [InstitutionsTpoController, 'listMembers', 'batch_members', 'batchId'],
  ] as const)('%o.%s', (controller, handler, resourceType, idParam) => {
    const method = (controller.prototype as unknown as Record<string, object>)[handler];
    expect(method, handler).toBeDefined();
    expect(Reflect.getMetadata(AUDIT_ACCESS_KEY, method as object)).toEqual({
      resourceType,
      idParam,
    });
  });
});
