import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { API_PREFIX, type SubmitManagerEndorsementDto } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { WorkExperienceService } from './work-experience.service.js';

@ApiTags('work-experience')
@Controller(`${API_PREFIX}/users/work-experiences/manager-survey`)
export class PublicWorkExperienceManagerSurveyController {
  constructor(@Inject(WorkExperienceService) private readonly service: WorkExperienceService) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'WE-T03: Get work experience manager survey details by token.' })
  @ApiResponse({ status: 200, description: 'Manager endorsement survey payload.' })
  getSurvey(@Param('token') token: string) {
    return this.service.getManagerEndorsementByToken(token);
  }

  @Post(':token')
  @Public()
  @ApiOperation({
    summary: 'WE-T03: Submit manager endorsement (confirm/dispute + skill ratings).',
  })
  @ApiResponse({ status: 200, description: 'Manager endorsement response recorded.' })
  submitSurvey(
    @Param('token') token: string,
    @Body() body: SubmitManagerEndorsementDto,
    @Req() req: FastifyRequest,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.service.submitManagerEndorsement(token, body, { ip, userAgent });
  }
}
