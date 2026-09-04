import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, SubmitCertificateEndorsementDecisionRequestSchema } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { CandidateCertificatesService } from './candidate-certificates.service.js';

@ApiTags('candidate-certificates')
@Controller(`${API_PREFIX}/certificate-endorsements`)
export class PublicCertificateEndorsementController {
  constructor(
    @Inject(CandidateCertificatesService) private readonly service: CandidateCertificatesService,
  ) {}

  @Get(':token')
  @Public()
  @ApiOperation({
    summary: 'Public endpoint for an endorser to view the certificate + candidate claims by token.',
  })
  getByToken(@Param('token') token: string) {
    return this.service.getEndorsementByToken(token);
  }

  @Post(':token')
  @Public()
  @ApiOperation({ summary: 'Public endpoint for an endorser to approve or reject a certificate.' })
  submitDecision(@Param('token') token: string, @Body() body: unknown) {
    const parsed = SubmitCertificateEndorsementDecisionRequestSchema.parse(body);
    return this.service.submitEndorsementDecision(token, parsed);
  }
}
