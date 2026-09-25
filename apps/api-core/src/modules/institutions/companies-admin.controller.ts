import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  API_PREFIX,
  CreateCompanyRequestSchema,
  ListCompaniesQuerySchema,
  SetFeatureFlagOverrideRequestSchema,
  TenantActionReasonSchema,
  UpdateCompanyRequestSchema,
} from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AuditAccess } from '../../common/decorators/audit-access.decorator.js';
import { CompaniesService } from './companies.service.js';

function compactQuery(
  query: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
  );
}

@Controller(`${API_PREFIX}/admin/companies`)
@Roles('SUPER_ADMIN')
export class CompaniesAdminController {
  constructor(@Inject(CompaniesService) private readonly companies: CompaniesService) {}

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    return this.companies.createCompany(CreateCompanyRequestSchema.parse(body), user.sub);
  }

  @Get()
  list(@Query() query: Record<string, string | undefined>) {
    return this.companies.listCompanies(ListCompaniesQuerySchema.parse(compactQuery(query)));
  }

  @Get(':companyId')
  @AuditAccess('company', 'companyId')
  get(@Param('companyId') companyId: string) {
    return this.companies.getCompany(companyId);
  }

  @Get(':companyId/entitlements')
  entitlements(@Param('companyId') companyId: string) {
    return this.companies.resolveCompanyEntitlements(companyId);
  }

  @Put(':companyId/feature-flags')
  setFlag(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companies.setCompanyFlagOverride(
      companyId,
      SetFeatureFlagOverrideRequestSchema.parse(body),
      user.sub,
    );
  }

  @Patch(':companyId')
  update(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companies.updateCompany(
      companyId,
      UpdateCompanyRequestSchema.parse(body),
      user.sub,
    );
  }

  @Post(':companyId/hold')
  hold(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companies.holdCompany(companyId, TenantActionReasonSchema.parse(body), user.sub);
  }

  @Post(':companyId/release-hold')
  release(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companies.releaseHold(companyId, TenantActionReasonSchema.parse(body), user.sub);
  }

  @Post(':companyId/deactivate')
  deactivate(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companies.deactivateCompany(
      companyId,
      TenantActionReasonSchema.parse(body),
      user.sub,
    );
  }

  @Post(':companyId/restore')
  restore(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companies.restoreCompany(companyId, TenantActionReasonSchema.parse(body), user.sub);
  }
}
