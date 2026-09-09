import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, CreateBlockedWordRequestSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { BlockedWordsAdminService } from './blocked-words-admin.service.js';

@ApiTags('admin-blocked-words')
@Controller(`${API_PREFIX}/admin/blocked-words`)
@Roles('SUPER_ADMIN')
export class BlockedWordsAdminController {
  constructor(
    @Inject(BlockedWordsAdminService) private readonly service: BlockedWordsAdminService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the curated blocked-word list (CN-T09).' })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a word to the blocked list.' })
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const parsed = CreateBlockedWordRequestSchema.parse(body);
    return this.service.create(user.sub, parsed);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a word from the blocked list.' })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.remove(user.sub, id);
  }
}
