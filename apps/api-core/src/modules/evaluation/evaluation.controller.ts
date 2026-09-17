import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
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
      status: 'sde-v4-form+cert-agenda (skill interview via assessment only)',
    };
  }

  @Post('skill-form/questions')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate an SDE v4 skill-verification form (LLM via gateway). Stateless.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public items plus opaque scoringToken. Answer keys are not in plaintext.',
  })
  @ApiResponse({ status: 502, description: 'Gateway or model output failed closed.' })
  generateSkillForm(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    return this.service.generateSkillForm(body, user.sub);
  }

  @Post('skill-form/grade')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Score an SDE v4 form: MCQ/TRACE local, open items via LLM rubric.' })
  @ApiResponse({ status: 200, description: 'marks, scorePercent, passed against v4 bars.' })
  @ApiResponse({ status: 502, description: 'Gateway or model output failed closed.' })
  gradeSkillForm(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    return this.service.gradeSkillForm(body, user.sub);
  }

  @Post('skill-form/run-code')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Simulate compiling and running coding-item source against visible examples.',
  })
  @ApiResponse({ status: 200, description: 'Per-example pass/fail and optional compileError.' })
  @ApiResponse({ status: 502, description: 'Gateway or model output failed closed.' })
  runSkillFormCode(@Body() body: unknown) {
    return this.service.runSkillFormCode(body);
  }

  @Post('cert-agenda/generate')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate a cert paper from a submitted agenda (gateway LLM, sparse/drift guarded).',
  })
  @ApiResponse({ status: 200, description: 'Public MCQ items, promptRef, taxonomy snapshot.' })
  @ApiResponse({ status: 422, description: 'Sparse agenda or syllabus drift.' })
  @ApiResponse({ status: 429, description: 'Per-candidate regeneration cap.' })
  @ApiResponse({ status: 502, description: 'Gateway or model output failed closed.' })
  generateCertAgenda(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    return this.service.generateCertAgenda(body, user.sub);
  }
}
