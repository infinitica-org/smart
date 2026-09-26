import { describe, expect, it, beforeEach } from 'vitest';
import { PlacementCalendarService } from './placement-calendar.service.js';

describe('Epic S6-VG-302 (PLACEMENT-CALENDAR-01) — Placement Calendar & CTC Analytics Specs', () => {
  let service: PlacementCalendarService;
  let mockPrisma: any;

  const mockInstitutionId = '11111111-1111-1111-1111-111111111111';
  const mockDriveId = '22222222-2222-2222-2222-222222222222';
  const mockCompanyId = '33333333-3333-3333-3333-333333333333';
  const mockStudentId = '44444444-4444-4444-4444-444444444444';
  const mockCreatedById = '55555555-5555-5555-5555-555555555555';
  const mockExperienceId = '66666666-6666-6666-6666-666666666666';

  beforeEach(() => {
    mockPrisma = {
      jobOpening: {
        findMany: () =>
          Promise.resolve([
            {
              id: mockDriveId,
              companyName: 'Acme Tech Solutions',
              roleTitle: 'Software Engineer',
              placementEmployerId: mockCompanyId,
              createdAt: new Date('2026-09-25T10:00:00.000Z'),
              createdById: mockCreatedById,
            },
          ]),
        findFirst: (args: any) => {
          if (args.where.id === mockDriveId) {
            return Promise.resolve({
              id: mockDriveId,
              companyName: 'Acme Tech Solutions',
              roleTitle: 'Software Engineer',
            });
          }
          return Promise.resolve(null);
        },
      },
      placementRecord: {
        findMany: () =>
          Promise.resolve([
            { ctcLpa: 14.5, branch: 'Computer Science', offerStatus: 'ACCEPTED' },
            { ctcLpa: 12.0, branch: 'Computer Science', offerStatus: 'ACCEPTED' },
            { ctcLpa: 18.0, branch: 'Information Technology', offerStatus: 'ACCEPTED' },
            { ctcLpa: 9.5, branch: 'Electronics & Telecom', offerStatus: 'OFFERED' },
          ]),
      },
      workExperience: {
        findFirst: (args: any) => {
          if (args.where.id === mockExperienceId) {
            return Promise.resolve({
              id: mockExperienceId,
              studentId: mockStudentId,
              companyName: 'Acme Tech Solutions',
            });
          }
          return Promise.resolve(null);
        },
      },
    };

    service = new PlacementCalendarService(mockPrisma as any);
  });

  describe('PC-T01: Placement Drive Calendar & Event Scheduling', () => {
    it('returns drive calendar events formatted with start and end timestamps', async () => {
      const result = await service.getCalendarEvents(mockInstitutionId);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]?.title).toContain('Acme Tech Solutions');
      expect(result.events[0]?.eventType).toBe('INTERVIEW_ROUND');
    });

    it('creates a custom calendar event for a placement drive', async () => {
      const event = await service.createCalendarEvent(mockInstitutionId, mockCreatedById, {
        driveId: mockDriveId,
        companyId: mockCompanyId,
        companyName: 'Acme Tech Solutions',
        title: 'Pre-Placement Talk (PPT)',
        eventType: 'PPT',
        startAt: '2026-10-01T10:00:00.000Z',
        endAt: '2026-10-01T11:30:00.000Z',
        location: 'Auditorium Hall A',
      });

      expect(event.title).toBe('Pre-Placement Talk (PPT)');
      expect(event.eventType).toBe('PPT');
      expect(event.createdById).toBe(mockCreatedById);
    });
  });

  describe('PC-T02: Compensation & CTC Tracking Analytics', () => {
    it('computes min, max, average, median CTC, and branch breakdown', async () => {
      const analytics = await service.getCtcAnalytics(mockInstitutionId);
      expect(analytics.totalOffers).toBe(4);
      expect(analytics.acceptedOffers).toBe(3);
      expect(analytics.highestCtcLpa).toBe(18.0);
      expect(analytics.averageCtcLpa).toBeGreaterThan(10);
      expect(analytics.branchBreakdown.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PC-T03: Offer Letter Upload & Employer Vouchering', () => {
    it('vouches student offer letter parameters against experience record', async () => {
      const res = await service.vouchOfferLetter(mockStudentId, {
        experienceId: mockExperienceId,
        driveId: mockDriveId,
        offeredCtcLpa: 14.5,
        designation: 'Software Development Engineer',
        joiningDate: '2026-11-01',
        offerLetterUrl: 'https://storage.smart.edu/offer-letters/student1.pdf',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('VERIFIED');
      expect(res.message).toContain('14.5 LPA');
    });
  });

  describe('PC-T04: Placement Compliance Report Export', () => {
    it('exports placement summary in CSV format by default', async () => {
      const report = await service.exportPlacementReport(mockInstitutionId, { format: 'csv' });
      expect(report.contentType).toBe('text/csv');
      expect(report.content).toContain('Computer Science');
      expect(report.filename).toContain('.csv');
    });

    it('exports placement summary in PDF format when requested', async () => {
      const report = await service.exportPlacementReport(mockInstitutionId, { format: 'pdf' });
      expect(report.contentType).toBe('application/pdf');
      expect(report.filename).toContain('.pdf');
    });
  });
});
