import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApplicationDtoSchema,
  ApplicationStageChangedDataSchema,
  JobOpeningDtoSchema,
  SMART_TOPICS,
} from '@smart/contracts';
import type {
  ApplicationDto,
  CreateApplicationRequest,
  CreateJobOpeningRequest,
  JobOpeningDto,
  ListJobOpeningsQuery,
  ListJobOpeningsResponse,
  SkillProficiency,
} from '@smart/contracts';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

/** Row shape the DTO mapper needs; `stream` has no column and is never persisted. */
interface OpeningRow {
  id: string;
  institutionId: string;
  companyName: string;
  roleTitle: string;
  domainCode: string | null;
  minYearsExperience: number | null;
  maxYearsExperience: number | null;
  location: string | null;
  employmentType: string | null;
  headcount: number | null;
  status: string;
  createdAt: Date;
  requiredSkills: { minProficiency: string; skill: { code: string } }[];
}

/** Persisted application row; `matchScore` arrives as a Prisma `Decimal`. */
interface ApplicationRow {
  id: string;
  openingId: string;
  studentId: string;
  stage: string;
  matchScore: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/** AC-T05 shortlisting is TPO-mediated, so the created row is never `APPLIED`. */
const SHORTLIST_STAGE = 'SHORTLISTED' as const;

/**
 * CO-T01 structured job openings (Th6-I116). TPO-authored: `institutionId` and
 * `createdById` always come from the access token, never from the request body.
 */
@Injectable()
export class PlacementService {
  readonly owner = 'Vedika G';
  readonly purpose = 'JD records, shortlists, outcome ingestion.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
  ) {}

  async createOpening(
    institutionId: string,
    createdById: string,
    body: CreateJobOpeningRequest,
  ): Promise<JobOpeningDto> {
    const requestedCodes = body.requiredSkills.map((requirement) => requirement.skillCode);

    const row = await this.prisma.$transaction(async (tx) => {
      const skills = await tx.skill.findMany({
        where: { code: { in: requestedCodes } },
        select: { id: true, code: true },
      });
      const skillIdByCode = new Map(skills.map((skill) => [skill.code, skill.id]));

      const missing: string[] = [];
      const requirements: { skillId: string; minProficiency: SkillProficiency }[] = [];
      for (const requirement of body.requiredSkills) {
        const skillId = skillIdByCode.get(requirement.skillCode);
        if (!skillId) {
          missing.push(requirement.skillCode);
          continue;
        }
        requirements.push({ skillId, minProficiency: requirement.minProficiency });
      }

      if (missing.length > 0) {
        // Codes are valid INF-05 taxonomy (contract-validated) but absent from
        // the database. Seeding those rows is INF-05 (Vedika) — never create
        // them here, and never fall back to another skill.
        throw new ServiceUnavailableException({
          error: 'taxonomy_not_seeded',
          message: `INF-05 skills are not seeded in this environment: ${missing.join(', ')}.`,
          statusCode: 503,
        });
      }

      return tx.jobOpening.create({
        data: {
          institutionId,
          createdById,
          companyName: body.companyName,
          roleTitle: body.roleTitle,
          domainCode: body.domain,
          minYearsExperience: body.minYearsExperience,
          maxYearsExperience: body.maxYearsExperience,
          location: body.location,
          employmentType: body.employmentType,
          headcount: body.headcount,
          requiredSkills: { create: requirements },
        },
        include: { requiredSkills: { include: { skill: { select: { code: true } } } } },
      });
    });

    return toJobOpeningDto(row);
  }

