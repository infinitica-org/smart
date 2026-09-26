import { Body, Controller, Get, Inject, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  CreateDataRequestSchema,
  DeactivateAccountRequestSchema,
  UpdateMessagingPreferenceRequestSchema,
  UpdatePersonalInfoRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AccountService } from './account.service.js';
import { DataExportService } from './data-export.service.js';

@ApiTags('account')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/users/me`)
@Roles('STUDENT')
export class AccountController {
  constructor(
    @Inject(AccountService) private readonly service: AccountService,
    @Inject(DataExportService) private readonly exports: DataExportService,
  ) {}

  @Get('personal')
  @ApiOperation({ summary: 'Get my personal information.' })
  getPersonal(@CurrentUser() user: RequestUser) {
    return this.service.getPersonalInfo(user.sub);
  }

  @Patch('personal')
  @ApiOperation({ summary: 'Edit my personal information.' })
  updatePersonal(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.updatePersonalInfo(user.sub, UpdatePersonalInfoRequestSchema.parse(body));
  }

  @Get('messaging')
  @ApiOperation({ summary: 'Get whether employers may message me.' })
  getMessaging(@CurrentUser() user: RequestUser) {
    return this.service.getMessagingPreference(user.sub);
  }

  @Put('messaging')
  @ApiOperation({ summary: 'Control whether employers may message me.' })
  updateMessaging(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.updateMessagingPreference(
      user.sub,
      UpdateMessagingPreferenceRequestSchema.parse(body),
    );
  }

  @Post('deactivate')
  @ApiOperation({ summary: 'Deactivate my account (idempotent).' })
  deactivate(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.deactivate(user.sub, DeactivateAccountRequestSchema.parse(body));
  }

  @Get('data-requests')
  @ApiOperation({ summary: 'List my correction / deletion requests.' })
  listDataRequests(@CurrentUser() user: RequestUser) {
    return this.service.listDataRequests(user.sub);
  }

  @Post('data-requests')
  @ApiOperation({ summary: 'Request correction or deletion of my data.' })
  createDataRequest(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.createDataRequest(user.sub, CreateDataRequestSchema.parse(body));
  }

  @Get('data-requests/:requestId/download')
  @ApiOperation({ summary: 'Short-lived links to my finished data export (S6-VV-115).' })
  downloadDataExport(@CurrentUser() user: RequestUser, @Param('requestId') requestId: string) {
    return this.exports.download(user.sub, requestId);
  }
}
