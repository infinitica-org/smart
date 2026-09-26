import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import { InterviewsService } from './interviews.service.js';

describe('InterviewsService (Epic INTERVIEW-01)', () => {
  let service: InterviewsService;
  const mockPrisma = {} as PrismaService;

  const companyId = '11111111-1111-4111-8111-111111111111';
  const openingId = '22222222-2222-4222-8222-222222222222';
  const interviewerId = '33333333-3333-4333-8333-333333333333';
  const candidateId = '44444444-4444-4444-8444-444444444444';
  const applicationId = '55555555-5555-4555-8555-555555555555';

  beforeEach(() => {
    service = new InterviewsService(mockPrisma);
  });

  describe('Th6-I320: Slot Creation & Timezone Scheduling', () => {
    it('creates an interview slot with calculated end time and meeting link', async () => {
      const slot = await service.createInterviewSlot(companyId, {
        openingId,
        interviewerId,
        interviewerName: 'Sarah Connor',
        interviewerEmail: 'sarah@acme.com',
        interviewType: 'TECHNICAL',
        startTime: '2026-10-15T10:00:00.000Z',
        durationMinutes: 45,
        timezone: 'Asia/Kolkata',
      });

      expect(slot.id).toBeDefined();
      expect(slot.companyId).toBe(companyId);
      expect(slot.interviewerName).toBe('Sarah Connor');
      expect(slot.startTime).toBe('2026-10-15T10:00:00.000Z');
      expect(slot.endTime).toBe('2026-10-15T10:45:00.000Z');
      expect(slot.isBooked).toBe(false);
      expect(slot.meetingUrl).toContain('meet.google.com');
    });

    it('lists created slots for a company and opening', async () => {
      await service.createInterviewSlot(companyId, {
        openingId,
        interviewerId,
        interviewerName: 'Sarah Connor',
        interviewerEmail: 'sarah@acme.com',
        interviewType: 'TECHNICAL',
        startTime: '2026-10-15T10:00:00.000Z',
        durationMinutes: 45,
      });

      const slots = await service.listInterviewSlots(companyId, openingId);
      expect(slots.length).toBe(1);
      expect(slots[0]?.openingId).toBe(openingId);
    });
  });

  describe('Th6-I321: Double-Booking Conflict Prevention', () => {
    it('prevents creating an overlapping slot for the same interviewer', async () => {
      await service.createInterviewSlot(companyId, {
        openingId,
        interviewerId,
        interviewerName: 'Sarah Connor',
        interviewerEmail: 'sarah@acme.com',
        interviewType: 'TECHNICAL',
        startTime: '2026-10-15T10:00:00.000Z',
        durationMinutes: 60,
      });

      // Try to create overlapping slot (10:30 to 11:15)
      await expect(
        service.createInterviewSlot(companyId, {
          openingId,
          interviewerId,
          interviewerName: 'Sarah Connor',
          interviewerEmail: 'sarah@acme.com',
          interviewType: 'SYSTEM_DESIGN',
          startTime: '2026-10-15T10:30:00.000Z',
          durationMinutes: 45,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Th6-I322: Candidate Slot Booking', () => {
    it('allows candidate to book an available slot', async () => {
      const createdSlot = await service.createInterviewSlot(companyId, {
        openingId,
        interviewerId,
        interviewerName: 'Sarah Connor',
        interviewerEmail: 'sarah@acme.com',
        interviewType: 'TECHNICAL',
        startTime: '2026-10-15T10:00:00.000Z',
        durationMinutes: 45,
      });

      const bookedSlot = await service.bookInterviewSlot(candidateId, {
        slotId: createdSlot.id,
        applicationId,
      });

      expect(bookedSlot.isBooked).toBe(true);
      expect(bookedSlot.bookedCandidateId).toBe(candidateId);
      expect(bookedSlot.applicationId).toBe(applicationId);

      const candidateSlots = await service.listMyInterviewSlots(candidateId);
      expect(candidateSlots.length).toBe(1);
      expect(candidateSlots[0]?.id).toBe(createdSlot.id);
    });

    it('rejects booking an already booked slot', async () => {
      const createdSlot = await service.createInterviewSlot(companyId, {
        openingId,
        interviewerId,
        interviewerName: 'Sarah Connor',
        interviewerEmail: 'sarah@acme.com',
        interviewType: 'TECHNICAL',
        startTime: '2026-10-15T10:00:00.000Z',
        durationMinutes: 45,
      });

      await service.bookInterviewSlot(candidateId, {
        slotId: createdSlot.id,
        applicationId,
      });

      // Second candidate attempts to book
      await expect(
        service.bookInterviewSlot('another-candidate-id', {
          slotId: createdSlot.id,
          applicationId: 'another-app-id',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Th6-I323 & Th6-I324: Scorecard Submission & Review', () => {
    it('allows interviewer to submit a scorecard for completed interview', async () => {
      const createdSlot = await service.createInterviewSlot(companyId, {
        openingId,
        interviewerId,
        interviewerName: 'Sarah Connor',
        interviewerEmail: 'sarah@acme.com',
        interviewType: 'TECHNICAL',
        startTime: '2026-10-15T10:00:00.000Z',
        durationMinutes: 45,
      });

      await service.bookInterviewSlot(candidateId, {
        slotId: createdSlot.id,
        applicationId,
      });

      const scorecard = await service.submitScorecard(interviewerId, 'Sarah Connor', {
        slotId: createdSlot.id,
        applicationId,
        technicalDepthScore: 5,
        problemSolvingScore: 4,
        communicationScore: 5,
        cultureFitScore: 5,
        recommendation: 'STRONG_HIRE',
        feedbackNotes: 'Exceptional system design and problem solving skills under pressure.',
      });

      expect(scorecard.id).toBeDefined();
      expect(scorecard.recommendation).toBe('STRONG_HIRE');
      expect(scorecard.technicalDepthScore).toBe(5);

      const appScorecards = await service.listApplicationScorecards(applicationId);
      expect(appScorecards.length).toBe(1);
      expect(appScorecards[0]?.recommendation).toBe('STRONG_HIRE');
    });

    it('throws NotFoundException for non-existent slot scorecard submission', async () => {
      await expect(
        service.submitScorecard(interviewerId, 'Sarah Connor', {
          slotId: '00000000-0000-0000-0000-000000000000',
          applicationId,
          technicalDepthScore: 4,
          problemSolvingScore: 4,
          communicationScore: 4,
          cultureFitScore: 4,
          recommendation: 'HIRE',
          feedbackNotes: 'Good overall performance.',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
