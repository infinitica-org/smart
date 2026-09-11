import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  ConnectableSignalSourceIdSchema,
  ConnectSignalSourceRequestSchema,
  RefreshSignalsRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { SignalIngestionService } from './signal-ingestion.service.js';

@ApiTags('signals')
@Controller(`${API_PREFIX}/signals`)
export class SignalIngestionController {
  constructor(@Inject(SignalIngestionService) private readonly service: SignalIngestionService) {}

  @Get('_meta')
  @Roles('STUDENT')
  @ApiBearerAuth()
  meta() {
    return {
      module: 'signal-ingestion',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'passive-signal-adapters-v1',
    };
  }

  @Get('connections')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List connected external passive signal sources.' })
  @ApiResponse({ status: 200, description: 'Active connections for the signed-in student.' })
  listConnections(@CurrentUser() user: RequestUser) {
    return this.service.listConnections(user.sub);
  }

  @Post('connect/:sourceId')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect GitHub, HackerRank, or LeetCode.' })
  connect(
    @CurrentUser() user: RequestUser,
    @Param('sourceId') sourceIdParam: string,
    @Body() body: unknown,
  ) {
    const sourceId = ConnectableSignalSourceIdSchema.parse(sourceIdParam);
    const parsedBody = ConnectSignalSourceRequestSchema.parse(body);
    return this.service.connect(user.sub, sourceId, parsedBody);
  }

  @Delete('disconnect/:sourceId')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an external passive signal connection.' })
  async disconnect(@CurrentUser() user: RequestUser, @Param('sourceId') sourceIdParam: string) {
    const sourceId = ConnectableSignalSourceIdSchema.parse(sourceIdParam);
    await this.service.disconnect(user.sub, sourceId);
    return { ok: true };
  }

  @Post('refresh')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh connected passive signal sources.' })
  refresh(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const parsed = RefreshSignalsRequestSchema.parse(body ?? {});
    return this.service.refresh(user.sub, parsed);
  }
}
