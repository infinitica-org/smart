import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, VoidRequestSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { CandidateCertificatesService } from './candidate-certificates.service.js';

@ApiTags('admin-candidate-certificates')
@Controller(`${API_PREFIX}/admin/candidate-certificates`)
@Roles('SUPER_ADMIN')
export class CandidateCertificateVoidAdminController {
  constructor(
    @Inject(CandidateCertificatesService) private readonly service: CandidateCertificatesService,
  ) {}

  @Post(':id/void')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'SA-T08 — void a certificate for fraud/integrity reasons. One-directional; fully audited.',
  })
  void(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = VoidRequestSchema.parse(body);
    return this.service.voidCertificate(user.sub, id, parsed);
  }
}
