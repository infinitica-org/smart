import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { API_PREFIX, type SubmitWorkExperienceVerificationDto } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { WorkExperienceService } from './work-experience.service.js';

@ApiTags('work-experience')
@Controller(`${API_PREFIX}/users/work-experiences/verify-token`)
export class PublicWorkExperienceVerificationController {
  constructor(@Inject(WorkExperienceService) private readonly service: WorkExperienceService) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Get work experience details by public verification token.' })
  @ApiResponse({ status: 200, description: 'Work experience verification record.' })
  getVerification(@Param('token') token: string) {
    return this.service.getVerificationByToken(token);
  }

  @Post(':token')
  @Public()
  @ApiOperation({ summary: 'Submit employer verification approval or rejection.' })
  @ApiResponse({ status: 200, description: 'Verification decision recorded.' })
  submitVerification(
    @Param('token') token: string,
    @Body() body: SubmitWorkExperienceVerificationDto,
    @Req() req: FastifyRequest,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.service.submitEmployerVerification(token, body, { ip, userAgent });
  }
}
