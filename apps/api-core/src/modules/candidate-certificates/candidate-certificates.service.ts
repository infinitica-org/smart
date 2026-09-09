import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  SKILL_CODE_SET,
  SKILL_DEFINITIONS,
  type AddCertificateSkillsRequest,
  type AdminCertificateReviewRequest,
  type CandidateCertificateDto,
  type CertificateVerificationEventDto,
  type CreateCandidateCertificateRequest,
  type GetCertificateEndorsementResponse,
  type ListCertificateVerificationEventsResponse,
  type ListCertificateVerificationQueueResponse,
  type ListMyCandidateCertificatesResponse,
  type SubmitCertificateEndorsementDecisionRequest,
  type SubmitCertificateEndorsementDecisionResponse,
  type UpdateCertificateLearningRequest,
} from '@smart/contracts';
import { env } from '../../platform/config/env.js';
import type { EmailJobPayload, EmailQueueJobData } from '../../platform/mailer/mailer.types.js';
import { EMAIL_QUEUE } from '../../platform/mailer/mailer.types.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { CertificateSourceVerificationService } from './verification/certificate-source-verification.service.js';
import { generateInviteToken, hashInviteToken } from '../invitations/invite-token.util.js';
import type {
  CandidateCertificate,
  CandidateCertificateSkill,
} from '../../generated/prisma/index.js';

const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ENDORSEMENT_TTL_DAYS = 7;

type CertificateRow = CandidateCertificate & { skills: CandidateCertificateSkill[] };

