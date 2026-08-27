import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, StartAttemptRequestSchema, type AttemptSessionDto } from '@smart/contracts';
import type { FastifyRequest } from 'fastify';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { NextFormRequestDto } from './dto/next-form-request.dto.js';
import { AssessmentService } from './assessment.service.js';
import { ItemRotationService } from './item-rotation.service.js';

@ApiTags('assessment')
@Controller(`${API_PREFIX}/assessment`)
export class AssessmentController {
  constructor(
    @Inject(AssessmentService) private readonly service: AssessmentService,
    @Inject(ItemRotationService) private readonly rotation: ItemRotationService,
  ) {}

  @Get('_meta')
  meta() {
    return {
      module: 'assessment',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'active',
    };
  }

  @Post('start')
  @ApiOperation({ summary: 'Start an assessment attempt when level unlock rules pass' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Attempt started or existing active session returned' })
  @ApiResponse({ status: 403, description: 'Level locked or invalid role' })
  async startAttempt(
    @Req() req: FastifyRequest & { user?: RequestUser },
    @Body() body: unknown,
  ): Promise<AttemptSessionDto> {
    const user = req.user;
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student role required to start assessment attempt',
        statusCode: 403,
      });
    }
    const dto = StartAttemptRequestSchema.parse(body);
    return this.service.startAttempt(user.sub, dto);
  }

  @Get(':attemptId/session')
  @ApiOperation({ summary: 'Retrieve state of active assessment session' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Active session state' })
  @ApiResponse({ status: 403, description: 'Forbidden access to session' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(
    @Req() req: FastifyRequest & { user?: RequestUser },
    @Param('attemptId') attemptId: string,
  ): Promise<AttemptSessionDto> {
    const user = req.user;
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student role required to view assessment session',
        statusCode: 403,
      });
    }
    return this.service.getSession(user.sub, attemptId);
  }

  /**
   * S1-VG-03 — parallel-form selection with exposure tracking.
   * Returns the item form with the lowest average exposure for the requested level.
   * Increments exposure counters atomically; retires items that hit the threshold.
   */
  @Post('next-form')
  @ApiOperation({
    summary: 'Select next item form (parallel-form rotation + exposure tracking)',
  })
  @ApiBody({ type: NextFormRequestDto })
  async nextForm(@Body() body: NextFormRequestDto) {
    const { formCode, items } = await this.rotation.selectForm(
      body.levelId,
      body.excludeForms ?? [],
    );
    const { retired } = await this.rotation.recordExposure(items.map((i) => i.id));
    return { formCode, itemCount: items.length, retired, items };
  }
}
