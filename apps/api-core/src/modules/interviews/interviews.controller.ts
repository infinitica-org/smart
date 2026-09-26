import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { InterviewScorecardDto, InterviewSlotDto } from '@smart/contracts';
import {
  API_PREFIX,
  BookInterviewSlotDtoSchema,
  CreateInterviewSlotDtoSchema,
  SubmitScorecardDtoSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard, type RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { InterviewsService } from './interviews.service.js';

@Controller(`${API_PREFIX}/interviews`)
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  /** Recruiter creates a new interview slot */
  @Post('slots')
  @Roles('COMPANY', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createSlot(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<InterviewSlotDto> {
    const dto = CreateInterviewSlotDtoSchema.parse(body);
    const companyId = user.companyId || user.inst || user.sub;
    return this.interviewsService.createInterviewSlot(companyId, dto);
  }

  /** Recruiter lists interview slots for an opening */
  @Get('slots')
  @Roles('COMPANY', 'SUPER_ADMIN', 'PLACEMENT_STAFF', 'INSTITUTION_ADMIN')
  async listSlots(
    @CurrentUser() user: RequestUser,
    @Query('openingId') openingId?: string,
  ): Promise<InterviewSlotDto[]> {
    const companyId = user.companyId || user.inst || user.sub;
    return this.interviewsService.listInterviewSlots(companyId, openingId);
  }

  /** Candidate books an available interview slot */
  @Post('book')
  @Roles('STUDENT')
  @HttpCode(HttpStatus.OK)
  async bookSlot(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<InterviewSlotDto> {
    const dto = BookInterviewSlotDtoSchema.parse(body);
    return this.interviewsService.bookInterviewSlot(user.sub, dto);
  }

  /** Candidate lists their booked interview slots */
  @Get('my-slots')
  @Roles('STUDENT')
  async listMySlots(@CurrentUser() user: RequestUser): Promise<InterviewSlotDto[]> {
    return this.interviewsService.listMyInterviewSlots(user.sub);
  }

  /** Interviewer submits an evaluation scorecard */
  @Post('scorecards')
  @Roles('COMPANY', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async submitScorecard(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<InterviewScorecardDto> {
    const dto = SubmitScorecardDtoSchema.parse(body);
    return this.interviewsService.submitScorecard(user.sub, 'Interviewer', dto);
  }

  /** View scorecards for a candidate application */
  @Get('scorecards/:applicationId')
  @Roles('COMPANY', 'SUPER_ADMIN', 'PLACEMENT_STAFF', 'INSTITUTION_ADMIN')
  async listScorecards(
    @Param('applicationId') applicationId: string,
  ): Promise<InterviewScorecardDto[]> {
    return this.interviewsService.listApplicationScorecards(applicationId);
  }
}
