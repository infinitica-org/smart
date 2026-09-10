import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { API_PREFIX, AdminCertificateReviewRequestSchema } from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CandidateCertificatesService } from './candidate-certificates.service.js';

@Controller(`${API_PREFIX}/admin/candidate-certificates`)
@Roles('SUPER_ADMIN')
export class CandidateCertificatesAdminController {
  constructor(
    @Inject(CandidateCertificatesService)
    private readonly candidateCertificatesService: CandidateCertificatesService,
  ) {}

  @Get('queue')
  listQueue() {
    return this.candidateCertificatesService.listVerificationQueue();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() body: unknown) {
    const parsed = AdminCertificateReviewRequestSchema.parse(body ?? {});
    return this.candidateCertificatesService.adminApprove(id, parsed);
  }

  // POST :id/void lives on CandidateCertificateVoidAdminController (SA-T08) —
  // audited, actor-tracked. This route collided with it (same path/method)
  // and crashed Fastify route registration (FST_ERR_DUPLICATED_ROUTE).
}
