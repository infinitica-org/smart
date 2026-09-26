import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreatePlacementCalendarEventSchema,
  PlacementCalendarEventSchema,
  PlacementCtcAnalyticsSchema,
  PlacementReportExportParamsSchema,
  VouchOfferLetterResponseSchema,
  VouchOfferLetterSchema,
} from '@smart/contracts';
import type {
  CreatePlacementCalendarEventDto,
  PlacementCalendarEventDto,
  PlacementCtcAnalyticsDto,
  PlacementReportExportParamsDto,
  VouchOfferLetterDto,
  VouchOfferLetterResponseDto,
} from '@smart/contracts';
import type { FastifyReply } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';
import { PlacementCalendarService } from './placement-calendar.service.js';

@ApiTags('Placement Drive Calendar & CTC Analytics')
@Controller('placement')
@UseGuards(RolesGuard, TenantScopeGuard)
export class PlacementCalendarController {
  constructor(
    @Inject(PlacementCalendarService)
    private readonly service: PlacementCalendarService,
  ) {}

  @Get('calendar')
  @Roles('PLACEMENT_STAFF', 'INSTITUTION_ADMIN', 'COMPANY', 'SUPER_ADMIN', 'STUDENT')
  @ApiOperation({ summary: 'List placement drive calendar events' })
  @ApiResponse({ status: 200, description: 'Placement calendar events list' })
  async getCalendarEvents(
    @TenantId() institutionId: string,
    @Query('driveId') driveId?: string,
    @Query('companyId') companyId?: string,
  ): Promise<{ events: PlacementCalendarEventDto[] }> {
    return this.service.getCalendarEvents(institutionId, { driveId, companyId });
  }

  @Post('calendar')
  @HttpCode(HttpStatus.CREATED)
  @Roles('PLACEMENT_STAFF', 'INSTITUTION_ADMIN', 'COMPANY', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a placement drive calendar event' })
  @ApiResponse({ status: 201, description: 'Calendar event created successfully' })
  async createCalendarEvent(
    @TenantId() institutionId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePlacementCalendarEventDto,
  ): Promise<PlacementCalendarEventDto> {
    const validated = CreatePlacementCalendarEventSchema.parse(body);
    const actorId = user.sub;
    const event = await this.service.createCalendarEvent(institutionId, actorId, validated);
    return PlacementCalendarEventSchema.parse(event);
  }

  @Get('analytics')
  @Roles('PLACEMENT_STAFF', 'INSTITUTION_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get cohort compensation and CTC tracking analytics' })
  @ApiResponse({ status: 200, description: 'CTC analytics and branch breakdown' })
  async getCtcAnalytics(@TenantId() institutionId: string): Promise<PlacementCtcAnalyticsDto> {
    const analytics = await this.service.getCtcAnalytics(institutionId);
    return PlacementCtcAnalyticsSchema.parse(analytics);
  }

  @Post('vouch-offer')
  @HttpCode(HttpStatus.OK)
  @Roles('STUDENT', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Vouch student offer letter against placement drive parameters' })
  @ApiResponse({ status: 200, description: 'Offer letter vouched successfully' })
  async vouchOfferLetter(
    @CurrentUser() user: RequestUser,
    @Body() body: VouchOfferLetterDto,
  ): Promise<VouchOfferLetterResponseDto> {
    const validated = VouchOfferLetterSchema.parse(body);
    const studentId = user.sub;
    const response = await this.service.vouchOfferLetter(studentId, validated);
    return VouchOfferLetterResponseSchema.parse(response);
  }

  @Get('reports/export')
  @Roles('PLACEMENT_STAFF', 'INSTITUTION_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Export placement compliance report (CSV or PDF format)' })
  @ApiResponse({ status: 200, description: 'Placement report file stream' })
  async exportPlacementReport(
    @TenantId() institutionId: string,
    @Query() query: PlacementReportExportParamsDto,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const params = PlacementReportExportParamsSchema.parse(query);
    const report = await this.service.exportPlacementReport(institutionId, params);

    res.header('Content-Type', report.contentType);
    res.header('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.content);
  }
}
