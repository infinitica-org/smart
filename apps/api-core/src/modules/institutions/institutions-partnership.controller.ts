import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { API_PREFIX, CreatePartnershipRequestSchema } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { InstitutionsService } from './institutions.service.js';

@Controller(`${API_PREFIX}/partnerships`)
export class InstitutionsPartnershipController {
  constructor(@Inject(InstitutionsService) private readonly institutions: InstitutionsService) {}

  @Public()
  @Post('requests')
  createPartnershipRequest(@Body() body: unknown) {
    return this.institutions.createPartnershipRequest(CreatePartnershipRequestSchema.parse(body));
  }

  @Public()
  @Get('requests/:id/decision')
  getPartnershipDecision(@Param('id') id: string) {
    return this.institutions.getPartnershipDecision(id);
  }
}
