import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrustService } from './trust.service.js';
import {
  TrustCaseStatus,
  TrustCaseSeverity,
  EnforcementStatus,
  EnforcementActionType,
  AppealStatus,
  NotificationKind,
} from '../../generated/prisma/index.js';

describe('TrustService', () => {
  let service: TrustService;
  let prisma: any;
  let auditPublisher: any;
  let scoreQueue: any;

  const mockCandidateId = '11111111-1111-1111-1111-111111111111';
  const mockAdminId = '22222222-2222-2222-2222-222222222222';
  const mockCaseId = '33333333-3333-3333-3333-333333333333';
  const mockEnforcementId = '44444444-4444-4444-4444-444444444444';
  const mockAppealId = '55555555-5555-5555-5555-555555555555';

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      trustCase: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      enforcementAction: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      userAccountHold: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      notification: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      trustAppeal: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      trustReport: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      profileAccessLog: {
        create: vi.fn(),
        count: vi.fn(),
      },
    };

    auditPublisher = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    scoreQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job_1' }),
    };

    service = new TrustService(prisma, auditPublisher, scoreQueue);
  });

  describe('createCase', () => {
    it('should create a new trust case and publish audit event', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: mockCandidateId,
        email: 'candidate@smart.edu',
      });
      prisma.trustCase.create.mockResolvedValue({
        id: mockCaseId,
        candidateId: mockCandidateId,
        severity: TrustCaseSeverity.HIGH,
        summary: 'Proctoring anomaly',
        status: TrustCaseStatus.OPEN,
      });

      const res = await service.createCase(
        { candidateId: mockCandidateId, severity: 'HIGH', summary: 'Proctoring anomaly' },
        mockAdminId,
      );

      expect(res.id).toBe(mockCaseId);
      expect(prisma.trustCase.create).toHaveBeenCalledWith({
        data: {
          candidateId: mockCandidateId,
          severity: TrustCaseSeverity.HIGH,
          summary: 'Proctoring anomaly',
          status: TrustCaseStatus.OPEN,
        },
        include: { candidate: { select: { id: true, fullName: true, email: true } } },
      });
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'trust.case.created',
          actorId: mockAdminId,
          resourceId: mockCaseId,
        }),
      );
    });

    it('should throw NotFoundException if candidate does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.createCase({ candidateId: mockCandidateId, severity: 'LOW', summary: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyEnforcementAction', () => {
    it('should create sanction, apply account hold, update user, queue job and create notification', async () => {
      prisma.trustCase.findUnique.mockResolvedValue({
        id: mockCaseId,
        candidateId: mockCandidateId,
        status: TrustCaseStatus.OPEN,
      });
      prisma.enforcementAction.create.mockResolvedValue({
        id: mockEnforcementId,
        trustCaseId: mockCaseId,
        candidateId: mockCandidateId,
        actionType: EnforcementActionType.RESTRICT_ASSESSMENTS,
        status: EnforcementStatus.ACTIVE,
      });
      prisma.userAccountHold.create.mockResolvedValue({ id: 'hold_1' });
      prisma.user.update.mockResolvedValue({ id: mockCandidateId, heldAt: new Date() });
      prisma.trustCase.update.mockResolvedValue({ id: mockCaseId });
      prisma.notification.create.mockResolvedValue({ id: 'notif_1' });

      const res = await service.applyEnforcementAction(
        mockCaseId,
        {
          actionType: 'RESTRICT_ASSESSMENTS',
          reason: 'Unassisted proctoring anomaly detected',
        },
        mockAdminId,
      );

      expect(res.id).toBe(mockEnforcementId);
      expect(prisma.userAccountHold.create).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockCandidateId },
        data: {
          heldAt: expect.any(Date),
          heldReason: 'Unassisted proctoring anomaly detected',
        },
      });
      expect(scoreQueue.add).toHaveBeenCalledWith(
        'recalculate_post_enforcement',
        expect.objectContaining({ candidateId: mockCandidateId }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: mockCandidateId,
          kind: NotificationKind.TRUST_ENFORCEMENT,
          title: 'Account Notice: RESTRICT ASSESSMENTS',
          body: 'An administrative action (RESTRICT_ASSESSMENTS) was applied to your account. Reason: Unassisted proctoring anomaly detected',
        },
      });
    });

    it('should throw BadRequestException if an active enforcement action of the same type already exists', async () => {
      prisma.trustCase.findUnique.mockResolvedValue({
        id: mockCaseId,
        candidateId: mockCandidateId,
        status: TrustCaseStatus.OPEN,
      });
      prisma.enforcementAction.findFirst.mockResolvedValue({
        id: mockEnforcementId,
        actionType: EnforcementActionType.RESTRICT_ASSESSMENTS,
        status: EnforcementStatus.ACTIVE,
      });

      await expect(
        service.applyEnforcementAction(
          mockCaseId,
          { actionType: 'RESTRICT_ASSESSMENTS', reason: 'Duplicate test' },
          mockAdminId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reverseEnforcementAction', () => {
    it('should mark sanction reversed, lift account holds, and clear user held fields if no holds remain', async () => {
      prisma.enforcementAction.findUnique.mockResolvedValue({
        id: mockEnforcementId,
        trustCaseId: mockCaseId,
        candidateId: mockCandidateId,
        actionType: EnforcementActionType.RESTRICT_ASSESSMENTS,
        status: EnforcementStatus.ACTIVE,
      });
      prisma.enforcementAction.update.mockResolvedValue({
        id: mockEnforcementId,
        status: EnforcementStatus.REVERSED,
      });
      prisma.userAccountHold.findMany.mockResolvedValue([{ id: 'hold_1' }]);
      prisma.userAccountHold.update.mockResolvedValue({ id: 'hold_1', liftedAt: new Date() });
      prisma.userAccountHold.count.mockResolvedValue(0);

      const res = await service.reverseEnforcementAction(
        mockEnforcementId,
        { reversalReason: 'Appeal upheld' },
        mockAdminId,
      );

      expect(res.status).toBe(EnforcementStatus.REVERSED);
      expect(prisma.userAccountHold.update).toHaveBeenCalledWith({
        where: { id: 'hold_1' },
        data: expect.objectContaining({ liftReason: 'Appeal upheld' }),
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockCandidateId },
        data: { heldAt: null, heldReason: null },
      });
    });

    it('should throw BadRequestException if enforcement action is not ACTIVE', async () => {
      prisma.enforcementAction.findUnique.mockResolvedValue({
        id: mockEnforcementId,
        status: EnforcementStatus.REVERSED,
      });

      await expect(
        service.reverseEnforcementAction(
          mockEnforcementId,
          { reversalReason: 'Error' },
          mockAdminId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveAppeal', () => {
    it('should uphold appeal and auto-reverse underlying enforcement action', async () => {
      prisma.trustAppeal.findUnique.mockResolvedValue({
        id: mockAppealId,
        enforcementActionId: mockEnforcementId,
        candidateId: mockCandidateId,
        status: AppealStatus.SUBMITTED,
      });
      prisma.trustAppeal.update.mockResolvedValue({
        id: mockAppealId,
        status: AppealStatus.UPHELD,
      });

      // Mock reverseEnforcementAction dependencies
      prisma.enforcementAction.findUnique.mockResolvedValue({
        id: mockEnforcementId,
        trustCaseId: mockCaseId,
        candidateId: mockCandidateId,
        actionType: EnforcementActionType.RESTRICT_ASSESSMENTS,
        status: EnforcementStatus.ACTIVE,
      });
      prisma.enforcementAction.update.mockResolvedValue({
        id: mockEnforcementId,
        status: EnforcementStatus.REVERSED,
      });
      prisma.userAccountHold.findMany.mockResolvedValue([]);
      prisma.userAccountHold.count.mockResolvedValue(0);

      const res = await service.resolveAppeal(
        mockAppealId,
        { decision: 'UPHELD', reviewNotes: 'Documented identity clear' },
        mockAdminId,
      );

      expect(res.status).toBe(AppealStatus.UPHELD);
      expect(prisma.enforcementAction.update).toHaveBeenCalledWith({
        where: { id: mockEnforcementId },
        data: expect.objectContaining({ status: EnforcementStatus.REVERSED }),
      });
    });
  });

  describe('logProfileAccess', () => {
    it('should log access and create suspicious activity trust case if IP threshold exceeded', async () => {
      prisma.profileAccessLog.create.mockResolvedValue({ id: 'log_1' });
      prisma.profileAccessLog.count.mockResolvedValue(35); // Exceeds threshold of 30
      prisma.trustCase.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: mockCandidateId });
      prisma.trustCase.create.mockResolvedValue({ id: mockCaseId });

      await service.logProfileAccess(
        mockCandidateId,
        undefined,
        '192.168.1.100',
        'Mozilla/5.0',
        'john-doe',
      );

      expect(prisma.profileAccessLog.create).toHaveBeenCalled();
      expect(prisma.trustCase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          candidateId: mockCandidateId,
          severity: TrustCaseSeverity.LOW,
          summary: expect.stringContaining('High-frequency profile access'),
        }),
        include: { candidate: { select: { id: true, fullName: true, email: true } } },
      });
    });
  });
});
