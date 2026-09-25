import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, ListEmployerApplicantsQuerySchema, UuidSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { EmployerApplicantsService } from './employer-applicants.service.js';

@ApiTags('applications')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/employer`)
@Roles('COMPANY')
export class EmployerApplicantsController {
  constructor(
    @Inject(EmployerApplicantsService) private readonly applicants: EmployerApplicantsService,
  ) {}

  @Get('jobs/:id/applicants')
  @ApiOperation({ summary: 'Applicants for one of my company jobs (from snapshots).' })
  list(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    const parsedId = UuidSchema.safeParse(id);
    if (!parsedId.success) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job not found.',
        statusCode: 404,
      });
    }
    const filtered = Object.fromEntries(
      Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    return this.applicants.list(
      user.sub,
      parsedId.data,
      ListEmployerApplicantsQuerySchema.parse(filtered),
    );
  }
}
