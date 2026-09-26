import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  UniversityMessageStudentRequestSchema,
  UniversityRosterQuerySchema,
} from '@smart/contracts';
import { AuditAccess } from '../../common/decorators/audit-access.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { UniversityStudentsService } from './university-students.service.js';

/** UNI-04 — student readiness dashboard for university staff (Th6-437 to Th6-444). */
@ApiTags('university-students')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/tpo/students`)
@UseGuards(TenantScopeGuard)
@Roles('PLACEMENT_STAFF', 'INSTITUTION_ADMIN')
export class UniversityStudentsController {
  constructor(
    @Inject(UniversityStudentsService) private readonly students: UniversityStudentsService,
  ) {}

  @Get('roster')
  @ApiOperation({
    summary: 'Roster with verification/program/graduation-year filters, cursor paged.',
  })
  roster(@CurrentUser() user: RequestUser, @Query() query: Record<string, string | undefined>) {
    return this.students.listRoster(
      user,
      UniversityRosterQuerySchema.parse(
        Object.fromEntries(Object.entries(query).filter(([, value]) => value)),
      ),
    );
  }

  @Get(':userId/summary')
  @AuditAccess('student_summary', 'userId', { subjectParam: 'userId' })
  @ApiOperation({ summary: 'Verification summary, missing evidence and placement status.' })
  summary(@CurrentUser() user: RequestUser, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.students.getStudentSummary(user, userId);
  }

  @Post(':userId/messages')
  @ApiOperation({ summary: 'Message a student. Requires an Idempotency-Key header.' })
  message(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.students.messageStudent(
      user,
      userId,
      IdempotencyService.requireKey(key),
      UniversityMessageStudentRequestSchema.parse(body),
    );
  }
}
