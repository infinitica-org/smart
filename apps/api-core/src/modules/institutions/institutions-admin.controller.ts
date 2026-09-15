import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  API_PREFIX,
  CreateInstitutionRequestSchema,
  GlobalStudentSearchQuerySchema,
  InvitePlatformAdminRequestSchema,
  InviteUserRequestSchema,
  ListAuditLogsQuerySchema,
  ListInstitutionStudentsQuerySchema,
  ListInstitutionsQuerySchema,
  ResolveVerificationRequestSchema,
  SetFeatureFlagOverrideRequestSchema,
  TenantActionReasonSchema,
  UpdateInstitutionRequestSchema,
  UpdatePlanCapacityRequestSchema,
  UpdatePlanEntitlementsRequestSchema,
  ViewCandidateRequestSchema,
} from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { InstitutionsService } from './institutions.service.js';

function compactQuery(
  query: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
  );
}

@Controller(`${API_PREFIX}/admin`)
@Roles('SUPER_ADMIN')
export class InstitutionsAdminController {
  constructor(@Inject(InstitutionsService) private readonly institutions: InstitutionsService) {}

  @Post('students/:userId/profile')
  viewProfile(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.viewCandidateBrief(
      userId,
      ViewCandidateRequestSchema.parse(body),
      user.sub,
    );
  }

  @Get('institutions/:institutionId/entitlements')
  entitlements(@Param('institutionId') institutionId: string) {
    return this.institutions.resolveInstitutionEntitlements(institutionId);
  }

  @Put('institutions/:institutionId/feature-flags')
  setFlag(
    @Param('institutionId') institutionId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.setInstitutionFlagOverride(
      institutionId,
      SetFeatureFlagOverrideRequestSchema.parse(body),
      user.sub,
    );
  }

  @Post('institutions')
  createInstitution(@Body() body: unknown) {
    return this.institutions.createInstitution(CreateInstitutionRequestSchema.parse(body));
  }

  @Get('institutions')
  listInstitutions(@Query() query: Record<string, string | undefined>) {
    return this.institutions.listInstitutions(
      ListInstitutionsQuerySchema.parse(compactQuery(query)),
    );
  }

  @Get('plans')
  listPlans() {
    return this.institutions.listPlans();
  }

  @Get('feature-flags')
  listFeatureFlags() {
    return this.institutions.listFeatureFlags();
  }

  @Get('feature-flag-overrides')
  listFeatureFlagOverrides() {
    return this.institutions.listFeatureFlagOverrides();
  }

  @Patch('plans/:planId/entitlements')
  updatePlanEntitlements(
    @Param('planId') planId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.updatePlanEntitlements(
      planId,
      UpdatePlanEntitlementsRequestSchema.parse(body),
      user.sub,
    );
  }

  @Patch('plans/:planId/capacity')
  updatePlanCapacity(
    @Param('planId') planId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.updatePlanCapacity(
      planId,
      UpdatePlanCapacityRequestSchema.parse(body),
      user.sub,
    );
  }

  @Get('dashboard')
  dashboard() {
    return this.institutions.getDashboard();
  }

  @Get('audit-logs')
  auditLogs(@Query() query: Record<string, string | undefined>) {
    return this.institutions.listAuditLogs(ListAuditLogsQuerySchema.parse(compactQuery(query)));
  }

  @Get('verification-queue')
  verificationQueue() {
    return this.institutions.listVerificationQueue();
  }

  @Post('verification-queue/:tenantId/resolve')
  resolveVerification(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.resolveVerification(
      tenantId,
      ResolveVerificationRequestSchema.parse(body),
      user.sub,
    );
  }

  @Get('students/search')
  searchStudents(@Query() query: Record<string, string | undefined>) {
    const parsed = GlobalStudentSearchQuerySchema.parse(compactQuery(query));
    return this.institutions.searchStudents(parsed);
  }

  @Get('institutions/:institutionId')
  getInstitution(@Param('institutionId') institutionId: string) {
    return this.institutions.getInstitution(institutionId);
  }

  @Patch('institutions/:institutionId')
  updateInstitution(
    @Param('institutionId') institutionId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.updateInstitution(
      institutionId,
      UpdateInstitutionRequestSchema.parse(body),
      user.sub,
    );
  }

  @Post('institutions/:institutionId/hold')
  holdInstitution(
    @Param('institutionId') institutionId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.holdInstitution(
      institutionId,
      TenantActionReasonSchema.parse(body),
      user.sub,
    );
  }

  @Post('institutions/:institutionId/release-hold')
  releaseHold(
    @Param('institutionId') institutionId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.releaseHold(
      institutionId,
      TenantActionReasonSchema.parse(body),
      user.sub,
    );
  }

  @Post('institutions/:institutionId/deactivate')
  deactivateInstitution(
    @Param('institutionId') institutionId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.deactivateInstitution(
      institutionId,
      TenantActionReasonSchema.parse(body),
      user.sub,
    );
  }

  @Post('institutions/:institutionId/restore')
  restoreInstitution(
    @Param('institutionId') institutionId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.restoreInstitution(
      institutionId,
      TenantActionReasonSchema.parse(body),
      user.sub,
    );
  }

  @Get('institutions/:institutionId/students')
  listStudents(
    @Param('institutionId') institutionId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.institutions.listInstitutionStudents(
      institutionId,
      ListInstitutionStudentsQuerySchema.parse(compactQuery(query)),
    );
  }

  @Post('students/:userId/hold')
  holdStudent(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.holdStudent(
      userId,
      TenantActionReasonSchema.parse(body),
      user.sub,
      null,
    );
  }

  @Post('students/:userId/release-hold')
  releaseStudent(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.releaseStudent(
      userId,
      TenantActionReasonSchema.parse(body),
      user.sub,
      null,
    );
  }

  @Post('institutions/:institutionId/admins')
  inviteAdmin(
    @Param('institutionId') institutionId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.inviteInstitutionAdmin(
      institutionId,
      InviteUserRequestSchema.parse(body),
      user.sub,
    );
  }

  @Get('institutions/:institutionId/admins')
  listAdmins(@Param('institutionId') institutionId: string) {
    return this.institutions.listInstitutionAdmins(institutionId);
  }

  @Post('invitations/:invitationId/resend')
  resendInvitation(@Param('invitationId') invitationId: string) {
    return this.institutions.resendAdminInvitation(invitationId);
  }

  @Get('platform-admins')
  listPlatformAdmins() {
    return this.institutions.listPlatformAdmins();
  }

  @Post('platform-admins')
  invitePlatformAdmin(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    return this.institutions.invitePlatformAdmin(
      InvitePlatformAdminRequestSchema.parse(body),
      user.sub,
    );
  }
}
