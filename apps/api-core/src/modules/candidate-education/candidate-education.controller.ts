import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { CandidateEducationService } from './candidate-education.service.js';

@ApiTags('candidate-education')
@Controller(`${API_PREFIX}/users/me/education`)
export class CandidateEducationController {
  constructor(
    @Inject(CandidateEducationService)
    private readonly service: CandidateEducationService,
  ) {}

  @Get()
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List candidate education entries.' })
  @ApiResponse({ status: 200, description: 'List of candidate education entries.' })
  list(@CurrentUser() user: RequestUser) {
    return this.service.listForStudent(user.sub);
  }

  @Get(':id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get candidate education entry by ID.' })
  @ApiResponse({ status: 200, description: 'Candidate education entry.' })
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getForStudent(user.sub, id);
  }

  @Post()
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create candidate education entry.' })
  @ApiResponse({ status: 201, description: 'Created education entry.' })
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.create(user.sub, body);
  }

  @Put(':id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update candidate education entry.' })
  @ApiResponse({ status: 200, description: 'Updated education entry.' })
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.update(user.sub, id, body);
  }

  @HttpCode(204)
  @Delete(':id')
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete candidate education entry.' })
  @ApiResponse({ status: 204, description: 'Education entry deleted.' })
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.delete(user.sub, id);
  }
}
