import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  Optional,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  ApplicationConfidenceDtoSchema,
  ApplicationDtoSchema,
  ApplicationStageChangedDataSchema,
  CandidateApplicationDtoSchema,
  EmploymentTypeSchema,
  JobOpeningAttachedDocumentSchema,
  JdSkillExtractVectorSchema,
  JobOpeningDtoSchema,
  ParseOpeningJdResponseSchema,
  PlacementRecordDtoSchema,
  SEND_TO_COMPANY_STAGE,
  SMART_TOPICS,
  SkillTaxonomyDomainSchema,
  UploadJobOpeningDocumentResponseSchema,
  UploadJobOpeningLogoResponseSchema,
} from '@smart/contracts';
import type {
  ApplicationConfidenceDto,
  ApplicationDto,
  AtsStage,
  CandidateApplicationDto,
  CreateApplicationRequest,
  CreateJobOpeningRequest,
  JobOpeningAttachedDocument,
  JobOpeningDto,
  UploadJobOpeningDocumentResponse,
  UploadJobOpeningLogoResponse,
  ListApplicationsResponse,
  ListJobOpeningsQuery,
  ListJobOpeningsResponse,
  ListMyApplicationsResponse,
  PlacementRecordDto,
  ParseOpeningJdResponse,
  RecordOutcomeRequest,
  SkillProficiency,
} from '@smart/contracts';
import { z } from 'zod';
import type { Prisma } from '../../generated/prisma/index.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { JD_PARSE_QUEUE } from '../../platform/queue/queue.names.js';

const JOB_OPENING_DOC_MAX_BYTES = 10 * 1024 * 1024;
const JOB_OPENING_LOGO_MAX_BYTES = 2 * 1024 * 1024;
const JOB_OPENING_DOC_MIME = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const JOB_OPENING_LOGO_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png']);

/** Row shape the DTO mapper needs; `stream` has no column and is never persisted. */
interface OpeningRow {
  id: string;
  institutionId: string;
  companyName: string;
  roleTitle: string;
  domainCode: string | null;
  categoryCode: string | null;
  minYearsExperience: number | null;
  maxYearsExperience: number | null;
  location: string | null;
  employmentType: string | null;
  headcount: number | null;
  companyLogoUrl: string | null;
  attachedDocuments: unknown;
  aboutCompany: string | null;
  companyOffers: string | null;
  additionalCompanyDetails: string | null;
  roleDetails: string | null;
  salaryDetails: string | null;
  roundDetails: string | null;
  hiringDetails: string | null;
  driveSpoc: string | null;
  driveDate: Date | null;
  lastDateToApply: Date | null;
  status: string;
  createdAt: Date;
  rawText?: string | null;
  jdParseStatus?: string;
  parseConfidence?: unknown;
  parsedAt?: Date | null;
  parsedRequirements?: unknown;
  requiredSkills: { minProficiency: string; skill: { code: string } }[];
}

function calendarDateToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isoDateToCalendarDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function parseAttachedDocuments(raw: unknown): JobOpeningAttachedDocument[] | null {
  if (raw === null || raw === undefined) return null;
  const parsed = z.array(JobOpeningAttachedDocumentSchema).safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

/** Coerce legacy rows so list/get does not 500 the whole institution when one field is null. */
function normalizeOpeningRow(row: OpeningRow): OpeningRow {
  const domain = SkillTaxonomyDomainSchema.safeParse(row.domainCode);
  const employmentType = EmploymentTypeSchema.safeParse(row.employmentType);
  const minYears = row.minYearsExperience ?? 0;
  const maxYears = row.maxYearsExperience ?? minYears;

  return {
    ...row,
    domainCode: domain.success ? domain.data : 'SOFTWARE_IT',
    location: row.location?.trim() ? row.location.trim() : 'Unspecified',
    employmentType: employmentType.success ? employmentType.data : 'FULL_TIME',
    minYearsExperience: minYears,
    maxYearsExperience: maxYears < minYears ? minYears : maxYears,
  };
}

function attachedDocumentsForCreate(
  body: CreateJobOpeningRequest,
): Prisma.InputJsonValue | undefined {
  if (!body.attachedDocuments?.length) return undefined;
  return body.attachedDocuments as Prisma.InputJsonValue;
}

function openingExtendedFields(body: CreateJobOpeningRequest) {
  return {
    categoryCode: body.categoryId ?? null,
    companyLogoUrl: body.companyLogoStorageKey ?? null,
    attachedDocuments: attachedDocumentsForCreate(body),
    aboutCompany: body.aboutCompany ?? null,
    companyOffers: body.companyOffers ?? null,
    additionalCompanyDetails: body.additionalCompanyDetails ?? null,
    roleDetails: body.roleDetails ?? null,
    salaryDetails: body.salaryDetails ?? null,
    roundDetails: body.roundDetails ?? null,
    hiringDetails: body.hiringDetails ?? null,
    driveSpoc: body.driveSpoc ?? null,
    driveDate: body.driveDate ? isoDateToCalendarDate(body.driveDate) : null,
    lastDateToApply: body.lastDateToApply ? isoDateToCalendarDate(body.lastDateToApply) : null,
  };
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
  student?: {
    fullName: string;
    email: string;
    primaryTrack?: { code: string } | null;
  } | null;
}

interface CandidateApplicationRow extends ApplicationRow {
  opening: {
    companyName: string;
    roleTitle: string;
    location: string | null;
    employmentType: string | null;
    domainCode: string | null;
  };
}

/** AC-T05 shortlisting is TPO-mediated, so the created row is never `APPLIED`. */
const SHORTLIST_STAGE = 'SHORTLISTED' as const;

/**
 * CO-T01 structured job openings (Th6-I116), AC-T05 shortlist, and CO-T02 ATS
 * Kanban. `institutionId` always comes from the access token, never the body.
 */
@Injectable()
export class PlacementService {
  readonly owner = 'Vedika G';
  readonly purpose = 'JD records, shortlists, outcome ingestion.';
  private readonly logger = new Logger(PlacementService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Optional() @Inject(StorageService) private readonly storageService?: StorageService,
    @InjectQueue(JD_PARSE_QUEUE) private readonly jdParseQueue: Queue<{ openingId: string }>,
  ) {}

  async uploadOpeningDocument(
    institutionId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
    labelRaw?: string,
  ): Promise<UploadJobOpeningDocumentResponse> {
    if (!this.storageService) {
      throw new BadRequestException({
        error: 'storage_unavailable',
        message: 'Document upload is unavailable in this environment.',
        statusCode: 400,
      });
    }

    if (!JOB_OPENING_DOC_MIME.has(file.mimeType)) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Only PDF, JPG, and PNG files are accepted.',
        statusCode: 400,
      });
    }
    if (file.buffer.byteLength > JOB_OPENING_DOC_MAX_BYTES) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Each attachment must be 10MB or smaller.',
        statusCode: 400,
      });
    }

    const label = labelRaw?.trim();
    const objectKey = await this.storageService.upload({
      buffer: file.buffer,
      namespace: `job-opening-docs/${institutionId}`,
      fileName: file.fileName,
      contentType: file.mimeType,
    });

    return UploadJobOpeningDocumentResponseSchema.parse({
      documentId: randomUUID(),
      fileName: file.fileName,
      fileUrl: objectKey,
      mimeType: file.mimeType,
      fileSizeBytes: file.buffer.byteLength,
      ...(label ? { label } : {}),
    });
  }

  async uploadOpeningLogo(
    institutionId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<UploadJobOpeningLogoResponse> {
    if (!this.storageService) {
      throw new BadRequestException({
        error: 'storage_unavailable',
        message: 'Logo upload is unavailable in this environment.',
        statusCode: 400,
      });
    }

    if (!JOB_OPENING_LOGO_MIME.has(file.mimeType)) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Only JPG and PNG logo images are accepted.',
        statusCode: 400,
      });
    }
    if (file.buffer.byteLength > JOB_OPENING_LOGO_MAX_BYTES) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'The logo must be 2MB or smaller.',
        statusCode: 400,
      });
    }

    const storageKey = await this.storageService.upload({
      buffer: file.buffer,
      namespace: `job-opening-logos/${institutionId}`,
      fileName: file.fileName,
      contentType: file.mimeType,
    });

    const previewUrl = await this.storageService.getSignedDownloadUrl(storageKey);

    return UploadJobOpeningLogoResponseSchema.parse({
      storageKey,
      previewUrl,
      fileName: file.fileName,
      mimeType: file.mimeType,
    });
  }

  private async resolveCompanyLogoUrl(objectKey: string | null): Promise<string | undefined> {
    if (!objectKey || !this.storageService) return undefined;
    try {
      return await this.storageService.getSignedDownloadUrl(objectKey);
    } catch {
      return undefined;
    }
  }

  private async toJobOpeningDtoAsync(row: OpeningRow): Promise<JobOpeningDto> {
    const normalized = normalizeOpeningRow(row);
    const companyLogoUrl = await this.resolveCompanyLogoUrl(normalized.companyLogoUrl);
    return toJobOpeningDto(normalized, { companyLogoUrl });
  }

  private async mapOpeningRowSafely(row: OpeningRow): Promise<JobOpeningDto | null> {
    try {
      return await this.toJobOpeningDtoAsync(row);
    } catch (error) {
      this.logger.warn(
        `Skipping job opening ${row.id} for institution ${row.institutionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

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
          headcount: body.headcount ?? 1,
          ...openingExtendedFields(body),
          rawText: body.rawText?.trim() || null,
          requiredSkills: { create: requirements },
        },
        include: { requiredSkills: { include: { skill: { select: { code: true } } } } },
      });
    });

    if (body.rawText?.trim()) {
      await this.jdParseQueue.add('parse-opening-jd', { openingId: row.id });
    }

    return this.toJobOpeningDtoAsync(row as OpeningRow);
  }

  async parseOpeningJd(institutionId: string, openingId: string): Promise<ParseOpeningJdResponse> {
    const opening = await this.prisma.jobOpening.findFirst({
      where: { id: openingId, institutionId },
      select: {
        id: true,
        rawText: true,
        jdParseStatus: true,
        parseConfidence: true,
        parsedRequirements: true,
      },
    });
    if (!opening) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job opening not found.',
        statusCode: 404,
      });
    }
    if (!opening.rawText?.trim()) {
      throw new UnprocessableEntityException({
        error: 'validation_error',
        message: 'This opening has no job description text to parse.',
        statusCode: 422,
      });
    }

    await this.prisma.jobOpening.update({
      where: { id: openingId },
      data: { jdParseStatus: 'PENDING' },
    });
    await this.jdParseQueue.add('parse-opening-jd', { openingId });

    const extracted = opening.parsedRequirements
      ? JdSkillExtractVectorSchema.safeParse(opening.parsedRequirements)
      : null;

    return ParseOpeningJdResponseSchema.parse({
      openingId,
      jdParseStatus: 'PENDING',
      parseConfidence:
        opening.parseConfidence === null || opening.parseConfidence === undefined
          ? null
          : Number(opening.parseConfidence),
      extractedRequirements: extracted?.success ? extracted.data : null,
    });
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
    const mapped = await Promise.all(rows.map((row) => this.mapOpeningRowSafely(row)));
    return { openings: mapped.filter((opening): opening is JobOpeningDto => opening !== null) };
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
    return this.toJobOpeningDtoAsync(row);
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
    await this.enqueueStageChanged({
      applicationId: dto.applicationId,
      openingId: dto.openingId,
      studentId: dto.studentId,
      fromStage: null,
      toStage: SHORTLIST_STAGE,
      changedAt: dto.createdAt,
    });

    return dto;
  }

  async listApplications(
    institutionId: string,
    openingId: string,
  ): Promise<ListApplicationsResponse> {
    const opening = await this.prisma.jobOpening.findFirst({
      where: { id: openingId, institutionId },
      select: { id: true },
    });
    if (!opening) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job opening not found.',
        statusCode: 404,
      });
    }

    const rows = await this.prisma.application.findMany({
      where: { openingId },
      include: {
        student: {
          select: {
            fullName: true,
            email: true,
            primaryTrack: { select: { code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { applications: rows.map((row) => toApplicationDto(row)) };
  }

  /**
   * CN-T06: candidate My Applications. Identity is the access-token `sub` —
   * never a client-supplied studentId. When `inst` is present, the opening's
   * institution is constrained as well so a token cannot read across tenants.
   */
  async listMyApplications(
    studentId: string,
    institutionId: string | null,
  ): Promise<ListMyApplicationsResponse> {
    const rows = await this.prisma.application.findMany({
      where: {
        studentId,
        ...(institutionId ? { opening: { institutionId } } : {}),
      },
      include: {
        opening: {
          select: {
            companyName: true,
            roleTitle: true,
            location: true,
            employmentType: true,
            domainCode: true,
          },
        },
        student: {
          select: {
            fullName: true,
            email: true,
            primaryTrack: { select: { code: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { applications: rows.map((row) => toCandidateApplicationDto(row)) };
  }

  async patchApplicationStage(
    institutionId: string,
    applicationId: string,
    newStage: AtsStage,
  ): Promise<ApplicationDto> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        opening: { select: { institutionId: true } },
        student: {
          select: {
            fullName: true,
            email: true,
            primaryTrack: { select: { code: true } },
          },
        },
      },
    });

    if (!application || application.opening.institutionId !== institutionId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Application not found.',
        statusCode: 404,
      });
    }

    if (application.stage === newStage) {
      return toApplicationDto(application);
    }

    const fromStage = application.stage as AtsStage;

    const updatedRow = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: { stage: newStage },
        include: {
          student: {
            select: {
              fullName: true,
              email: true,
              primaryTrack: { select: { code: true } },
            },
          },
        },
      });

      await tx.applicationStageEvent.create({
        data: {
          applicationId,
          fromStage,
          toStage: newStage,
        },
      });

      return updated;
    });

    const dto = toApplicationDto(updatedRow);
    await this.enqueueStageChanged({
      applicationId: dto.applicationId,
      openingId: dto.openingId,
      studentId: dto.studentId,
      fromStage,
      toStage: newStage,
      changedAt: dto.updatedAt,
    });

    return dto;
  }

  /**
   * AC-T06: TPO reads the persisted SE-T02 shape (passed + explanation).
   * Grade itself is student-only and is not re-run here.
   */
  async getApplicationConfidence(
    institutionId: string,
    applicationId: string,
  ): Promise<ApplicationConfidenceDto> {
    const application = await this.requireApplication(institutionId, applicationId);
    return this.toConfidenceDto(application.id, application.studentId);
  }

  async sendToCompany(institutionId: string, applicationId: string): Promise<ApplicationDto> {
    const application = await this.requireApplication(institutionId, applicationId);
    const confidence = await this.toConfidenceDto(application.id, application.studentId);
    if (!confidence.complete) {
      throw new UnprocessableEntityException({
        error: 'validation_failed',
        message:
          confidence.sendBlockedReason ??
          'A complete SE-T02 confidence result is required before sending to the company.',
        statusCode: 422,
      });
    }

    if (application.stage === SEND_TO_COMPANY_STAGE) {
      return toApplicationDto(application);
    }

    if (application.stage !== 'SHORTLISTED') {
      throw new ConflictException({
        error: 'conflict',
        message: `Only SHORTLISTED applications can be sent to the company (current stage: ${application.stage}).`,
        statusCode: 409,
      });
    }

    return this.patchApplicationStage(institutionId, applicationId, SEND_TO_COMPANY_STAGE);
  }

  private async requireApplication(
    institutionId: string,
    applicationId: string,
  ): Promise<ApplicationRow & { opening: { institutionId: string } }> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        opening: { select: { institutionId: true } },
        student: {
          select: {
            fullName: true,
            email: true,
            primaryTrack: { select: { code: true } },
          },
        },
      },
    });

    if (!application || application.opening.institutionId !== institutionId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Application not found.',
        statusCode: 404,
      });
    }
    return application;
  }

  private async toConfidenceDto(
    applicationId: string,
    studentId: string,
  ): Promise<ApplicationConfidenceDto> {
    const latest = await this.prisma.skillVerificationAttempt.findFirst({
      where: { claim: { studentId } },
      orderBy: { createdAt: 'desc' },
      select: { passed: true, explanation: true },
    });

    const explanation = latest?.explanation?.trim() || null;
    const passed = latest?.passed ?? null;
    const available = latest !== null;
    const complete = passed !== null && explanation !== null && explanation.length >= 10;
    let sendBlockedReason: string | null = null;
    if (!available) {
      sendBlockedReason = 'No SE-T02 confidence result is on file for this candidate.';
    } else if (!complete) {
      sendBlockedReason =
        'Confidence result is incomplete — pass/fail or the one-line explanation is missing.';
    }

    return ApplicationConfidenceDtoSchema.parse({
      applicationId,
      studentId,
      available,
      complete,
      passed,
      explanation,
      // SE-T02 grade does not persist promptRef; do not invent one.
      promptRef: null,
      sendBlockedReason,
    });
  }

  /** Closes the placement feedback loop for ORION / QLIX recalibration. */
  async recordOutcome(
    institutionId: string,
    body: RecordOutcomeRequest,
  ): Promise<PlacementRecordDto> {
    const student = await this.prisma.user.findFirst({
      where: { id: body.studentId, institutionId, role: 'STUDENT' },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException({
        error: 'student_not_found',
        message: 'Student not found in your institution.',
        statusCode: 404,
      });
    }

    const track = await this.prisma.track.findUnique({
      where: { code: body.trackCode },
      select: { id: true, code: true },
    });
    if (!track) {
      throw new UnprocessableEntityException({
        error: 'unknown_track',
        message: `Unknown track code ${body.trackCode}.`,
        statusCode: 422,
      });
    }

    const certificate = await this.prisma.certificate.findFirst({
      where: { userId: body.studentId, status: 'ISSUED' },
      orderBy: { issuedAt: 'desc' },
      select: { headlineTier: true },
    });
    if (!certificate) {
      throw new UnprocessableEntityException({
        error: 'certificate_required',
        message: 'Record outcomes only for students with an issued certificate.',
        statusCode: 422,
      });
    }

    const row = await this.prisma.placementRecord.create({
      data: {
        userId: body.studentId,
        trackId: track.id,
        cycle: body.placementCycle,
        outcome: body.outcome,
        companyName: body.companyName,
        packageLpa: body.offeredPackageLpa,
      },
    });

    return PlacementRecordDtoSchema.parse({
      recordId: row.id,
      studentId: row.userId,
      trackCode: track.code,
      tierAtPlacement: certificate.headlineTier,
      placementCycle: row.cycle,
      companyName: row.companyName ?? body.companyName,
      outcome: row.outcome,
      interviewOffered: body.interviewOffered,
      jobOffered: body.jobOffered,
      offeredPackageLpa:
        row.packageLpa === null || row.packageLpa === undefined
          ? body.offeredPackageLpa
          : Number(row.packageLpa),
      recordedAt: row.createdAt.toISOString(),
    });
  }

  private async enqueueStageChanged(data: {
    applicationId: string;
    openingId: string;
    studentId: string;
    fromStage: AtsStage | null;
    toStage: AtsStage;
    changedAt: string;
  }): Promise<void> {
    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.applicationStageChanged,
      partitionKey: data.applicationId,
      eventType: SMART_TOPICS.applicationStageChanged,
      source: 'placement',
      data: ApplicationStageChangedDataSchema.parse(data),
    });
  }
}

/** Prisma unique-constraint failure, i.e. this pair is already shortlisted. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

/** Maps a persisted application onto the frozen candidate My Applications row. */
export function toCandidateApplicationDto(row: CandidateApplicationRow): CandidateApplicationDto {
  const employmentType = EmploymentTypeSchema.safeParse(row.opening.employmentType);
  const domain = SkillTaxonomyDomainSchema.safeParse(row.opening.domainCode);

  return CandidateApplicationDtoSchema.parse({
    ...toApplicationDto(row),
    companyName: row.opening.companyName,
    roleTitle: row.opening.roleTitle,
    location: row.opening.location ?? '',
    employmentType: employmentType.success ? employmentType.data : null,
    domain: domain.success ? domain.data : null,
  });
}

/** Maps a persisted application onto the frozen `ApplicationDto`. */
export function toApplicationDto(row: ApplicationRow): ApplicationDto {
  return ApplicationDtoSchema.parse({
    applicationId: row.id,
    openingId: row.openingId,
    studentId: row.studentId,
    studentName: row.student?.fullName,
    studentEmail: row.student?.email,
    primaryTrackCode: row.student?.primaryTrack?.code,
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
export function toJobOpeningDto(
  row: OpeningRow,
  options: { companyLogoUrl?: string } = {},
): JobOpeningDto {
  const extracted = row.parsedRequirements
    ? JdSkillExtractVectorSchema.safeParse(row.parsedRequirements)
    : null;
  const parsed = JobOpeningDtoSchema.safeParse({
    openingId: row.id,
    institutionId: row.institutionId,
    companyName: row.companyName,
    roleTitle: row.roleTitle,
    domain: row.domainCode,
    categoryId: row.categoryCode ?? undefined,
    requiredSkills: row.requiredSkills.map((requirement) => ({
      skillCode: requirement.skill.code,
      minProficiency: requirement.minProficiency,
    })),
    minYearsExperience: row.minYearsExperience,
    maxYearsExperience: row.maxYearsExperience,
    location: row.location,
    employmentType: row.employmentType,
    headcount: row.headcount ?? 1,
    companyLogoUrl: options.companyLogoUrl,
    attachedDocuments: parseAttachedDocuments(row.attachedDocuments) ?? undefined,
    aboutCompany: row.aboutCompany ?? undefined,
    companyOffers: row.companyOffers ?? undefined,
    additionalCompanyDetails: row.additionalCompanyDetails ?? undefined,
    roleDetails: row.roleDetails ?? undefined,
    salaryDetails: row.salaryDetails ?? undefined,
    roundDetails: row.roundDetails ?? undefined,
    hiringDetails: row.hiringDetails ?? undefined,
    driveSpoc: row.driveSpoc ?? undefined,
    driveDate: row.driveDate ? calendarDateToIso(row.driveDate) : undefined,
    lastDateToApply: row.lastDateToApply ? calendarDateToIso(row.lastDateToApply) : undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    rawText: row.rawText ?? undefined,
    jdParseStatus: row.jdParseStatus ?? undefined,
    parseConfidence:
      row.parseConfidence === null || row.parseConfidence === undefined
        ? null
        : Number(row.parseConfidence),
    parsedAt: row.parsedAt?.toISOString() ?? null,
    extractedRequirements: extracted?.success ? extracted.data : null,
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
