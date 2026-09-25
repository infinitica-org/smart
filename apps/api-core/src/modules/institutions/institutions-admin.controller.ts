import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { FastifyReply } from 'fastify';
import {
  API_PREFIX,
  CreateInstitutionRequestSchema,
  ExportAuditLogsQuerySchema,
  GetVerificationReviewQuerySchema,
  GlobalStudentSearchQuerySchema,
  InvitePlatformAdminRequestSchema,
  InviteUserRequestSchema,
  ListAuditLogsQuerySchema,
  ListInstitutionStudentsQuerySchema,
  ListInstitutionsQuerySchema,
  ListPartnershipRequestsQuerySchema,
  ReviewPartnershipRequestSchema,
  ResolveVerificationRequestSchema,
  SetFeatureFlagOverrideRequestSchema,
  TenantActionReasonSchema,
  UpdateInstitutionRequestSchema,
  UpdatePlanCapacityRequestSchema,
  UpdatePlanEntitlementsRequestSchema,
  ViewCandidateRequestSchema,
} from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { RequirePermission } from '../../common/guards/permissions.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AuditAccess } from '../../common/decorators/audit-access.decorator.js';
import { AuditLogExportService } from './audit-log-export.service.js';
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
  constructor(
    @Inject(InstitutionsService) private readonly institutions: InstitutionsService,
    @Inject(AuditLogExportService) private readonly auditExport: AuditLogExportService,
  ) {}

  @Get('partnerships/requests')
  listPartnershipRequests(@Query() query: Record<string, string | undefined>) {
    return this.institutions.listPartnershipRequests(
      ListPartnershipRequestsQuerySchema.parse(compactQuery(query)),
    );
  }

  @Get('partnerships/requests/:id')
  @AuditAccess('partnership_request', 'id')
  getPartnershipRequest(@Param('id') id: string) {
    return this.institutions.getPartnershipRequestById(id);
  }

  @Post('partnerships/requests/:id/decision')
  reviewPartnershipRequest(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.reviewPartnershipRequest(
      id,
      ReviewPartnershipRequestSchema.parse(body),
      user.sub,
    );
  }

  @Post('partnerships/requests/:id/provision')
  provisionUniversityAccount(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.institutions.provisionUniversityAccount(id, user.sub);
  }

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
  createInstitution(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    return this.institutions.createInstitution(
      CreateInstitutionRequestSchema.parse(body),
      user.sub,
    );
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
  @RequirePermission('audit.read')
  auditLogs(@Query() query: Record<string, string | undefined>) {
    return this.institutions.listAuditLogs(ListAuditLogsQuerySchema.parse(compactQuery(query)));
  }

  /** S6-VV-101 (#496) — streams the same filtered audit log as CSV or JSON Lines. */
  @Get('audit-logs/export')
  @RequirePermission('audit.export')
  async exportAuditLogs(
    @Query() query: Record<string, string | undefined>,
    @CurrentUser() user: RequestUser,
    @Res() reply: FastifyReply,
  ) {
    const { format, ...filter } = ExportAuditLogsQuerySchema.parse(compactQuery(query));
    const { lines } = await this.auditExport.prepare(filter, format, user.sub);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return reply
      .header('Content-Type', format === 'csv' ? 'text/csv; charset=utf-8' : 'application/x-ndjson')
      .header('Content-Disposition', `attachment; filename="smart-audit-log-${stamp}.${format}"`)
      .header('Cache-Control', 'no-store')
      .send(Readable.from(lines));
  }

  @Get('verification-queue')
  verificationQueue() {
    return this.institutions.listVerificationQueue();
  }

  @Get('verification-queue/:tenantId/review')
  @AuditAccess('tenant_verification', 'tenantId')
  verificationReview(
    @Param('tenantId') tenantId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    GetVerificationReviewQuerySchema.parse(compactQuery(query));
    return this.institutions.getCompanyVerificationReview(tenantId);
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
  @AuditAccess('institution_students', 'institutionId')
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
  @AuditAccess('institution_admins', 'institutionId')
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
