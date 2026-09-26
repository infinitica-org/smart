import {
  Body,
  Controller,
  Get,
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
  DecideCampusAccessRequestSchema,
  RevokeCampusAccessSchema,
  UniversityEmployerRequestsQuerySchema,
  UniversityEmployersQuerySchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';
import { CampusAccessService } from './campus-access.service.js';

function cleanQuery(query: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value));
}

/** Th6-445 / 446 / 447 — the university's side of employer campus access. */
@ApiTags('university-campus')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/university`)
@UseGuards(TenantScopeGuard)
@Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
export class UniversityCampusController {
  constructor(@Inject(CampusAccessService) private readonly access: CampusAccessService) {}

  @Get('employer-requests')
  @ApiOperation({ summary: 'Review queue of employers asking for campus access, cursor paged.' })
  requests(@CurrentUser() user: RequestUser, @Query() query: Record<string, string | undefined>) {
    return this.access.listRequests(
      user,
      UniversityEmployerRequestsQuerySchema.parse(cleanQuery(query)),
    );
  }

  @Post('employer-requests/:id/decide')
  @Roles('INSTITUTION_ADMIN')
  @ApiOperation({
    summary: 'Approve or deny a request. Denial needs a reason. Repeating is a no-op.',
  })
  decide(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.access.decide(user, id, DecideCampusAccessRequestSchema.parse(body));
  }

  @Get('employers')
  @ApiOperation({ summary: 'Approved and revoked employers with aggregate counts only.' })
  employers(@CurrentUser() user: RequestUser, @Query() query: Record<string, string | undefined>) {
    return this.access.listEmployers(user, UniversityEmployersQuerySchema.parse(cleanQuery(query)));
  }

  @Post('employers/:companyId/revoke')
  @Roles('INSTITUTION_ADMIN')
  @ApiOperation({ summary: 'Revoke an employer campus access. Applications are kept.' })
  revoke(
    @CurrentUser() user: RequestUser,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() body: unknown,
  ) {
    return this.access.revoke(user, companyId, RevokeCampusAccessSchema.parse(body));
  }
}
