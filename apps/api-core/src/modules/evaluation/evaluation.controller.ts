import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { EvaluationService } from './evaluation.service.js';

@ApiTags('evaluation')
@Controller(`${API_PREFIX}/evaluation`)
export class EvaluationController {
  constructor(@Inject(EvaluationService) private readonly service: EvaluationService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'evaluation',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'skill-interview+project-verify',
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
}
