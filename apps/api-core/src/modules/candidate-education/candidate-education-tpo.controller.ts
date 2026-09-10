import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { CandidateEducationService } from './candidate-education.service.js';

@Controller(`${API_PREFIX}/tpo/education`)
@Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
export class CandidateEducationTpoController {
  constructor(
    @Inject(CandidateEducationService)
    private readonly candidateEducationService: CandidateEducationService,
  ) {}

  @Post(':id/confirm')
  confirmEducation(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.candidateEducationService.confirmByHomeCollege(id, user);
  }

  @Post(':id/reject')
  rejectEducation(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.candidateEducationService.rejectByHomeCollege(id, body, user);
  }
}
