import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  API_PREFIX,
  CreateCampusRequestSchema,
  ListCampusesQuerySchema,
  UpdateCampusRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';
import { CampusesService } from './campuses.service.js';

/** S6-VV-112 (#163) — the institution admin manages campuses; placement staff can read them. */
@Controller(`${API_PREFIX}/tpo/campuses`)
@UseGuards(TenantScopeGuard)
@Roles('INSTITUTION_ADMIN')
export class InstitutionsCampusesController {
  constructor(@Inject(CampusesService) private readonly campuses: CampusesService) {}

  @Get()
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  list(@Query() query: Record<string, string | undefined>, @TenantId() institutionId: string) {
    return this.campuses.list(institutionId, ListCampusesQuerySchema.parse(query));
  }

  @Post()
  create(
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    return this.campuses.create(institutionId, CreateCampusRequestSchema.parse(body), user.sub);
  }

  @Patch(':campusId')
  update(
    @Param('campusId') campusId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
    @TenantId() institutionId: string,
  ) {
    return this.campuses.update(
      campusId,
      institutionId,
      UpdateCampusRequestSchema.parse(body),
      user.sub,
    );
  }
}
