import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CognitiveProfileService } from './cognitive-profile.service.js';
import { EvaluationService } from './evaluation.service.js';

@ApiTags('evaluation')
@Controller(`${API_PREFIX}/evaluation`)
export class EvaluationController {
  constructor(
    @Inject(EvaluationService) private readonly service: EvaluationService,
    @Inject(CognitiveProfileService) private readonly cognitive: CognitiveProfileService,
  ) {}

  @Get('_meta')
  meta() {
    return {
      module: 'evaluation',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'skill-interview + cognitive-profile',
    };
  }

  @Post('skill-interview/questions')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate three skill-relevant interview questions (LLM via gateway).' })
  @ApiResponse({ status: 200, description: 'Three questions and the examiner promptRef.' })
  @ApiResponse({ status: 422, description: 'Invalid skillCode or proficiency.' })
  @ApiResponse({ status: 502, description: 'Gateway or model output failed closed.' })
  generateSkillInterview(@Body() body: unknown) {
    return this.service.generateSkillInterview(body);
  }

  @Post('skill-interview/grade')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Score typed or transcribed answers; always returns pass/fail plus a one-line why.',
  })
  @ApiResponse({ status: 200, description: 'passed, explanation, promptRef, auditId.' })
  @ApiResponse({ status: 422, description: 'Wrong item count or answer too long.' })
  @ApiResponse({ status: 502, description: 'Gateway or model output failed closed.' })
  gradeSkillInterview(@Body() body: unknown) {
    return this.service.gradeSkillInterview(body);
  }

  @Get('cognitive-profile')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read own cognitive and communication narrative snapshot.' })
  @ApiResponse({ status: 200, description: 'Cognitive and communication axes.' })
  @ApiResponse({ status: 404, description: 'Profile not generated yet.' })
  getCognitiveProfile(@CurrentUser() user: RequestUser) {
    return this.cognitive.getMine(user.sub);
  }

  @Post('cognitive-profile/refresh')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate a person-level strengths/weaknesses narrative (not a skill grade).',
  })
  @ApiResponse({ status: 200, description: 'ready snapshot, or reused if still fresh.' })
  @ApiResponse({ status: 409, description: 'Onboarding incomplete.' })
  @ApiResponse({ status: 502, description: 'Gateway or model output failed closed.' })
  refreshCognitiveProfile(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.cognitive.refresh(user.sub, body);
  }
}
