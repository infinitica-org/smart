import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/index.js';
import type {
  MissingEvidenceItem,
  UniversityMessageStudentRequest,
  UniversityOpportunityRow,
  UniversityRosterQuery,
  UniversityRosterResponse,
  UniversityRosterRow,
  UniversityStudentSummary,
  UniversityVerificationStatus,
} from '@smart/contracts';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { ReadinessService } from '../readiness/readiness.service.js';
import { stripRecordingFields } from './recording-access.js';

const STAFF_ROLES = ['PLACEMENT_STAFF', 'INSTITUTION_ADMIN'] as const;

/**
 * Th6-442 — assumption, kept in one place so it is easy to change: a student's employer-contact
 * preference (Th6-224) does NOT stop university staff from messaging them. Staff are the student's
 * own institution, not an employer.
 */
export function studentPreferenceAllowsUniversityMessage(_studentId: string): boolean {
  return true;
}

interface StaffScope {
  readonly institutionId: string;
  /** The staff account's campus. Null means every campus of the institution. */
  readonly groupLabel: string | null;
}

interface RosterUser {
  id: string;
  fullName: string;
  email: string;
  graduationYear: number | null;
  onboardingCompleted: boolean;
  onboardingDetails: Prisma.JsonValue | null;
  skillClaims: { status: string }[];
}

export function programOf(details: Prisma.JsonValue | null | undefined): string | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const academic = (details as Record<string, unknown>).academicProgram;
  if (!academic || typeof academic !== 'object') return null;
  const program = (academic as Record<string, unknown>).studyProgram;
  return typeof program === 'string' && program.trim() ? program : null;
}