@Injectable()
export class CandidateCertificatesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailQueueJobData>,
    @Inject(CertificateSourceVerificationService)
    private readonly verificationService: CertificateSourceVerificationService,
  ) {}

  async create(
    candidateId: string,
    body: CreateCandidateCertificateRequest,
  ): Promise<CandidateCertificateDto> {
    const row = await this.prisma.candidateCertificate.create({
      data: {
        candidateId,
        title: body.title,
        issuer: body.issuer,
        certificateNumber: body.certificateNumber,
        verificationUrl: body.verificationUrl,
      },
      include: { skills: true },
    });

    await this.verificationService.runVerification(row.id);

    const updated = await this.prisma.candidateCertificate.findUniqueOrThrow({
      where: { id: row.id },
      include: { skills: true },
    });
    return this.toDto(updated);
  }

  async listMine(candidateId: string): Promise<ListMyCandidateCertificatesResponse> {
    const rows = await this.prisma.candidateCertificate.findMany({
      where: { candidateId },
      include: { skills: true },
      orderBy: { createdAt: 'desc' },
    });
    return { certificates: await Promise.all(rows.map((row) => this.toDto(row))) };
  }

  async getOwned(candidateId: string, id: string): Promise<CandidateCertificateDto> {
    const row = await this.findOwnedOrThrow(candidateId, id);
    return this.toDto(row);
  }

  async upload(
    candidateId: string,
    id: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<CandidateCertificateDto> {
    await this.findOwnedOrThrow(candidateId, id);

    if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Only PDF, JPG, and PNG files are accepted.',
        statusCode: 400,
      });
    }
    if (file.buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'The certificate file must be 10MB or smaller.',
        statusCode: 400,
      });
    }

    const objectKey = await this.storage.upload({
      buffer: file.buffer,
      namespace: `candidate-certificates/${candidateId}`,
      fileName: file.fileName,
      contentType: file.mimeType,
    });

    await this.prisma.candidateCertificate.update({
      where: { id },
      data: {
        certificateFileUrl: objectKey,
        certificateFileName: file.fileName,
        fileMimeType: file.mimeType,
        fileSizeBytes: file.buffer.byteLength,
        status: 'UPLOADED',
      },
      include: { skills: true },
    });
    await this.addEvent(id, 'UPLOADED', 'Certificate file uploaded.');
    await this.verificationService.runVerification(id);

    const updated = await this.prisma.candidateCertificate.findUniqueOrThrow({
      where: { id },
      include: { skills: true },
    });
    return this.toDto(updated);
  }

  async replaceSkills(
    candidateId: string,
    id: string,
    body: AddCertificateSkillsRequest,
  ): Promise<CandidateCertificateDto> {
    await this.findOwnedOrThrow(candidateId, id);

    for (const skill of body.skills) {
      if (!SKILL_CODE_SET.has(skill.skillCode)) {
        throw new BadRequestException({
          error: 'validation_failed',
          message: `Unknown skill code: ${skill.skillCode}`,
          statusCode: 400,
        });
      }
    }

    await this.prisma.$transaction([
      this.prisma.candidateCertificateSkill.deleteMany({ where: { candidateCertificateId: id } }),
      this.prisma.candidateCertificateSkill.createMany({
        data: body.skills.map((skill) => ({
          candidateCertificateId: id,
          skillCode: skill.skillCode,
          selfAssessedProficiency: skill.selfAssessedProficiency,
        })),
      }),
    ]);

    const updated = await this.prisma.candidateCertificate.findUniqueOrThrow({
      where: { id },
      include: { skills: true },
    });
    return this.toDto(updated);
  }

  async updateLearning(
    candidateId: string,
    id: string,
    body: UpdateCertificateLearningRequest,
  ): Promise<CandidateCertificateDto> {
    await this.findOwnedOrThrow(candidateId, id);
    await this.prisma.candidateCertificate.update({
      where: { id },
      data: {
        learningDescription: body.learningDescription,
        tools: body.tools,
        practicalApplied: body.practicalApplied,
        practicalDescription: body.practicalDescription,
        certificateNumber: body.certificateNumber,
        verificationUrl: body.verificationUrl,
      },
      include: { skills: true },
    });
    await this.verificationService.runVerification(id);

    const updated = await this.prisma.candidateCertificate.findUniqueOrThrow({
      where: { id },
      include: { skills: true },
    });
    return this.toDto(updated);
  }

  async requestEndorsement(
    candidateId: string,
    id: string,
    body: { endorserName: string; endorserEmail: string; endorserTitle?: string },
  ): Promise<CandidateCertificateDto> {
    const row = await this.findOwnedOrThrow(candidateId, id);
    this.assertReadyForVerification(row);

    const { raw, hash } = generateInviteToken();
    const expiresAt = new Date(Date.now() + ENDORSEMENT_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.certificateEndorsement.create({
      data: {
        candidateCertificateId: id,
        endorserName: body.endorserName,
        endorserEmail: body.endorserEmail,
        endorserTitle: body.endorserTitle,
        tokenHash: hash,
        expiresAt,
      },
    });

    const updated = await this.prisma.candidateCertificate.update({
      where: { id },
      data: { status: 'IN_VERIFICATION' },
      include: { skills: true },
    });
    await this.addEvent(id, 'IN_VERIFICATION', `Endorsement requested from ${body.endorserName}.`);

    const candidate = await this.prisma.user.findUniqueOrThrow({
      where: { id: candidateId },
      select: { fullName: true },
    });
    const endorsementUrl = `${env.VERIFY_APP_URL}/certificate-endorsement/${raw}`;
    await this.emailQueue.add('send', {
      to: body.endorserEmail,
      template: 'certificate-endorsement-request',
      data: {
        endorserName: body.endorserName,
        candidateName: candidate.fullName,
        certificateTitle: row.title,
        certificateIssuer: row.issuer,
        endorsementUrl,
        expiresAtFormatted: `${String(ENDORSEMENT_TTL_DAYS)} days`,
      },
    } satisfies EmailJobPayload);

    return this.toDto(updated);
  }

  async listEvents(
    candidateId: string,
    id: string,
  ): Promise<ListCertificateVerificationEventsResponse> {
    await this.findOwnedOrThrow(candidateId, id);
    const rows = await this.prisma.certificateVerificationEvent.findMany({
      where: { candidateCertificateId: id },
      orderBy: { createdAt: 'asc' },
    });
    return { events: rows.map(toEventDto) };
  }

  /** Public — resolves a raw endorsement token with no auth. Never leaks whether the token merely doesn't exist vs. is malformed. */
  async getEndorsementByToken(rawToken: string): Promise<GetCertificateEndorsementResponse> {
    const endorsement = await this.prisma.certificateEndorsement.findUnique({
      where: { tokenHash: hashInviteToken(rawToken) },
      include: {
        candidateCertificate: {
          include: { skills: true, candidate: { select: { fullName: true } } },
        },
      },
    });
    if (!endorsement) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'This endorsement link is invalid.',
        statusCode: 404,
      });
    }

    const certificate = endorsement.candidateCertificate;
    const isExpired = endorsement.status === 'PENDING' && endorsement.expiresAt < new Date();

    return {
      candidateName: certificate.candidate.fullName,
      certificateTitle: certificate.title,
      certificateIssuer: certificate.issuer,
      certificateFileUrl: certificate.certificateFileUrl
        ? await this.storage.getSignedDownloadUrl(certificate.certificateFileUrl)
        : null,
      skills: certificate.skills.map((skill) => ({
        skillName: SKILL_NAME_BY_CODE.get(skill.skillCode) ?? skill.skillCode,
        selfAssessedProficiency: skill.selfAssessedProficiency,
      })),
      learningDescription: certificate.learningDescription,
      tools: certificate.tools,
      practicalApplied: certificate.practicalApplied,
      practicalDescription: certificate.practicalDescription,
      status: isExpired ? 'EXPIRED' : endorsement.status,
      isExpired,
      isAlreadyResponded: endorsement.status !== 'PENDING',
    };
  }

  /** Public — records an endorser's decision. Idempotent guard: a second submission is rejected, not silently overwritten. */
  async submitEndorsementDecision(
    rawToken: string,
    body: SubmitCertificateEndorsementDecisionRequest,
  ): Promise<SubmitCertificateEndorsementDecisionResponse> {
    const endorsement = await this.prisma.certificateEndorsement.findUnique({
      where: { tokenHash: hashInviteToken(rawToken) },
    });
    if (!endorsement) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'This endorsement link is invalid.',
        statusCode: 404,
      });
    }
    if (endorsement.status !== 'PENDING') {
      throw new BadRequestException({
        error: 'conflict',
        message: 'This endorsement has already been responded to.',
        statusCode: 400,
      });
    }
    if (endorsement.expiresAt < new Date()) {
      await this.prisma.certificateEndorsement.update({
        where: { id: endorsement.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException({
        error: 'conflict',
        message: 'This endorsement link has expired.',
        statusCode: 400,
      });
    }

    const decisionStatus = body.approved ? 'APPROVED' : 'REJECTED';
    await this.prisma.$transaction([
      this.prisma.certificateEndorsement.update({
        where: { id: endorsement.id },
        data: { status: decisionStatus, comments: body.comments, respondedAt: new Date() },
      }),
      this.prisma.candidateCertificate.update({
        where: { id: endorsement.candidateCertificateId },
        data: {
          status: body.approved ? 'VERIFIED' : 'REJECTED',
          verificationMethod: body.approved ? 'ENDORSEMENT' : null,
        },
      }),
    ]);
    await this.addEvent(
      endorsement.candidateCertificateId,
      body.approved ? 'VERIFIED' : 'REJECTED',
      body.approved
        ? `Endorsed by ${endorsement.endorserName}.`
        : `Endorsement rejected by ${endorsement.endorserName}${body.comments ? `: ${body.comments}` : '.'}`,
    );

    return {
      status: decisionStatus,
      message: body.approved
        ? 'Thank you — your endorsement has been recorded.'
        : 'Your decision has been recorded.',
    };
  }

  private assertReadyForVerification(row: CertificateRow): void {
    const missing: string[] = [];
    if (!row.certificateFileUrl) missing.push('a certificate file');
    if (row.skills.length === 0) missing.push('at least one skill');
    if (!row.learningDescription) missing.push('what you learned');
    if (row.practicalApplied === null || row.practicalApplied === undefined) {
      missing.push('whether you applied this practically');
    }
    if (row.practicalApplied && !row.practicalDescription) {
      missing.push('a description of your practical application');
    }
    if (missing.length > 0) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: `Add ${missing.join(', ')} before requesting verification.`,
        statusCode: 400,
      });
    }
  }

  private async findOwnedOrThrow(candidateId: string, id: string): Promise<CertificateRow> {
    const row = await this.prisma.candidateCertificate.findUnique({
      where: { id },
      include: { skills: true },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Certificate not found.',
        statusCode: 404,
      });
    }
    if (row.candidateId !== candidateId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You can only manage your own certificates.',
        statusCode: 403,
      });
    }
    return row;
  }

  async listVerificationQueue(): Promise<ListCertificateVerificationQueueResponse> {
    const rows = await this.prisma.candidateCertificate.findMany({
      where: { sourceStatus: { in: ['pending', 'source_failed'] } },
      include: { skills: true },
      orderBy: { createdAt: 'asc' },
    });
    const certificates = await Promise.all(rows.map((row) => this.toDto(row)));
    return { certificates };
  }

  async adminApprove(
    id: string,
    body: AdminCertificateReviewRequest,
  ): Promise<CandidateCertificateDto> {
    await this.prisma.candidateCertificate.update({
      where: { id },
      data: {
        sourceStatus: 'source_verified',
        status: 'VERIFIED',
      },
    });
    await this.addEvent(
      id,
      'VERIFIED',
      body.reason
        ? `Super Admin approved: ${body.reason}`
        : 'Super Admin approved certificate source verification.',
    );
    const updated = await this.prisma.candidateCertificate.findUniqueOrThrow({
      where: { id },
      include: { skills: true },
    });
    return this.toDto(updated);
  }

  async adminVoid(
    id: string,
    body: AdminCertificateReviewRequest,
  ): Promise<CandidateCertificateDto> {
    await this.prisma.candidateCertificate.update({
      where: { id },
      data: {
        sourceStatus: 'voided',
        status: 'REJECTED',
      },
    });
    await this.addEvent(
      id,
      'REJECTED',
      body.reason
        ? `Super Admin voided: ${body.reason}`
        : 'Super Admin voided certificate source verification.',
    );
    const updated = await this.prisma.candidateCertificate.findUniqueOrThrow({
      where: { id },
      include: { skills: true },
    });
    return this.toDto(updated);
  }

  private async addEvent(
    candidateCertificateId: string,
    status: CertificateRow['status'],
    message: string,
  ): Promise<void> {
    await this.prisma.certificateVerificationEvent.create({
      data: { candidateCertificateId, status, message },
    });
  }

  private async toDto(row: CertificateRow): Promise<CandidateCertificateDto> {
    return {
      certificateId: row.id,
      candidateId: row.candidateId,
      title: row.title,
      issuer: row.issuer,
      status: row.status,
      sourceStatus: (row.sourceStatus as CandidateCertificateDto['sourceStatus']) ?? 'pending',
      certificateNumber: row.certificateNumber ?? null,
      verificationUrl: row.verificationUrl ?? null,
      verificationMethod: row.verificationMethod,
      certificateFileUrl: row.certificateFileUrl
        ? await this.storage.getSignedDownloadUrl(row.certificateFileUrl)
        : null,
      certificateFileName: row.certificateFileName,
      fileMimeType: row.fileMimeType,
      fileSizeBytes: row.fileSizeBytes,
      learningDescription: row.learningDescription,
      tools: row.tools,
      practicalApplied: row.practicalApplied,
      practicalDescription: row.practicalDescription,
      skills: row.skills.map((skill) => ({
        skillCode: skill.skillCode,
        skillName: SKILL_NAME_BY_CODE.get(skill.skillCode) ?? skill.skillCode,
        selfAssessedProficiency: skill.selfAssessedProficiency,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function toEventDto(row: {
  id: string;
  status: string;
  message: string;
  createdAt: Date;
}): CertificateVerificationEventDto {
  return {
    eventId: row.id,
    status: row.status as CertificateVerificationEventDto['status'],
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}
