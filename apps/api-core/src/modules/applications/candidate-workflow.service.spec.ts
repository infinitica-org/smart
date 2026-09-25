import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDS, withIdempotencyLedger } from '../company-profile/test-utils.js';
import { CandidateWorkflowService } from './candidate-workflow.service.js';

const APP = '99999999-9999-4999-8999-999999999999';
const at = new Date('2026-09-26T10:00:00Z');

describe('CandidateWorkflowService (Th6-416/417/420)', () => {
  let stage: string;
  let assigneeId: string | null;
  let member: any;
  let outcomeRow: any;
  let notes: any[];
  let prisma: any;
  let service: CandidateWorkflowService;

  const setup = (companyRole: string | null = 'RECRUITER') => {
    const ledger = withIdempotencyLedger({
      user: {
        findUnique: vi.fn(async ({ select }: any) =>
          select.role
            ? { role: 'COMPANY', companyId: IDS.companyA, companyRole, deactivatedAt: null }
            : { fullName: 'Rita Recruiter' },
        ),
        findMany: vi.fn(async () => [{ id: IDS.recruiter, fullName: 'Rita Recruiter' }]),
        findFirst: vi.fn(async () => member),
      },
      application: {
        findUnique: vi.fn(async ({ where }: any) =>
          where.id === APP
            ? {
                id: APP,
                stage,
                assigneeId,
                opening: { companyId: IDS.companyA, institutionId: 'inst' },
              }
            : null,
        ),
        update: vi.fn(async ({ data }: any) => {
          assigneeId = data.assigneeId;
        }),
      },
      applicationNote: {
        create: vi.fn(async ({ data }: any) => {
          const row = { id: `n${notes.length + 1}`, createdAt: at, ...data };
          notes.push(row);
          return row;
        }),
        findMany: vi.fn(async () => [...notes].reverse()),
      },
      applicationOutcome: {
        findUnique: vi.fn(async () => outcomeRow),
        upsert: vi.fn(async ({ create, update }: any) => {
          outcomeRow = {
            ...(outcomeRow ?? { offerOutcome: null, joiningOutcome: null, joiningDate: null }),
            ...(outcomeRow ? update : create),
            updatedAt: at,
          };
          return outcomeRow;
        }),
      },
    });
    prisma = ledger.prisma;
    service = new CandidateWorkflowService(prisma, ledger.idempotency);
  };

  beforeEach(() => {
    stage = 'APPLIED';
    assigneeId = null;
    member = { fullName: 'Rita Recruiter' };
    outcomeRow = null;
    notes = [];
    setup();
  });

  describe('notes (Th6-416)', () => {
    it('adds an internal note once, with an audit row that does not copy the text', async () => {
      const first = await service.addNote(IDS.recruiter, APP, {
        key: 'k1',
        body: { body: 'Great portfolio' },
      });
      const replay = await service.addNote(IDS.recruiter, APP, {
        key: 'k1',
        body: { body: 'Great portfolio' },
      });
      expect(replay).toEqual(first);
      expect(notes).toHaveLength(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const audit = prisma.auditLog.create.mock.calls[0][0].data;
      expect(audit.action).toBe('application.note_added');
      expect(JSON.stringify(audit)).not.toContain('Great portfolio');
    });

    it('lists notes newest first with the author name, and shows an empty list when there are none', async () => {
      expect((await service.listNotes(IDS.recruiter, APP)).notes).toEqual([]);
      await service.addNote(IDS.recruiter, APP, { key: 'k1', body: { body: 'one' } });
      const { notes: listed } = await service.listNotes(IDS.recruiter, APP);
      expect(listed[0]).toMatchObject({ body: 'one', authorName: 'Rita Recruiter' });
    });

    it("404s for another company's application and 403s for a non-company user", async () => {
      await expect(
        service.addNote(IDS.recruiter, 'missing', { key: 'k', body: { body: 'x' } }),
      ).rejects.toMatchObject({ status: 404 });
      setup(null);
      await expect(service.listNotes(IDS.recruiter, APP)).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('assignment (Th6-417)', () => {
    it('assigns an active team member once and audits before/after', async () => {
      const result = await service.assign(IDS.owner, APP, {
        key: 'a1',
        body: { assigneeId: IDS.recruiter },
      });
      expect(result).toEqual({
        applicationId: APP,
        assigneeId: IDS.recruiter,
        assigneeName: 'Rita Recruiter',
      });
      await service.assign(IDS.owner, APP, { key: 'a1', body: { assigneeId: IDS.recruiter } });
      expect(prisma.application.update).toHaveBeenCalledTimes(1);
      const audit = prisma.auditLog.create.mock.calls[0][0].data;
      expect(audit.metadata).toMatchObject({
        before: { assigneeId: null },
        after: { assigneeId: IDS.recruiter },
      });
    });

    it('rejects an assignee who is not an active member of the company (422) and writes nothing', async () => {
      member = null;
      await expect(
        service.assign(IDS.owner, APP, { key: 'a2', body: { assigneeId: IDS.otherCompanyUser } }),
      ).rejects.toMatchObject({ status: 422 });
      expect(prisma.application.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('unassigns with null', async () => {
      assigneeId = IDS.recruiter;
      const result = await service.assign(IDS.owner, APP, {
        key: 'a3',
        body: { assigneeId: null },
      });
      expect(result.assigneeId).toBeNull();
      expect(assigneeId).toBeNull();
    });
  });

  describe('outcomes (Th6-420)', () => {
    it('records an accepted offer while the candidate is Offered, once, with an audit row', async () => {
      stage = 'OFFER';
      const body = { offerOutcome: 'ACCEPTED' as const };
      const first = await service.recordOutcome(IDS.owner, APP, { key: 'o1', body });
      const replay = await service.recordOutcome(IDS.owner, APP, { key: 'o1', body });
      expect(replay).toEqual(first);
      expect(first.offerOutcome).toBe('ACCEPTED');
      expect(prisma.applicationOutcome.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe(
        'application.outcome_recorded',
      );
    });

    it('records joining with a date only once the candidate is Hired', async () => {
      stage = 'HIRED';
      const result = await service.recordOutcome(IDS.owner, APP, {
        key: 'o2',
        body: { joiningOutcome: 'JOINED', joiningDate: '2026-10-01' },
      });
      expect(result.joiningOutcome).toBe('JOINED');
    });

    it('refuses an offer outcome before an offer and a joining outcome before a hire (422)', async () => {
      stage = 'APPLIED';
      await expect(
        service.recordOutcome(IDS.owner, APP, { key: 'o3', body: { offerOutcome: 'DECLINED' } }),
      ).rejects.toMatchObject({ status: 422 });
      stage = 'OFFER';
      await expect(
        service.recordOutcome(IDS.owner, APP, { key: 'o4', body: { joiningOutcome: 'NO_SHOW' } }),
      ).rejects.toMatchObject({ status: 422 });
      expect(prisma.applicationOutcome.upsert).not.toHaveBeenCalled();
    });

    it('rejects an impossible date (422)', async () => {
      stage = 'HIRED';
      await expect(
        service.recordOutcome(IDS.owner, APP, {
          key: 'o5',
          body: { joiningOutcome: 'JOINED', joiningDate: '2026-13-45' },
        }),
      ).rejects.toMatchObject({ status: 422 });
    });
  });
});