  async listOpenings(
    institutionId: string,
    query: ListJobOpeningsQuery,
  ): Promise<ListJobOpeningsResponse> {
    const rows = await this.prisma.jobOpening.findMany({
      where: { institutionId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { requiredSkills: { include: { skill: { select: { code: true } } } } },
    });
    return { openings: rows.map((row) => toJobOpeningDto(row)) };
  }

  async getOpening(institutionId: string, openingId: string): Promise<JobOpeningDto> {
    const row = await this.prisma.jobOpening.findFirst({
      where: { id: openingId, institutionId },
      include: { requiredSkills: { include: { skill: { select: { code: true } } } } },
    });
    if (!row) {
      // Another institution's opening is indistinguishable from a missing one.
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job opening not found.',
        statusCode: 404,
      });
    }
    return toJobOpeningDto(row);
  }

  /**
   * AC-T05: shortlist one AC-T04 candidate against an opening. Both sides of
   * the pair are re-checked against the token's institution, so a body that
   * names another tenant's opening or student cannot create a cross-tenant row.
   *
   * The `smart.application.stage_changed` event is the SE-T07 integration
   * point — the candidate notification is delivered by that service, not here.
   */
  async createApplication(
    institutionId: string,
    body: CreateApplicationRequest,
  ): Promise<ApplicationDto> {
    const opening = await this.prisma.jobOpening.findFirst({
      where: { id: body.openingId, institutionId },
      select: { id: true },
    });
    if (!opening) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job opening not found.',
        statusCode: 404,
      });
    }

    // One query covers "no such user", "another tenant's user" and "not a
    // student" — none of which should be distinguishable to the caller.
    const student = await this.prisma.user.findFirst({
      where: { id: body.studentId, institutionId, role: 'STUDENT' },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student not found in this institution.',
        statusCode: 404,
      });
    }

    let row: ApplicationRow;
    try {
      row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.application.create({
          data: {
            openingId: body.openingId,
            studentId: body.studentId,
            stage: SHORTLIST_STAGE,
            matchScore: body.matchScore ?? null,
          },
        });
        await tx.applicationStageEvent.create({
          data: {
            applicationId: created.id,
            fromStage: null,
            toStage: SHORTLIST_STAGE,
          },
        });
        return created;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      throw new ConflictException({
        error: 'conflict',
        message: 'This candidate has already been shortlisted for this opening.',
        statusCode: 409,
      });
    }

    const dto = toApplicationDto(row);
    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.applicationStageChanged,
      partitionKey: dto.applicationId,
      eventType: SMART_TOPICS.applicationStageChanged,
      source: 'placement',
      data: ApplicationStageChangedDataSchema.parse({
        applicationId: dto.applicationId,
        openingId: dto.openingId,
        studentId: dto.studentId,
        fromStage: null,
        toStage: SHORTLIST_STAGE,
        changedAt: dto.createdAt,
      }),
    });

    return dto;
  }
}

/** Prisma unique-constraint failure, i.e. this pair is already shortlisted. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

/** Maps a persisted application onto the frozen `ApplicationDto`. */
export function toApplicationDto(row: ApplicationRow): ApplicationDto {
  return ApplicationDtoSchema.parse({
    applicationId: row.id,
    openingId: row.openingId,
    studentId: row.studentId,
    stage: row.stage,
    matchScore:
      row.matchScore === null || row.matchScore === undefined ? null : Number(row.matchScore),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

/**
 * Maps a persisted opening onto the frozen `JobOpeningDto`. Parsed through the
 * contract so the response cannot drift; a row that predates the structured
 * form (no experience range, no taxonomy skills) is a data-integrity fault
 * rather than something to fabricate a value for.
 */
export function toJobOpeningDto(row: OpeningRow): JobOpeningDto {
  const parsed = JobOpeningDtoSchema.safeParse({
    openingId: row.id,
    institutionId: row.institutionId,
    companyName: row.companyName,
    roleTitle: row.roleTitle,
    domain: row.domainCode,
    requiredSkills: row.requiredSkills.map((requirement) => ({
      skillCode: requirement.skill.code,
      minProficiency: requirement.minProficiency,
    })),
    minYearsExperience: row.minYearsExperience,
    maxYearsExperience: row.maxYearsExperience,
    location: row.location,
    employmentType: row.employmentType,
    headcount: row.headcount,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  });
  if (!parsed.success) {
    throw new InternalServerErrorException({
      error: 'opening_not_structured',
      message: `Job opening ${row.id} does not satisfy the CO-T01 structured JD contract.`,
      statusCode: 500,
    });
  }
  return parsed.data;
}
