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
  ApplyToJobRequestSchema,
  UuidSchema,
  WithdrawApplicationRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { ApplicationService } from './application.service.js';

/** A malformed id is a record that does not exist for this student. */
function idParam(raw: string): string {
  const parsed = UuidSchema.safeParse(raw);
  if (!parsed.success) {
    throw new NotFoundException({ error: 'not_found', message: 'Not found.', statusCode: 404 });
  }
  return parsed.data;
}

@ApiTags('applications')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/student`)
@Roles('STUDENT')
export class StudentApplicationsController {
  constructor(@Inject(ApplicationService) private readonly applications: ApplicationService) {}

  @Get('jobs/:id/application-preview')
  @ApiOperation({ summary: 'What the employer will see if I apply.' })
  preview(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.applications.preview(user.sub, idParam(id));
  }

  @Post('jobs/:id/applications')
  @ApiOperation({ summary: 'Apply to a job with my verified profile.' })
  apply(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.applications.submit(user.sub, idParam(id), {
      key: IdempotencyService.requireKey(idempotencyKey),
      body: ApplyToJobRequestSchema.parse(body),
    });
  }

  @Get('applications')
  @ApiOperation({ summary: 'My applications with student-facing status labels.' })
  list(@CurrentUser() user: RequestUser) {
    return this.applications.listForStudent(user.sub);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'One of my applications with its timeline.' })
  detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.applications.getForStudent(user.sub, idParam(id));
  }

  @Post('applications/:id/withdraw')
  @ApiOperation({ summary: 'Withdraw an open application (idempotent).' })
  withdraw(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.applications.withdraw(user.sub, idParam(id), {
      key: IdempotencyService.requireKey(idempotencyKey),
      body: WithdrawApplicationRequestSchema.parse(body ?? {}),
    });
  }
}
