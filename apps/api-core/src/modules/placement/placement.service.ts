import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JobOpeningDtoSchema } from '@smart/contracts';
import type {
  CreateJobOpeningRequest,
  JobOpeningDto,
  ListJobOpeningsQuery,
  ListJobOpeningsResponse,
  SkillProficiency,
} from '@smart/contracts';
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

/**
 * CO-T01 structured job openings (Th6-I116). TPO-authored: `institutionId` and
 * `createdById` always come from the access token, never from the request body.
 */
@Injectable()
export class PlacementService {
  readonly owner = 'Vedika G';
  readonly purpose = 'JD records, shortlists, outcome ingestion.';

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
