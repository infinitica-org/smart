import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { AssessmentAdminService } from './assessment-admin.service.js';

@ApiTags('admin-assessment')
@Controller(`${API_PREFIX}/admin`)
@Roles('SUPER_ADMIN')
export class AssessmentAdminController {
  constructor(@Inject(AssessmentAdminService) private readonly service: AssessmentAdminService) {}

  @Get('levels')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List assessment levels for authoring (T10).' })
  listLevels() {
    return this.service.listLevels();
  }

  @Post('levels')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an assessment level (T10).' })
  createLevel(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.createLevel(user.sub, body);
  }

  @Patch('levels/:levelId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an assessment level (T10).' })
  updateLevel(
    @CurrentUser() user: RequestUser,
    @Param('levelId') levelId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateLevel(user.sub, levelId, body);
  }

  @Get('levels/:levelId/items')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List items for a level (T11).' })
  listItems(@Param('levelId') levelId: string) {
    return this.service.listItems(levelId);
  }

  @Post('levels/:levelId/items')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an item for a level (T11).' })
  createItem(
    @CurrentUser() user: RequestUser,
    @Param('levelId') levelId: string,
    @Body() body: unknown,
  ) {
    return this.service.createItem(user.sub, levelId, body);
  }

  @Patch('items/:itemId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an item (T11).' })
  updateItem(
    @CurrentUser() user: RequestUser,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateItem(user.sub, itemId, body);
  }

  @Get('levels/:levelId/cut-scores')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List draft/published cut scores for a level (T11).' })
  listCutScores(@Param('levelId') levelId: string) {
    return this.service.listCutScores(levelId);
  }

  @Post('levels/:levelId/cut-scores')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upsert a draft cut score for a level (T11).' })
  upsertCutScore(
    @CurrentUser() user: RequestUser,
    @Param('levelId') levelId: string,
    @Body() body: unknown,
  ) {
    return this.service.upsertCutScore(user.sub, levelId, body);
  }
}
