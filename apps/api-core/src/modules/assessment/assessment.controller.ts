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
import {
  API_PREFIX,
  CompleteAttemptRequestSchema,
  DeclareSkillClaimRequestSchema,
  SaveDraftRequestSchema,
  StartAttemptRequestSchema,
  type AttemptSessionDto,
  type CompleteAttemptResponse,
  type NextItemDto,
  type SaveDraftResponse,
  type SkillClaimDto,
} from '@smart/contracts';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
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

  @Get('skill-claims')
  @Roles('STUDENT', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List skill claims the matcher reads (same SkillClaimStatus enum).' })
  @ApiResponse({ status: 200, description: 'Skill claims visible to the caller.' })
  @ApiResponse({ status: 403, description: 'Forbidden role or missing institution' })
  listSkillClaims(@CurrentUser() user: RequestUser): Promise<SkillClaimDto[]> {
    return this.service.listSkillClaims(user);
  }

  @Post('skill-claims')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Declare a skill claim at DECLARED (CN-T04). Re-declare after LOCKED cooldown.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['skillCode', 'proficiency'],
      properties: {
        skillCode: { type: 'string' },
        proficiency: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Skill claim declared or updated.' })
  @ApiResponse({ status: 400, description: 'Unknown skill code' })
  @ApiResponse({ status: 403, description: 'Locked cooldown still active' })
  @ApiResponse({ status: 409, description: 'Skill already claimed' })
  async declareSkillClaim(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<SkillClaimDto> {
    const dto = DeclareSkillClaimRequestSchema.parse(body);
    return this.service.declareSkillClaim(user, dto);
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

  @Get(':attemptId/next-item')
  @ApiOperation({ summary: 'Serve the next assessment item from the Redis warm cache.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Next item payload' })
  @ApiResponse({ status: 403, description: 'Session forbidden, locked, or expired' })
  @ApiResponse({ status: 404, description: 'Attempt or item bank not found' })
  async nextItem(
    @Req() req: FastifyRequest & { user?: RequestUser },
    @Param('attemptId') attemptId: string,
  ): Promise<NextItemDto> {
    const user = req.user;
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student role required to fetch next item',
        statusCode: 403,
      });
    }
    return this.service.getNextItem(user.sub, attemptId);
  }

  @Post('submit-l1')
  @ApiOperation({ summary: 'Save an answer draft (write-through to Redis).' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Draft saved or superseded response' })
  @ApiResponse({ status: 403, description: 'Forbidden student access or locked session' })
  @ApiResponse({ status: 404, description: 'Attempt session not found' })
  async submitL1(
    @Req() req: FastifyRequest & { user?: RequestUser },
    @Body() body: unknown,
  ): Promise<SaveDraftResponse> {
    const user = req.user;
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student role required to submit answer draft',
        statusCode: 403,
      });
    }
    const dto = SaveDraftRequestSchema.parse(body);
    return this.service.saveDraft(user.sub, dto);
  }

  @Post('complete')
  @ApiOperation({
    summary:
      'Finalise an attempt: mark-weighted scoring, and (with claimId) SE-T01 skill-claim settlement.',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Attempt scored; claim state, if any, updated' })
  @ApiResponse({ status: 403, description: 'Not your attempt/claim, or the claim blocks it' })
  @ApiResponse({ status: 404, description: 'Attempt or claim not found' })
  @ApiResponse({ status: 409, description: 'Attempt already finalised' })
  async completeAttempt(
    @Req() req: FastifyRequest & { user?: RequestUser },
    @Body() body: unknown,
  ): Promise<CompleteAttemptResponse> {
    const user = req.user;
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student role required to complete an assessment attempt',
        statusCode: 403,
      });
    }
    const dto = CompleteAttemptRequestSchema.parse(body);
    return this.service.completeAttempt(user, dto);
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
  @ApiBody({ type: () => NextFormRequestDto })
  async nextForm(@Body() body: NextFormRequestDto) {
    const { formCode, items } = await this.rotation.selectForm(
      body.levelId,
      body.excludeForms ?? [],
    );
    const { retired } = await this.rotation.recordExposure(items.map((i) => i.id));
    return { formCode, itemCount: items.length, retired, items };
  }
}
