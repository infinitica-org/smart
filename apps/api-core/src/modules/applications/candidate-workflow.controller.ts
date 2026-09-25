import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  AddCandidateNoteRequestSchema,
  AssignRecruiterRequestSchema,
  RecordApplicationOutcomeRequestSchema,
  UuidSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { CandidateWorkflowService } from './candidate-workflow.service.js';

function applicationId(id: string): string {
  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) {
    throw new NotFoundException({
      error: 'not_found',
      message: 'Application not found.',
      statusCode: 404,
    });
  }
  return parsed.data;
}

@ApiTags('applications')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/employer`)
@Roles('COMPANY')
export class CandidateWorkflowController {
  constructor(
    @Inject(CandidateWorkflowService) private readonly workflow: CandidateWorkflowService,
  ) {}

  @Get('applications/:id/notes')
  @ApiOperation({ summary: 'Internal notes on a candidate (company only).' })
  listNotes(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.workflow.listNotes(user.sub, applicationId(id));
  }

  @Post('applications/:id/notes')
  @ApiOperation({ summary: 'Add an internal note; retry-safe with an Idempotency-Key.' })
  addNote(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.workflow.addNote(user.sub, applicationId(id), {
      key: IdempotencyService.requireKey(key),
      body: AddCandidateNoteRequestSchema.parse(body),
    });
  }

  @Post('applications/:id/assignee')
  @ApiOperation({ summary: 'Assign or unassign a team recruiter.' })
  assign(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.workflow.assign(user.sub, applicationId(id), {
      key: IdempotencyService.requireKey(key),
      body: AssignRecruiterRequestSchema.parse(body),
    });
  }

  @Post('applications/:id/outcome')
  @ApiOperation({ summary: 'Record the offer and joining outcome.' })
  recordOutcome(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.workflow.recordOutcome(user.sub, applicationId(id), {
      key: IdempotencyService.requireKey(key),
      body: RecordApplicationOutcomeRequestSchema.parse(body),
    });
  }
}
