import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_APPLICATION_STAGES,
  DashboardService,
  humanizeAction,
} from './dashboard.service.js';

describe('DashboardService (STU-03)', () => {
  let prisma: any;
  let auditPublisher: any;
  let profileCompletion: any;
  let service: DashboardService;

  const studentId = randomUUID();
  const institutionId = randomUUID();

  beforeEach(() => {
    prisma = {
      professionalCredential: { findMany: vi.fn().mockResolvedValue([]) },
      candidateEducation: { findMany: vi.fn().mockResolvedValue([]) },
      workExperience: { findMany: vi.fn().mockResolvedValue([]) },
      skillClaim: { findMany: vi.fn().mockResolvedValue([]) },
      application: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      jobOpening: { findMany: vi.fn().mockResolvedValue([]) },
      auditLog: { findMany: vi.fn().mockResolvedValue([]) },
      applicationStageEvent: { findMany: vi.fn().mockResolvedValue([]) },
      profileView: { count: vi.fn().mockResolvedValue(0) },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          institutionId,
          sscPercentage: 80,
          hscPercentage: 75,
          hasActiveBacklog: false,
          showEmployerViewCount: false,
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ showEmployerViewCount: false }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
    profileCompletion = {
      getProgressForStudent: vi.fn().mockResolvedValue({
        percent: 50,
        completedAreas: ['skills', 'languages'],
        incompleteAreas: ['education', 'experience'],
        areaStatus: {},
      }),
    };
    service = new DashboardService(prisma, auditPublisher, profileCompletion);
  });

  describe('getSummary', () => {
    it('composes every section from the caller’s own data and returns empty sections, not placeholders', async () => {
      const summary = await service.getSummary(studentId);

      expect(profileCompletion.getProgressForStudent).toHaveBeenCalledWith(studentId);
      expect(summary.completion).toEqual({
        percent: 50,
        completedAreas: ['skills', 'languages'],
        incompleteAreas: ['education', 'experience'],
      });
      expect(summary.nextAction?.href).toBe('/profile?section=education');
      expect(summary.attentionItems).toEqual([]);
      expect(summary.topMatches).toEqual([]);
      expect(summary.opportunities).toEqual({ total: 0, items: [] });
      expect(summary.activeApplications).toEqual({ total: 0, items: [] });
      expect(summary.recentActivity).toEqual([]);
      expect(summary.profileViews).toEqual({
        visible: false,
        employerViews: null,
        windowDays: 30,
      });
    });

    it('scopes every read to the requesting student', async () => {
      await service.getSummary(studentId);

      expect(prisma.professionalCredential.findMany.mock.calls[0][0].where.studentId).toBe(
        studentId,
      );
      expect(prisma.candidateEducation.findMany.mock.calls[0][0].where.studentId).toBe(studentId);
      expect(prisma.workExperience.findMany.mock.calls[0][0].where.studentId).toBe(studentId);
      expect(prisma.skillClaim.findMany.mock.calls[0][0].where.studentId).toBe(studentId);
      expect(prisma.auditLog.findMany.mock.calls[0][0].where.actorId).toBe(studentId);
      expect(prisma.applicationStageEvent.findMany.mock.calls[0][0].where).toEqual({
        application: { studentId },
      });
      for (const call of prisma.application.findMany.mock.calls) {
        expect(call[0].where.studentId).toBe(studentId);
      }
    });
  });

  describe('nextActionFor', () => {
    it('returns the first incomplete area in profile order', () => {
      expect(service.nextActionFor(['projects', 'certifications'])?.title).toBe('Add a project');
    });

    it('returns null when every area is complete', () => {
      expect(service.nextActionFor([])).toBeNull();
    });

    it('ignores areas it has no action for', () => {
      expect(service.nextActionFor(['unknown-area'])).toBeNull();
    });
  });

  describe('getAttentionItems', () => {
    it('maps verification states and lists failures first', async () => {
      prisma.professionalCredential.findMany.mockResolvedValue([
        { id: 'c1', credentialName: 'AWS SA', issuer: 'AWS', status: 'PENDING_VERIFICATION' },
        { id: 'c2', credentialName: 'GCP', issuer: 'Google', status: 'REVOKED' },
      ]);
      prisma.candidateEducation.findMany.mockResolvedValue([
        { id: 'e1', institutionName: 'MIT', status: 'rejected', rejectionReason: 'Name mismatch' },
        { id: 'e2', institutionName: 'IIT', status: 'unverified', rejectionReason: null },
      ]);
      prisma.workExperience.findMany.mockResolvedValue([
        { id: 'w1', role: 'Intern', companyName: 'Acme', status: 'PENDING_EMPLOYER' },
      ]);
      prisma.skillClaim.findMany.mockResolvedValue([
        { id: 's1', status: 'DECLARED', skill: { code: 'PYTHON', name: 'Python' } },
      ]);

      const items = await service.getAttentionItems(studentId);

      const states = items.map((item) => item.state);
      expect(states.slice(0, 2)).toEqual(['FAILED', 'FAILED']);
      expect(states[states.length - 1]).toBe('PROCESSING');
      expect(items.find((i) => i.id === 'credential-c1')?.state).toBe('PROCESSING');
      expect(items.find((i) => i.id === 'credential-c2')?.state).toBe('FAILED');
      expect(items.find((i) => i.id === 'education-e1')?.detail).toBe('Name mismatch');
      expect(items.find((i) => i.id === 'education-e2')?.state).toBe('NEEDS_ACTION');
      expect(items.find((i) => i.id === 'work-experience-w1')?.state).toBe('PROCESSING');
      expect(items.find((i) => i.id === 'skill-s1')?.href).toBe('/assessments');
    });

    it('caps the list', async () => {
      prisma.professionalCredential.findMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          id: `c${i}`,
          credentialName: `Cred ${i}`,
          issuer: 'X',
          status: 'PENDING_VERIFICATION',
        })),
      );
      const items = await service.getAttentionItems(studentId);
      expect(items).toHaveLength(10);
    });
  });

  describe('getTopMatches', () => {
    it('only reads scored, still-active applications, best first', async () => {
      await service.getTopMatches(studentId);

      const args = prisma.application.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        studentId,
        matchScore: { not: null },
        stage: { in: [...ACTIVE_APPLICATION_STAGES] },
      });
      expect(args.orderBy).toEqual({ matchScore: 'desc' });
    });

    it('turns the stored score into a whole percentage and never invents one', async () => {
      prisma.application.findMany.mockResolvedValue([
        {
          id: 'a1',
          openingId: 'o1',
          stage: 'SHORTLISTED',
          matchScore: '0.876',
          opening: { roleTitle: 'Backend', companyName: 'Acme', location: 'Pune' },
        },
      ]);

      const [match] = await service.getTopMatches(studentId);

      expect(match).toMatchObject({ applicationId: 'a1', matchPercent: 88, location: 'Pune' });
    });
  });

  describe('getOpportunities', () => {
    it('returns nothing for a student with no institution', async () => {
      prisma.user.findUnique.mockResolvedValue({ institutionId: null });
      expect(await service.getOpportunities(studentId)).toEqual({ total: 0, items: [] });
      expect(prisma.jobOpening.findMany).not.toHaveBeenCalled();
    });

    it('asks only for recent OPEN openings at the student’s institution that they have not applied to', async () => {
      await service.getOpportunities(studentId);

      const where = prisma.jobOpening.findMany.mock.calls[0][0].where;
      expect(where.institutionId).toBe(institutionId);
      expect(where.status).toBe('OPEN');
      expect(where.createdAt.gte).toBeInstanceOf(Date);
      expect(JSON.stringify(where.AND)).toContain('"applications":{"none":{"studentId"');
    });

    it('drops openings the student is not eligible for and caps the list while keeping the total', async () => {
      const row = (over: Record<string, unknown>) => ({
        id: randomUUID(),
        roleTitle: 'Role',
        companyName: 'Acme',
        location: null,
        employmentType: null,
        lastDateToApply: null,
        createdAt: new Date(),
        minSscPercentage: null,
        minHscPercentage: null,
        backlogsAllowed: true,
        ...over,
      });
      prisma.jobOpening.findMany.mockResolvedValue([
        row({ minSscPercentage: 90 }), // student has 80 -> excluded
        row({ minHscPercentage: 70 }), // ok
        ...Array.from({ length: 6 }, () => row({})),
      ]);

      const result = await service.getOpportunities(studentId);

      expect(result.total).toBe(7);
      expect(result.items).toHaveLength(5);
    });

    it('excludes no-backlog openings when the student has an active backlog', async () => {
      prisma.user.findUnique.mockResolvedValue({
        institutionId,
        sscPercentage: 80,
        hscPercentage: 75,
        hasActiveBacklog: true,
      });
      prisma.jobOpening.findMany.mockResolvedValue([
        {
          id: randomUUID(),
          roleTitle: 'Role',
          companyName: 'Acme',
          location: null,
          employmentType: null,
          lastDateToApply: null,
          createdAt: new Date(),
          minSscPercentage: null,
          minHscPercentage: null,
          backlogsAllowed: false,
        },
      ]);

      expect((await service.getOpportunities(studentId)).total).toBe(0);
    });
  });

  describe('getActiveApplications', () => {
    it('counts and lists only in-play stages', async () => {
      prisma.application.count.mockResolvedValue(3);
      prisma.application.findMany.mockResolvedValue([
        {
          id: 'a1',
          openingId: 'o1',
          stage: 'INTERVIEW',
          updatedAt: new Date('2026-09-20T10:00:00Z'),
          opening: { roleTitle: 'Backend', companyName: 'Acme' },
        },
      ]);

      const result = await service.getActiveApplications(studentId);

      expect(prisma.application.count).toHaveBeenCalledWith({
        where: { studentId, stage: { in: [...ACTIVE_APPLICATION_STAGES] } },
      });
      expect(result.total).toBe(3);
      expect(result.items[0]).toMatchObject({ applicationId: 'a1', stage: 'INTERVIEW' });
    });

    it('does not fall back to anything else when there are none', async () => {
      expect(await service.getActiveApplications(studentId)).toEqual({ total: 0, items: [] });
    });
  });

  describe('getRecentActivity', () => {
    it('only surfaces allow-listed actions the student performed, and merges stage changes newest first', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'au1',
          action: 'candidate_education.updated',
          createdAt: new Date('2026-09-20T08:00:00Z'),
        },
      ]);
      prisma.applicationStageEvent.findMany.mockResolvedValue([
        {
          id: 'st1',
          toStage: 'AI_VERIFIED',
          createdAt: new Date('2026-09-21T08:00:00Z'),
          application: { opening: { roleTitle: 'Backend', companyName: 'Acme' } },
        },
      ]);

      const items = await service.getRecentActivity(studentId);

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.actorId).toBe(studentId);
      expect(JSON.stringify(where.OR)).not.toContain('auth.');
      expect(items.map((i) => i.id)).toEqual(['stage-st1', 'audit-au1']);
      expect(items[0]?.label).toBe('Backend at Acme moved to ai verified');
      expect(items[1]?.label).toBe('Candidate education updated');
    });

    it('humanizes action names', () => {
      expect(humanizeAction('personal_info.updated')).toBe('Personal info updated');
    });
  });

  describe('getProfileViews', () => {
    it('returns no number at all when the student has not opted in', async () => {
      const views = await service.getProfileViews(studentId);

      expect(views).toEqual({ visible: false, employerViews: null, windowDays: 30 });
      expect(prisma.profileView.count).not.toHaveBeenCalled();
    });

    it('counts only employer views inside the window once opted in', async () => {
      prisma.user.findUnique.mockResolvedValue({ showEmployerViewCount: true });
      prisma.profileView.count.mockResolvedValue(4);

      const views = await service.getProfileViews(studentId);

      expect(views).toEqual({ visible: true, employerViews: 4, windowDays: 30 });
      const where = prisma.profileView.count.mock.calls[0][0].where;
      expect(where.studentId).toBe(studentId);
      expect(where.viewerRole).toEqual({ in: ['COMPANY'] });
      expect(where.createdAt.gte).toBeInstanceOf(Date);
    });
  });

  describe('profile view setting', () => {
    it('saves a change and audits prior and new values', async () => {
      const result = await service.updateProfileViewSetting(studentId, {
        showEmployerViewCount: true,
      });

      expect(result).toEqual({ showEmployerViewCount: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: studentId },
        data: { showEmployerViewCount: true },
      });
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: studentId,
          action: 'profile_view_setting.updated',
          metadata: { prior: false, next: true },
        }),
      );
    });

    it('is idempotent: repeating the current value writes and audits nothing', async () => {
      const result = await service.updateProfileViewSetting(studentId, {
        showEmployerViewCount: false,
      });

      expect(result).toEqual({ showEmployerViewCount: false });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(auditPublisher.record).not.toHaveBeenCalled();
    });
  });
});
