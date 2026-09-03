import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { WorkExperienceService } from './work-experience.service.js';

@ApiTags('work-experience')
@Controller(`${API_PREFIX}/users/me/work-experiences`)
export class WorkExperienceController {
  constructor(@Inject(WorkExperienceService) private readonly service: WorkExperienceService) {}

  @Get()
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List candidate work experience entries with document metadata.' })
  @ApiResponse({ status: 200, description: 'List of candidate work experience entries.' })
  list(@CurrentUser() user: RequestUser) {
    return this.service.listForStudent(user.sub);
  }

  @Get(':id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single candidate work experience record by ID.' })
  @ApiResponse({ status: 200, description: 'Candidate work experience record.' })
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getForStudent(user.sub, id);
  }

  @Post()
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a candidate work experience entry.' })
  @ApiResponse({ status: 201, description: 'Created work experience entry.' })
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.create(user.sub, body);
  }

  @Put(':id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update candidate work experience entry.' })
  @ApiResponse({ status: 200, description: 'Updated work experience entry.' })
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.update(user.sub, id, body);
  }

  @HttpCode(204)
  @Delete(':id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete candidate work experience entry.' })
  @ApiResponse({ status: 204, description: 'Work experience entry deleted.' })
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.delete(user.sub, id);
  }

  @Post(':id/documents')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach proof document metadata to a work experience record.' })
  @ApiResponse({ status: 201, description: 'Attached proof document metadata.' })
  attachDocument(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.attachDocument(user.sub, id, body);
  }

  @HttpCode(204)
  @Delete(':id/documents/:documentId')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove proof document attachment from a work experience record.' })
  @ApiResponse({ status: 204, description: 'Proof document attachment removed.' })
  removeDocument(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.service.removeDocument(user.sub, id, documentId);
  }

  @Post(':id/documents/:documentId/validate')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate an attached work experience proof document using AI classification.',
  })
  @ApiResponse({ status: 200, description: 'Work experience proof document validation result.' })
  validateDocument(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() body?: { rawText?: string },
  ) {
    return this.service.validateProofDocument(user.sub, id, documentId, body?.rawText);
  }
  @Post(':id/send-verification')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dispatch employer verification request to designated verifier.' })
  @ApiResponse({ status: 200, description: 'Employer verification request dispatched.' })
  sendVerification(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.sendEmployerVerification(user.sub, id);
  }
}
