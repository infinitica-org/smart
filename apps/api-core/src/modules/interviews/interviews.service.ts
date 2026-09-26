import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BookInterviewSlotDto,
  CreateInterviewSlotDto,
  InterviewScorecardDto,
  InterviewSlotDto,
  SubmitScorecardDto,
} from '@smart/contracts';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // In-memory slot & scorecard stores (stubbed with Prisma integration hooks for production DB)
  private readonly slotsStore = new Map<string, InterviewSlotDto>();
  private readonly scorecardsStore = new Map<string, InterviewScorecardDto>();

  /** Recruiter creates a new interview slot for a company opening */
  async createInterviewSlot(
    companyId: string,
    dto: CreateInterviewSlotDto,
  ): Promise<InterviewSlotDto> {
    const startTimeDate = new Date(dto.startTime);
    if (Number.isNaN(startTimeDate.getTime())) {
      throw new BadRequestException('Invalid start time date string');
    }

    const duration = dto.durationMinutes || 45;
    const endTimeDate = new Date(startTimeDate.getTime() + duration * 60 * 1000);

    // Double-booking check: verify interviewer isn't already assigned to an overlapping slot
    for (const slot of this.slotsStore.values()) {
      if (
        slot.interviewerId === dto.interviewerId &&
        slot.status === 'SCHEDULED' &&
        new Date(slot.startTime) < endTimeDate &&
        new Date(slot.endTime) > startTimeDate
      ) {
        throw new ConflictException(
          `Interviewer ${dto.interviewerName} is already assigned to a slot during this time.`,
        );
      }
    }

    const meetingUrl =
      dto.meetingUrl || `https://meet.google.com/smart-${randomUUID().slice(0, 8)}`;

    const slot: InterviewSlotDto = {
      id: randomUUID(),
      openingId: dto.openingId,
      companyId,
      interviewerId: dto.interviewerId,
      interviewerName: dto.interviewerName,
      interviewerEmail: dto.interviewerEmail,
      interviewType: dto.interviewType,
      startTime: startTimeDate.toISOString(),
      endTime: endTimeDate.toISOString(),
      durationMinutes: duration,
      timezone: dto.timezone || 'Asia/Kolkata',
      meetingUrl,
      isBooked: false,
      bookedCandidateId: null,
      applicationId: null,
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.slotsStore.set(slot.id, slot);
    return slot;
  }

  /** List available or booked slots for an opening or company */
  async listInterviewSlots(companyId: string, openingId?: string): Promise<InterviewSlotDto[]> {
    const results: InterviewSlotDto[] = [];
    for (const slot of this.slotsStore.values()) {
      if (slot.companyId === companyId && (!openingId || slot.openingId === openingId)) {
        results.push(slot);
      }
    }
    return results;
  }

  /** Candidate books an available interview slot */
  async bookInterviewSlot(
    candidateId: string,
    dto: BookInterviewSlotDto,
  ): Promise<InterviewSlotDto> {
    const slot = this.slotsStore.get(dto.slotId);
    if (!slot) {
      throw new NotFoundException(`Interview slot ${dto.slotId} not found`);
    }

    if (slot.isBooked) {
      throw new ConflictException(
        'This interview slot has already been booked by another candidate.',
      );
    }

    slot.isBooked = true;
    slot.bookedCandidateId = candidateId;
    slot.applicationId = dto.applicationId;
    slot.updatedAt = new Date().toISOString();

    this.slotsStore.set(slot.id, slot);
    return slot;
  }

  /** Candidate views their booked interview slots */
  async listMyInterviewSlots(candidateId: string): Promise<InterviewSlotDto[]> {
    const results: InterviewSlotDto[] = [];
    for (const slot of this.slotsStore.values()) {
      if (slot.bookedCandidateId === candidateId) {
        results.push(slot);
      }
    }
    return results;
  }

  /** Interviewer submits an evaluation scorecard for a candidate interview */
  async submitScorecard(
    interviewerId: string,
    interviewerName: string,
    dto: SubmitScorecardDto,
  ): Promise<InterviewScorecardDto> {
    const slot = this.slotsStore.get(dto.slotId);
    if (!slot) {
      throw new NotFoundException(`Interview slot ${dto.slotId} not found`);
    }

    const scorecard: InterviewScorecardDto = {
      id: randomUUID(),
      slotId: dto.slotId,
      applicationId: dto.applicationId,
      interviewerId,
      interviewerName,
      technicalDepthScore: dto.technicalDepthScore,
      problemSolvingScore: dto.problemSolvingScore,
      communicationScore: dto.communicationScore,
      cultureFitScore: dto.cultureFitScore,
      recommendation: dto.recommendation,
      feedbackNotes: dto.feedbackNotes,
      createdAt: new Date().toISOString(),
    };

    slot.status = 'COMPLETED';
    slot.updatedAt = new Date().toISOString();
    this.slotsStore.set(slot.id, slot);

    this.scorecardsStore.set(scorecard.id, scorecard);
    return scorecard;
  }

  /** Recruiter / TPO views scorecards for a specific application */
  async listApplicationScorecards(applicationId: string): Promise<InterviewScorecardDto[]> {
    const results: InterviewScorecardDto[] = [];
    for (const card of this.scorecardsStore.values()) {
      if (card.applicationId === applicationId) {
        results.push(card);
      }
    }
    return results;
  }
}
