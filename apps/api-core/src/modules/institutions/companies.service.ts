import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/index.js';
import type {
  CompanyDto,
  CompanySignupProfile,
  CreateCompanyRequest,
  ListCompaniesQuery,
  SetFeatureFlagOverrideRequest,
  TenantActionReason,
  TenantEntitlementsDto,
  UpdateCompanyRequest,
} from '@smart/contracts';
import { REDIS_TTL_SECONDS } from '@smart/contracts';
import { cacheOperations } from '@smart/observability';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { formatCompanyLocation } from './company-onboarding.util.js';
import { extractDomain } from '../work-experience/company-name.util.js';

function formatOnboardingLocation(profile: CompanySignupProfile): string {
  return formatCompanyLocation(profile);
}

const ENTITLEMENTS_CACHE_KEY = (companyId: string): string => `entitlements:company:${companyId}`;

@Injectable()
export class CompaniesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  /**
   * Self-serve onboarding: canonical tenant with verification pending (not SA auto-approve).
   */
  async createPendingCompanyForOnboarding(params: {
    profile: CompanySignupProfile;
    organizationId: string;
    planId: string;
    taxId?: string | null;
  }): Promise<{ companyId: string }> {
    const slug = await this.uniqueSlug(params.profile.displayName);
    const gstin =
      params.profile.address.country === 'IN' && params.taxId?.trim() ? params.taxId.trim() : null;

    const company = await this.prisma.company.create({
      data: {
        name: params.profile.displayName,
        domain: slug,
        taxonomyDomain: params.profile.taxonomyDomain ?? null,
        website: params.profile.website,
        linkedinUrl: params.profile.linkedinUrl ?? null,
        sector: params.profile.sector,
        mode: params.profile.mode,
        sizeBand: params.profile.sizeBand,
        location: formatOnboardingLocation(params.profile),
        gstin,
        planId: params.planId,
        verificationStatus: 'PENDING',
        organizationId: params.organizationId,
      },
    });

    return { companyId: company.id };
  }

  async createCompany(body: CreateCompanyRequest, actorId: string): Promise<CompanyDto> {
    const freePlan = await this.prisma.subscriptionPlan.findUnique({ where: { code: 'FREE' } });
    if (!freePlan) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Subscription plans have not been seeded.',
        statusCode: 404,
      });
    }
    const slug = await this.uniqueSlug(body.name);

    // INF-07: `Organization.domain` is always a bare hostname (see extractDomain /
    // OrganizationsService.resolveOrCreateOrganization) — never the raw `website`
    // URL, or `https://${org.domain}` reconstruction downstream (e.g. WE-T03
    // manager-endorsement domain matching) double-prefixes the scheme and breaks.
    const websiteDomain = extractDomain(body.website);

    let org = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { name: { equals: body.name, mode: 'insensitive' } },
          ...(websiteDomain ? [{ domain: websiteDomain }] : []),
        ],
      },
    });
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: body.name,
          domain: websiteDomain,
          verificationStatus: 'APPROVED',
        },
      });
    }

    const company = await this.prisma.company.create({
      data: {
        name: body.name,
        domain: slug,
        taxonomyDomain: body.domain ?? null,
        website: body.website ?? null,
        sector: body.sector,
        mode: body.mode,
        sizeBand: body.sizeBand,
        location: body.location,
        planId: freePlan.id,
        verificationStatus: 'APPROVED',
        organizationId: org.id,
      },
    });
    await this.writeAudit(actorId, 'company.created', company.id, 'created by super admin', {});
    return this.getCompany(company.id);
  }

  async listCompanies(query: ListCompaniesQuery = {}): Promise<CompanyDto[]> {
    const where: Prisma.CompanyWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { taxonomyDomain: { contains: query.q, mode: 'insensitive' } },
        { sector: { contains: query.q, mode: 'insensitive' } },
        { website: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.planCode) where.plan = { code: query.planCode };
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;
    if (query.status === 'HELD') {
      where.heldAt = { not: null };
      where.deactivatedAt = null;
    } else if (query.status === 'DEACTIVATED') {
      where.deactivatedAt = { not: null };
    } else if (query.status === 'ACTIVE') {
      where.heldAt = null;
      where.deactivatedAt = null;
    }
    const rows = await this.prisma.company.findMany({
      where,
      include: { plan: true, _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDto(row, row._count.users));
  }

  async getCompany(companyId: string): Promise<CompanyDto> {
    const company = await this.requireCompany(companyId);
    const userCount = await this.prisma.user.count({ where: { companyId } });
    return this.toDto(company, userCount);
  }

  async updateCompany(
    companyId: string,
    body: UpdateCompanyRequest,
    actorId: string,
  ): Promise<CompanyDto> {
    await this.requireCompany(companyId);
    const data: Prisma.CompanyUpdateInput = {};
    if (body.name) data.name = body.name;
    if (body.domain !== undefined) data.taxonomyDomain = body.domain;
    if (body.website !== undefined) data.website = body.website;
    if (body.sector !== undefined) data.sector = body.sector;
    if (body.mode !== undefined) data.mode = body.mode;
    if (body.sizeBand !== undefined) data.sizeBand = body.sizeBand;
    if (body.location !== undefined) data.location = body.location;
    if (body.planCode) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { code: body.planCode },
      });
      if (!plan) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'Plan not found.',
          statusCode: 404,
        });
      }
      data.plan = { connect: { id: plan.id } };
    }
    await this.prisma.company.update({ where: { id: companyId }, data });
    if (body.planCode) {
      await this.redis.del(ENTITLEMENTS_CACHE_KEY(companyId));
      await this.writeAudit(actorId, 'company.plan_changed', companyId, body.planCode, {
        planCode: body.planCode,
      });
    }
    return this.getCompany(companyId);
  }

  async holdCompany(
    companyId: string,
    body: TenantActionReason,
    actorId: string,
  ): Promise<CompanyDto> {
    await this.requireCompany(companyId);
    await this.prisma.company.update({ where: { id: companyId }, data: { heldAt: new Date() } });
    await this.writeAudit(actorId, 'company.held', companyId, body.reason, {});
    return this.getCompany(companyId);
  }

  async releaseHold(
    companyId: string,
    body: TenantActionReason,
    actorId: string,
  ): Promise<CompanyDto> {
    await this.requireCompany(companyId);
    await this.prisma.company.update({ where: { id: companyId }, data: { heldAt: null } });
    await this.writeAudit(actorId, 'company.hold_released', companyId, body.reason, {});
    return this.getCompany(companyId);
  }

  async deactivateCompany(
    companyId: string,
    body: TenantActionReason,
    actorId: string,
  ): Promise<CompanyDto> {
    await this.requireCompany(companyId);
    await this.prisma.company.update({
      where: { id: companyId },
      data: { deactivatedAt: new Date() },
    });
    await this.writeAudit(actorId, 'company.deactivated', companyId, body.reason, {});
    return this.getCompany(companyId);
  }

  async restoreCompany(
    companyId: string,
    body: TenantActionReason,
    actorId: string,
  ): Promise<CompanyDto> {
    await this.requireCompany(companyId);
    await this.prisma.company.update({
      where: { id: companyId },
      data: { deactivatedAt: null, heldAt: null },
    });
    await this.writeAudit(actorId, 'company.restored', companyId, body.reason, {});
    return this.getCompany(companyId);
  }

  async setCompanyFlagOverride(
    companyId: string,
    body: SetFeatureFlagOverrideRequest,
    actorId: string,
  ): Promise<TenantEntitlementsDto> {
    await this.requireCompany(companyId);
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: body.key } });
    if (!flag) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Feature flag not found.',
        statusCode: 404,
      });
    }
    const existing = await this.prisma.featureFlagOverride.findFirst({
      where: { companyId, featureFlagId: flag.id },
    });
    if (existing) {
      await this.prisma.featureFlagOverride.update({
        where: { id: existing.id },
        data: { enabled: body.enabled },
      });
    } else {
      await this.prisma.featureFlagOverride.create({
        data: { companyId, featureFlagId: flag.id, enabled: body.enabled },
      });
    }
    await this.writeAudit(actorId, 'company.flag_override', companyId, body.key, {
      key: body.key,
      enabled: body.enabled,
    });
    await this.redis.del(ENTITLEMENTS_CACHE_KEY(companyId));
    return this.resolveCompanyEntitlements(companyId);
  }

  async resolveCompanyEntitlements(companyId: string): Promise<TenantEntitlementsDto> {
    const cacheKey = ENTITLEMENTS_CACHE_KEY(companyId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      cacheOperations.inc({ namespace: 'entitlements', result: 'hit' });
      return JSON.parse(cached) as TenantEntitlementsDto;
    }
    cacheOperations.inc({ namespace: 'entitlements', result: 'miss' });

    const company = await this.requireCompany(companyId);
    const flags = await this.prisma.featureFlag.findMany({
      include: { entitlements: true, overrides: true },
      orderBy: { key: 'asc' },
    });
    const resolved: TenantEntitlementsDto = {
      planCode: company.plan.code,
      domain: company.taxonomyDomain ?? undefined,
      verificationStatus: company.verificationStatus,
      flags: flags.map((flag) => {
        const override = flag.overrides.find((row) => row.companyId === companyId);
        const entitlement = flag.entitlements.find((row) => row.planId === company.planId);
        return {
          key: flag.key,
          name: flag.name,
          enabled: override ? override.enabled : (entitlement?.enabled ?? false),
        };
      }),
    };
    await this.redis.setex(
      cacheKey,
      REDIS_TTL_SECONDS.entitlementsResolve,
      JSON.stringify(resolved),
    );
    return resolved;
  }

  private async requireCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { plan: true },
    });
    if (!company) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Company not found.',
        statusCode: 404,
      });
    }
    return company;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'company';
    let slug = base;
    let n = 2;
    while (await this.prisma.company.findUnique({ where: { domain: slug } })) {
      slug = `${base}-${n}`;
      n += 1;
    }
    return slug;
  }

  private toDto(
    row: {
      id: string;
      organizationId?: string | null;
      name: string;
      domain: string;
      taxonomyDomain: string | null;
      website: string | null;
      sector: string | null;
      mode: CompanyDto['mode'];
      sizeBand: string | null;
      location: string | null;
      verificationStatus: CompanyDto['verificationStatus'];
      verificationReason: string | null;
      heldAt: Date | null;
      deactivatedAt: Date | null;
      createdAt: Date;
      plan?: { code: CompanyDto['planCode'] };
      planId?: string;
    },
    userCount: number,
  ): CompanyDto {
    return {
      companyId: row.id,
      organizationId: row.organizationId ?? null,
      name: row.name,
      domain: row.taxonomyDomain,
      website: row.website,
      planCode: row.plan?.code ?? 'FREE',
      sector: row.sector,
      mode: row.mode,
      sizeBand: row.sizeBand,
      location: row.location,
      verificationStatus: row.verificationStatus,
      verificationReason: row.verificationReason,
      heldAt: row.heldAt?.toISOString() ?? null,
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
      userCount,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async writeAudit(
    actorId: string,
    action: string,
    resourceId: string,
    reason: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditPublisher.record({
      actorId,
      action,
      resourceType: 'company',
      resourceId,
      reasonCode: reason,
      metadata,
    });
  }
}
