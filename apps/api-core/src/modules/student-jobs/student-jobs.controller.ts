import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  HideJobRequestSchema,
  ListStudentJobsQuerySchema,
  UuidSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { StudentJobsService } from './student-jobs.service.js';

function compact(query: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

/** A malformed id is a job that does not exist for this student. */
function jobIdParam(raw: string): string {
  const parsed = UuidSchema.safeParse(raw);
  if (!parsed.success) {
    throw new NotFoundException({ error: 'not_found', message: 'Job not found.', statusCode: 404 });
  }
  return parsed.data;
}

@ApiTags('student-jobs')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/student`)
@Roles('STUDENT')
export class StudentJobsController {
  constructor(@Inject(StudentJobsService) private readonly jobs: StudentJobsService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'Browse open jobs (fit, type, location, mode, cursor).' })
  list(@CurrentUser() user: RequestUser, @Query() query: Record<string, string | undefined>) {
    return this.jobs.list(user.sub, ListStudentJobsQuerySchema.parse(compact(query)));
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'One job: company card, why it matches, requirement gaps.' })
  detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.jobs.detail(user.sub, jobIdParam(id));
  }

  @Get('saved-jobs')
  @ApiOperation({ summary: 'My saved jobs.' })
  listSaved(@CurrentUser() user: RequestUser) {
    return this.jobs.listSaved(user.sub);
  }

  @Put('saved-jobs/:jobId')
  @ApiOperation({ summary: 'Save a job (idempotent).' })
  save(@CurrentUser() user: RequestUser, @Param('jobId') jobId: string) {
    return this.jobs.save(user.sub, jobIdParam(jobId));
  }

  @Delete('saved-jobs/:jobId')
  @ApiOperation({ summary: 'Unsave a job (idempotent).' })
  unsave(@CurrentUser() user: RequestUser, @Param('jobId') jobId: string) {
    return this.jobs.unsave(user.sub, jobIdParam(jobId));
  }

  @Put('hidden-jobs/:jobId')
  @ApiOperation({ summary: 'Hide a job with an optional reason (idempotent).' })
  hide(@CurrentUser() user: RequestUser, @Param('jobId') jobId: string, @Body() body: unknown) {
    return this.jobs.hide(user.sub, jobIdParam(jobId), HideJobRequestSchema.parse(body ?? {}));
  }

  @Delete('hidden-jobs/:jobId')
  @ApiOperation({ summary: 'Undo hiding a job (idempotent).' })
  unhide(@CurrentUser() user: RequestUser, @Param('jobId') jobId: string) {
    return this.jobs.unhide(user.sub, jobIdParam(jobId));
  }
}
