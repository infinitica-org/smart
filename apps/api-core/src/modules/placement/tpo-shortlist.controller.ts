import { Controller, Get, Inject, Query, Res, UseGuards } from '@nestjs/common';
import {
  API_PREFIX,
  ExportTpoShortlistQuerySchema,
  ListTpoShortlistQuerySchema,
  ShortlistDtoSchema,
  type ShortlistDto,
} from '@smart/contracts';
import type { FastifyReply } from 'fastify';
import { Roles } from '../../common/guards/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TpoShortlistService } from './tpo-shortlist.service.js';

@Controller(`${API_PREFIX}/tpo`)
@UseGuards(JwtAuthGuard, RolesGuard, TenantScopeGuard)
export class TpoShortlistController {
  constructor(
    @Inject(TpoShortlistService)
    private readonly service: TpoShortlistService,
  ) {}

  @Get('shortlist')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
  async getShortlist(
    @TenantId() institutionId: string,
    @Query() query: unknown,
  ): Promise<ShortlistDto> {
    const validated = ListTpoShortlistQuerySchema.parse(query);
    const dto = await this.service.getShortlist(institutionId, validated);
    return ShortlistDtoSchema.parse(dto);
  }

  @Get('shortlist/export')
  @Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
  async exportShortlist(
    @TenantId() institutionId: string,
    @Query() query: unknown,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const validated = ExportTpoShortlistQuerySchema.parse(query);
    const { buffer, contentType, fileName } = await this.service.exportShortlist(
      institutionId,
      validated,
    );

    res.header('Content-Type', contentType);
    res.header('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }
}