export function verificationStatusOf(claims: readonly { status: string }[]): {
  status: UniversityVerificationStatus;
  verified: number;
} {
  const verified = claims.filter((claim) => claim.status === 'VERIFIED').length;
  if (verified > 0) return { status: 'VERIFIED', verified };
  return { status: claims.length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED', verified };
}

export function toRosterRow(user: RosterUser): UniversityRosterRow {
  const { status, verified } = verificationStatusOf(user.skillClaims);
  return {
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    program: programOf(user.onboardingDetails),
    graduationYear: user.graduationYear,
    verificationStatus: status,
    verifiedSkillCount: verified,
    declaredSkillCount: user.skillClaims.length - verified,
    needsAssistance: !user.onboardingCompleted || user.skillClaims.length === 0,
  };
}

export function missingEvidenceFrom(
  requirements: UniversityStudentSummary['verification']['evidence']['requirements'],
): MissingEvidenceItem[] {
  // The readiness engine only emits evidence the blueprint REQUIRES, so an unmet row is a real gap.
  // Optional evidence is never in `requirements`, and therefore is never shown as a gap (Th6-338).
  return requirements
    .filter((row) => !row.met)
    .map((row) => ({
      skillCode: row.skillCode,
      skillName: row.skillName,
      level: row.level,
      requirement: row.requirement,
      needed:
        row.requirement === 'SUBSTANTIAL_APPLICATION'
          ? `A substantial project or application demonstrating ${row.skillName} at ${row.level} level.`
          : `Evidence of real-world use of ${row.skillName} at ${row.level} level.`,
    }));
}

/** UNI-04 — the university's view of its own students. Every read is scoped by institution + campus. */
@Injectable()
export class UniversityStudentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ReadinessService) private readonly readiness: ReadinessService,
    @Inject(MessagingService) private readonly messaging: MessagingService,
    @Inject(AuditPublisherService) private readonly audit: AuditPublisherService,
  ) {}

  /** Same campus rule as `InstitutionsService.listAssignedStudents`. */
  private async resolveScope(user: RequestUser): Promise<StaffScope> {
    const staff = user.inst
      ? await this.prisma.user.findFirst({
          where: { id: user.sub, institutionId: user.inst, role: { in: [...STAFF_ROLES] } },
          select: { groupLabel: true },
        })
      : null;
    if (!user.inst || !staff) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'This action requires a university staff account.',
        statusCode: 403,
      });
    }
    return { institutionId: user.inst, groupLabel: staff.groupLabel };
  }

  private scopeWhere(scope: StaffScope): Prisma.UserWhereInput {
    return {
      institutionId: scope.institutionId,
      role: 'STUDENT',
      ...(scope.groupLabel ? { groupLabel: scope.groupLabel } : {}),
    };
  }

  /* --------------------------- Th6-437 / 438 / 439 --------------------------- */

  async listRoster(
    user: RequestUser,
    query: UniversityRosterQuery,
  ): Promise<UniversityRosterResponse> {
    const scope = await this.resolveScope(user);
    const where: Prisma.UserWhereInput = this.scopeWhere(scope);
    const and: Prisma.UserWhereInput[] = [];

    if (query.verificationStatus === 'VERIFIED') {
      and.push({ skillClaims: { some: { status: 'VERIFIED' } } });
    } else if (query.verificationStatus === 'IN_PROGRESS') {
      and.push({ skillClaims: { some: {}, none: { status: 'VERIFIED' } } });
    } else if (query.verificationStatus === 'NOT_STARTED') {
      and.push({ skillClaims: { none: {} } });
    }
    if (query.program) {
      and.push({
        onboardingDetails: {
          path: ['academicProgram', 'studyProgram'],
          string_contains: query.program,
        },
      });
    }
    if (query.gradYear !== undefined) and.push({ graduationYear: query.gradYear });
    if (query.search) and.push({ fullName: { contains: query.search, mode: 'insensitive' } });
    if (and.length > 0) where.AND = and;

    const rows = await this.prisma.user.findMany({
      where,
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        fullName: true,
        email: true,
        graduationYear: true,
        onboardingCompleted: true,
        onboardingDetails: true,
        skillClaims: { select: { status: true } },
      },
    });
    const page = rows.slice(0, query.limit);
    return {
      items: page.map((row) => toRosterRow(row)),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /* ------------------------ Th6-440 / 441 / 443 / 444 ------------------------ */

  private async requireStudentInScope(scope: StaffScope, studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, ...this.scopeWhere(scope) },
      select: {
        id: true,
        fullName: true,
        email: true,
        graduationYear: true,
        onboardingCompleted: true,
        onboardingDetails: true,
        batch: { select: { name: true } },
        skillClaims: { select: { status: true } },
      },
    });
    // 404, not 403: a student outside the caller's scope must look like it does not exist.
    if (!student) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student not found.',
        statusCode: 404,
      });
    }
    return student;
  }

  async getStudentSummary(user: RequestUser, studentId: string): Promise<UniversityStudentSummary> {
    const scope = await this.resolveScope(user);
    const student = await this.requireStudentInScope(scope, studentId);
    const [readiness, applications] = await Promise.all([
      this.readiness.getSummary(student.id),
      this.prisma.application.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          stage: true,
          createdAt: true,
          opening: { select: { roleTitle: true, companyName: true } },
          outcome: { select: { offerOutcome: true, joiningOutcome: true, joiningDate: true } },
        },
      }),
    ]);

    const opportunities: UniversityOpportunityRow[] = applications.map((app) => ({
      applicationId: app.id,
      roleTitle: app.opening.roleTitle,
      companyName: app.opening.companyName,
      stage: app.stage,
      appliedAt: app.createdAt.toISOString(),
      offerOutcome: app.outcome?.offerOutcome ?? null,
      joiningOutcome: app.outcome?.joiningOutcome ?? null,
      joiningDate: app.outcome?.joiningDate?.toISOString().slice(0, 10) ?? null,
    }));

    return stripRecordingFields({
      student: { ...toRosterRow(student), batchName: student.batch?.name ?? null },
      verification: {
        identity: readiness.identity,
        evidence: readiness.evidence,
        skillDemonstration: readiness.skillDemonstration,
        proficiency: readiness.proficiency,
      },
      missingEvidence: missingEvidenceFrom(readiness.evidence.requirements),
      opportunities,
    });
  }

  /* --------------------------------- Th6-442 --------------------------------- */

  /**
   * Reuses the COM-01 messaging pipeline: one conversation per pair, the `Idempotency-Key` makes a retry
   * return the original message, and the single in-app notification is written in the same transaction
   * as the message, so a retry can never notify twice. Only a first send is audited.
   */
  async messageStudent(
    user: RequestUser,
    studentId: string,
    key: string,
    body: UniversityMessageStudentRequest,
  ) {
    const scope = await this.resolveScope(user);
    await this.requireStudentInScope(scope, studentId);
    if (!studentPreferenceAllowsUniversityMessage(studentId)) {
      throw new ForbiddenException({
        error: 'student_not_contactable',
        message: 'This student has asked not to be contacted.',
        statusCode: 403,
      });
    }

    const replay = await this.prisma.message.findUnique({
      where: { senderId_idempotencyKey: { senderId: user.sub, idempotencyKey: key } },
      select: { id: true },
    });
    const text = body.subject ? `${body.subject}\n\n${body.body}` : body.body;
    const result = await this.messaging.start(user.sub, {
      key,
      body: { recipientId: studentId, body: text },
    });
    if (!replay) {
      await this.audit.record({
        actorId: user.sub,
        action: 'university.student_messaged',
        resourceType: 'student',
        resourceId: studentId,
        reasonCode: null,
        metadata: {
          orgId: scope.institutionId,
          source: 'university_dashboard',
          conversationId: result.conversationId,
          messageId: result.message.id,
        },
      });
    }
    return result;
  }
}
