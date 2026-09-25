import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  toApplicationStatus,
  type AddCandidateNoteRequest,
  type ApplicationOutcome,
  type AssignRecruiterRequest,
  type AssignRecruiterResponse,
  type AtsStage,
  type CandidateNote,
  type ListCandidateNotesResponse,
  type RecordApplicationOutcomeRequest,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { requireCompanyActor } from '../company-profile/company-access.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { orgIdOf } from './hiring.service.js';

function notFound() {
  return new NotFoundException({
    error: 'not_found',
    message: 'Application not found.',
    statusCode: 404,
  });
}

function invalid(path: string, message: string) {
  return new UnprocessableEntityException({
    error: 'validation_failed',
    message,
    statusCode: 422,
    details: [{ path, message }],
  });
}

/**
 * Th6-416/417/420 — what a company does with a candidate besides moving them: internal notes,
 * recruiter assignment and offer/joining outcomes. Everything is company-scoped (another company's
 * application is a 404), audited in the same transaction, and safe to retry with an Idempotency-Key.
 * None of it is ever returned by a student endpoint.
 */
@Injectable()
export class CandidateWorkflowService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  /** The application, only if it belongs to the caller's company. */
  private async ownedApplication(
    db: Pick<Prisma.TransactionClient, 'application'>,
    applicationId: string,
    companyId: string,
  ) {
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { opening: { select: { companyId: true, institutionId: true } } },
    });
    if (!application || application.opening.companyId !== companyId) throw notFound();
    return application;
  }

  /* ------------------------------------------ notes (416) ----------------------------------------- */

  async listNotes(userId: string, applicationId: string): Promise<ListCandidateNotesResponse> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.applicants.view');
    await this.ownedApplication(this.prisma, applicationId, actor.companyId);
    const rows = await this.prisma.applicationNote.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
    const authors = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((row) => row.authorId))] } },
      select: { id: true, fullName: true },
    });
    const names = new Map(authors.map((author) => [author.id, author.fullName]));
    return {
      notes: rows.map((row) => ({
        id: row.id,
        applicationId: row.applicationId,
        body: row.body,
        authorId: row.authorId,
        authorName: names.get(row.authorId) ?? 'Former team member',
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async addNote(
    userId: string,
    applicationId: string,
    params: { key: string; body: AddCandidateNoteRequest },
  ): Promise<CandidateNote> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.applicants.manage');
    return this.idempotency.run({
      userId,
      scope: `candidate.note:${applicationId}`,
      key: params.key,
      request: { body: params.body.body },
      execute: async (tx) => {
        const application = await this.ownedApplication(tx, applicationId, actor.companyId);
        const orgId = orgIdOf(application.opening);
        const note = await tx.applicationNote.create({
          data: { applicationId, orgId, authorId: userId, body: params.body.body },
        });
        const author = await tx.user.findUnique({
          where: { id: userId },
          select: { fullName: true },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'application.note_added',
            resourceType: 'application',
            resourceId: applicationId,
            // The audit row records that a note exists, not what it says.
            metadata: {
              orgId,
              source: 'employer_board',
              noteId: note.id,
              at: note.createdAt.toISOString(),
            },
          },
        });
        return {
          result: {
            id: note.id,
            applicationId,
            body: note.body,
            authorId: userId,
            authorName: author?.fullName ?? 'Team member',
            createdAt: note.createdAt.toISOString(),
          },
        };
      },
    });
  }

  /* -------------------------------------- assignment (417) --------------------------------------- */

  async assign(
    userId: string,
    applicationId: string,
    params: { key: string; body: AssignRecruiterRequest },
  ): Promise<AssignRecruiterResponse> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.applicants.manage');
    return this.idempotency.run({
      userId,
      scope: `candidate.assign:${applicationId}`,
      key: params.key,
      request: { assigneeId: params.body.assigneeId },
      execute: async (tx) => {
        const application = await this.ownedApplication(tx, applicationId, actor.companyId);
        let assigneeName: string | null = null;
        if (params.body.assigneeId) {
          // The assignee must be an active member of THIS company; anything else is a validation error.
          const assignee = await tx.user.findFirst({
            where: {
              id: params.body.assigneeId,
              role: 'COMPANY',
              companyId: actor.companyId,
              deactivatedAt: null,
            },
            select: { fullName: true },
          });
          if (!assignee) {
            throw invalid('assigneeId', 'Choose an active member of your company team.');
          }
          assigneeName = assignee.fullName;
        }
        const previous = application.assigneeId ?? null;
        if (previous !== params.body.assigneeId) {
          await tx.application.update({
            where: { id: applicationId },
            data: { assigneeId: params.body.assigneeId },
          });
          await tx.auditLog.create({
            data: {
              actorId: userId,
              action: 'application.assignee_changed',
              resourceType: 'application',
              resourceId: applicationId,
              metadata: {
                orgId: orgIdOf(application.opening),
                source: 'employer_board',
                before: { assigneeId: previous },
                after: { assigneeId: params.body.assigneeId },
                at: new Date().toISOString(),
              },
            },
          });
        }
        return {
          result: {
            applicationId,
            assigneeId: params.body.assigneeId,
            assigneeName,
          },
        };
      },
    });
  }

  /* -------------------------------------- outcomes (420) --------------------------------------- */

  async recordOutcome(
    userId: string,
    applicationId: string,
    params: { key: string; body: RecordApplicationOutcomeRequest },
  ): Promise<ApplicationOutcome> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.applicants.manage');
    const { offerOutcome, joiningOutcome, joiningDate, note } = params.body;
    return this.idempotency.run({
      userId,
      scope: `candidate.outcome:${applicationId}`,
      key: params.key,
      request: { offerOutcome, joiningOutcome, joiningDate, note },
      execute: async (tx) => {
        const application = await this.ownedApplication(tx, applicationId, actor.companyId);
        const status = toApplicationStatus(application.stage as AtsStage);
        // An offer outcome needs an offer; a joining outcome needs a hire. Nothing else is recordable.
        if (offerOutcome && status !== 'OFFERED' && status !== 'HIRED') {
          throw invalid(
            'offerOutcome',
            'Move the candidate to Offered before recording an offer outcome.',
          );
        }
        if (joiningOutcome && status !== 'HIRED') {
          throw invalid(
            'joiningOutcome',
            'Move the candidate to Hired before recording a joining outcome.',
          );
        }
        if (joiningDate && Number.isNaN(Date.parse(`${joiningDate}T00:00:00Z`))) {
          throw invalid('joiningDate', 'That date does not exist.');
        }
        const orgId = orgIdOf(application.opening);
        const before = await tx.applicationOutcome.findUnique({ where: { applicationId } });
        const data = {
          ...(offerOutcome ? { offerOutcome } : {}),
          ...(joiningOutcome ? { joiningOutcome } : {}),
          ...(joiningDate ? { joiningDate: new Date(`${joiningDate}T00:00:00Z`) } : {}),
          ...(note ? { note } : {}),
          recordedBy: userId,
        };
        const row = await tx.applicationOutcome.upsert({
          where: { applicationId },
          create: { applicationId, orgId, ...data },
          update: data,
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'application.outcome_recorded',
            resourceType: 'application',
            resourceId: applicationId,
            metadata: {
              orgId,
              source: 'employer_board',
              before: {
                offerOutcome: before?.offerOutcome ?? null,
                joiningOutcome: before?.joiningOutcome ?? null,
              },
              after: { offerOutcome: row.offerOutcome, joiningOutcome: row.joiningOutcome },
              at: row.updatedAt.toISOString(),
            },
          },
        });
        return {
          result: {
            applicationId,
            offerOutcome: row.offerOutcome,
            joiningOutcome: row.joiningOutcome,
            joiningDate: row.joiningDate ? row.joiningDate.toISOString().slice(0, 10) : null,
            recordedAt: row.updatedAt.toISOString(),
          },
        };
      },
    });
  }
}
