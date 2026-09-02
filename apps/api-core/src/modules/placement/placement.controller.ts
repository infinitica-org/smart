import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  CreateJobOpeningRequestSchema,
  ListJobOpeningsQuerySchema,
  type JobOpeningDto,
  type ListJobOpeningsResponse,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { PlacementService } from './placement.service.js';

function requireInstitutionId(user: RequestUser): string {
  if (!user.inst) {
    throw new ForbiddenException({
      error: 'forbidden',
      message: 'Placement staff must belong to an institution.',
      statusCode: 403,
    });
  }
  return user.inst;
}

@ApiTags('placement')
@Controller(`${API_PREFIX}/placement`)
export class PlacementController {
  constructor(@Inject(PlacementService) private readonly service: PlacementService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'placement',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'active',
    };
  }

  /**
   * V1 (Launch Roadmap §5/§10, ADR 0012) is TPO-mediated: only the two TPO
   * roles post a JD. The contract route still lists `B2B_PARTNER` for a later
   * company surface — that is deliberately not authorized here.
   */
  @Post('openings')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Create a structured job opening from INF-05 taxonomy skills.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Opening created in DRAFT.' })
  @ApiResponse({ status: 400, description: 'Invalid structured JD payload.' })
  @ApiResponse({ status: 503, description: 'INF-05 taxonomy is not seeded.' })
  async createOpening(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<JobOpeningDto> {
    return this.service.createOpening(
      requireInstitutionId(user),
      user.sub,
      CreateJobOpeningRequestSchema.parse(body),
    );
  }

  @Get('openings')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'List structured job openings for the authenticated TPO institution.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Openings for the caller institution only.' })
  async listOpenings(
    @CurrentUser() user: RequestUser,
    @Query() query: Record<string, string | undefined>,
  ): Promise<ListJobOpeningsResponse> {
    return this.service.listOpenings(
      requireInstitutionId(user),
      ListJobOpeningsQuerySchema.parse(
        Object.fromEntries(Object.entries(query).filter(([, value]) => value)),
      ),
    );
  }

  @Get('openings/:openingId')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  @ApiOperation({ summary: 'Read one job opening owned by the caller institution.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Opening with taxonomy skill requirements.' })
  @ApiResponse({ status: 404, description: 'Unknown opening, or owned by another institution.' })
  async getOpening(
    @CurrentUser() user: RequestUser,
    @Param('openingId') openingId: string,
  ): Promise<JobOpeningDto> {
    return this.service.getOpening(requireInstitutionId(user), openingId);
  }
}
