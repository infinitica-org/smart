import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { z } from 'zod';
import {
  AssociateEvidenceWithClaimRequestSchema,
  CreateEvidenceRequestSchema,
  CreateVerificationDecisionRequestSchema,
  LinkEvidenceToClaimRequestSchema,
  ProfessionalCredentialSchema,
  ProjectSkillMappingSchema,
  SaveOnboardingSelectionRequestSchema,
  UpdateEvidenceRequestSchema,
  evidenceRequiresRelatedSkills,
  type AssociateEvidenceWithClaimRequest,
  type AssociateEvidenceWithClaimResponse,
  type CandidateEvidenceProfileDto,
  type CandidateEvidenceProvenanceResponse,
  type EvidenceProvenanceItemDto,
  type EvidenceProvenanceSummary,
  type EvidenceRecordDto,
  type PassiveSignalEvidenceDto,
  type ProfessionalCredentialDto,
  type ProjectSkillMappingDto,
  type SkillClaimEvidenceLinkDto,
  type VerificationDecisionDto,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { CREDENTIAL_VERIFICATION_QUEUE } from '../../platform/queue/queue.names.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { CredentialDedupService } from '../candidate-certificates/verification/credential-dedup.service.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';
import { deriveEvidenceCategories } from './evidence-provenance.helper.js';
import {
  toEvidenceRecordDto,
  toPassiveSignalEvidenceDto,
  toProfessionalCredentialDto,
  toProjectSkillMappingDto,
  toSkillClaimEvidenceLinkDto,
  toVerificationDecisionDto,
} from './evidence.mapper.js';
import type { CredentialVerificationJobPayload } from './verification/credential-verification.processor.js';
import { SkillClaimAutoDeclareService } from '../assessment/skill-claim-auto-declare.service.js';

const CREDENTIAL_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const CREDENTIAL_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class EvidenceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
    @Inject(StorageService) private readonly storageService: StorageService,
    @InjectQueue(CREDENTIAL_VERIFICATION_QUEUE)
    private readonly credentialVerificationQueue: Queue<CredentialVerificationJobPayload>,
    @Inject(CredentialDedupService) private readonly dedup: CredentialDedupService,
    @Inject(SkillClaimAutoDeclareService)
    private readonly skillClaimAutoDeclare: SkillClaimAutoDeclareService,
    @Inject(AuditPublisherService)
    private readonly auditPublisher?: AuditPublisherService,
  ) {}

  async listEvidence(
    studentId: string,
    filters?: { skillCode?: string; claimId?: string; evidenceType?: string },
  ): Promise<EvidenceRecordDto[]> {
    const rows = await this.prisma.evidenceRecord.findMany({
      where: {
        studentId,
        ...(filters?.skillCode ? { relatedSkillCodes: { has: filters.skillCode } } : {}),
        ...(filters?.evidenceType
          ? { evidenceType: filters.evidenceType as EvidenceRecordDto['evidenceType'] }
          : {}),
        ...(filters?.claimId ? { claimLinks: { some: { claimId: filters.claimId } } } : {}),
      },
      include: { artifacts: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEvidenceRecordDto);
  }

  async getEvidence(studentId: string, evidenceId: string): Promise<EvidenceRecordDto> {
    const row = await this.prisma.evidenceRecord.findFirst({
      where: { id: evidenceId, studentId },
      include: { artifacts: true },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Evidence not found.',
        statusCode: 404,
      });
    }
    return toEvidenceRecordDto(row);
  }

  async createEvidence(studentId: string, body: unknown): Promise<EvidenceRecordDto> {
    const payload =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    const input = CreateEvidenceRequestSchema.parse({ ...payload, candidateId: studentId });
    const candidate = { claim: input.claim, relatedSkillIds: input.relatedSkillIds ?? [] };
    if (!evidenceRequiresRelatedSkills(candidate)) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Evidence with a claim must include at least one related skill.',
        statusCode: 400,
      });
    }

    const row = await this.prisma.evidenceRecord.create({
      data: {
        studentId,
        evidenceType: input.evidenceType,
        source: input.source,
        sourceOwner: input.sourceOwner,
        sourceReference: input.sourceReference,
        evidenceDate: input.evidenceDate,
        submissionDate: input.submissionDate ? new Date(input.submissionDate) : new Date(),
        claim: input.claim,
        context: input.context,
        provenance: input.provenance as Prisma.InputJsonValue | undefined,
        accessibility: input.accessibility ?? 'PRIVATE',
        relatedSkillCodes: input.relatedSkillIds ?? [],
        verificationStatus: 'PENDING',
        freshness: input.freshness as Prisma.InputJsonValue | undefined,
        sourceEntityId: input.sourceEntityId,
        sourcePayload: input.sourcePayload as Prisma.InputJsonValue | undefined,
        verificationMetadata: input.verificationMetadata as Prisma.InputJsonValue | undefined,
      },
      include: { artifacts: true },
    });

    await this.reconciliation.reconcileForStudent(studentId);
    return toEvidenceRecordDto(row);
  }

  async updateEvidence(
    studentId: string,
    evidenceId: string,
    body: unknown,
  ): Promise<EvidenceRecordDto> {
    await this.getEvidence(studentId, evidenceId);
    const input = UpdateEvidenceRequestSchema.parse(body);
    const candidate = {
      claim: input.claim,
      relatedSkillIds: input.relatedSkillIds ?? [],
    };
    if (input.claim !== undefined && !evidenceRequiresRelatedSkills(candidate)) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Evidence with a claim must include at least one related skill.',
        statusCode: 400,
      });
    }

    const row = await this.prisma.evidenceRecord.update({
      where: { id: evidenceId },
      data: {
        source: input.source,
        sourceOwner: input.sourceOwner,
        sourceReference: input.sourceReference,
        evidenceDate: input.evidenceDate,
        submissionDate: input.submissionDate ? new Date(input.submissionDate) : undefined,
        claim: input.claim,
        context: input.context,
        provenance: input.provenance as Prisma.InputJsonValue | undefined,
        accessibility: input.accessibility,
        relatedSkillCodes: input.relatedSkillIds,
        freshness: input.freshness as Prisma.InputJsonValue | undefined,
        sourceEntityId: input.sourceEntityId,
        sourcePayload: input.sourcePayload as Prisma.InputJsonValue | undefined,
        verificationMetadata: input.verificationMetadata as Prisma.InputJsonValue | undefined,
      },
      include: { artifacts: true },
    });
    await this.reconciliation.reconcileForStudent(studentId);
    return toEvidenceRecordDto(row);
  }

  async associateEvidenceWithClaim(
    studentId: string,
    claimIdParam: string | undefined,
    body: unknown,
  ): Promise<AssociateEvidenceWithClaimResponse> {
    const raw = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    let input: AssociateEvidenceWithClaimRequest;
    try {
      input = AssociateEvidenceWithClaimRequestSchema.parse({
        ...raw,
        claimId: claimIdParam ?? raw.claimId,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new BadRequestException({
          error: 'validation_failed',
          message: err.issues.map((e: z.ZodIssue) => e.message).join(' '),
          statusCode: 400,
        });
      }
      throw err;
    }

    const targetClaimId = input.claimId;
    if (!targetClaimId) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'A valid claimId must be provided in URL or request body.',
        statusCode: 400,
      });
    }

    // 1. Verify claim exists and belongs to studentId
    const claim = await this.prisma.skillClaim.findFirst({
      where: { id: targetClaimId, studentId },
    });
    if (!claim) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Skill claim not found.',
        statusCode: 404,
      });
    }

    // 2. Validate claim state (LOCKED claims cannot be updated with evidence)
    if (claim.status === 'LOCKED') {
      throw new BadRequestException({
        error: 'invalid_claim_state',
        message: 'Cannot associate evidence with a locked skill claim.',
        statusCode: 400,
      });
    }

    // 3. Verify all evidence records exist, belong to studentId, and are in valid states
    const evidenceRecords = await this.prisma.evidenceRecord.findMany({
      where: {
        id: { in: input.evidenceIds },
        studentId,
      },
    });

    if (evidenceRecords.length !== input.evidenceIds.length) {
      const foundIds = new Set(evidenceRecords.map((e) => e.id));
      const missing = input.evidenceIds.filter((id: string) => !foundIds.has(id));
      throw new NotFoundException({
        error: 'evidence_not_found',
        message: `Evidence record(s) not found: ${missing.join(', ')}`,
        statusCode: 404,
      });
    }

    const rejectedEvidence = evidenceRecords.filter((e) => e.verificationStatus === 'REJECTED');
    if (rejectedEvidence.length > 0) {
      throw new BadRequestException({
        error: 'invalid_evidence_state',
        message: `Cannot associate rejected evidence item(s): ${rejectedEvidence.map((e) => e.id).join(', ')}`,
        statusCode: 400,
      });
    }

    // 4. Atomic upsert to ensure idempotency and prevent duplicates
    const links = await this.prisma.$transaction(
      input.evidenceIds.map((evidenceId: string) =>
        this.prisma.skillClaimEvidenceLink.upsert({
          where: { claimId_evidenceId: { claimId: targetClaimId, evidenceId } },
          create: {
            claimId: targetClaimId,
            evidenceId,
            weight: input.weight,
          },
          update: { weight: input.weight },
        }),
      ),
    );

    // 5. Trigger asynchronous reconciliation & recalculations
    const reconciliation = await this.reconciliation.reconcileForStudent(studentId);

    // 6. Record audit log
    if (this.auditPublisher) {
      await this.auditPublisher.record({
        actorId: studentId,
        action: 'evidence.associated_with_claim',
        resourceType: 'skill_claim',
        resourceId: targetClaimId,
        reasonCode: null,
        metadata: {
          claimId: targetClaimId,
          evidenceIds: input.evidenceIds,
          associatedCount: links.length,
          weight: input.weight,
        },
      });
    }

    return {
      claimId: targetClaimId,
      associatedCount: links.length,
      links: links.map(toSkillClaimEvidenceLinkDto),
      reconciliation,
    };
  }

  async linkEvidenceToClaim(
    studentId: string,
    evidenceId: string,
    body: unknown,
  ): Promise<SkillClaimEvidenceLinkDto> {
    const raw = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    let input: { claimId: string; weight?: number };
    try {
      input = LinkEvidenceToClaimRequestSchema.parse({ ...raw, evidenceId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new BadRequestException({
          error: 'validation_failed',
          message: err.issues.map((e: z.ZodIssue) => e.message).join(' '),
          statusCode: 400,
        });
      }
      throw err;
    }
    const result = await this.associateEvidenceWithClaim(studentId, input.claimId, {
      claimId: input.claimId,
      evidenceIds: [evidenceId],
      weight: input.weight,
    });
    const link = result.links[0];
    if (!link) {
      throw new BadRequestException({
        error: 'association_failed',
        message: 'Failed to create evidence link.',
        statusCode: 400,
      });
    }
    return link;
  }

  async getEvidenceProfile(studentId: string): Promise<CandidateEvidenceProfileDto> {
    const profile = await this.prisma.candidateEvidenceProfile.findUnique({
      where: { studentId },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { careerDomainId: true, targetRoleId: true },
    });
    return {
      candidateId: studentId,
      careerDomainId: profile?.careerDomainId ?? user?.careerDomainId ?? undefined,
      targetRoleId: profile?.targetRoleId ?? user?.targetRoleId ?? undefined,
      selectedSkillCodes: profile?.selectedSkillCodes ?? [],
    };
  }

  async saveOnboardingSelection(
    studentId: string,
    body: unknown,
  ): Promise<CandidateEvidenceProfileDto> {
    const input = SaveOnboardingSelectionRequestSchema.parse(body);
    const profile = await this.prisma.candidateEvidenceProfile.upsert({
      where: { studentId },
      create: {
        studentId,
        careerDomainId: input.careerDomainId,
        targetRoleId: input.targetRoleId,
        selectedSkillCodes: input.confirmedSkillCodes,
      },
      update: {
        careerDomainId: input.careerDomainId,
        targetRoleId: input.targetRoleId,
        selectedSkillCodes: input.confirmedSkillCodes,
      },
    });
    await this.prisma.user.update({
      where: { id: studentId },
      data: {
        careerDomainId: input.careerDomainId,
        targetRoleId: input.targetRoleId,
      },
    });
    return {
      candidateId: studentId,
      careerDomainId: profile.careerDomainId ?? undefined,
      targetRoleId: profile.targetRoleId ?? undefined,
      selectedSkillCodes: profile.selectedSkillCodes,
    };
  }

  async listCredentials(studentId: string): Promise<ProfessionalCredentialDto[]> {
    const rows = await this.prisma.professionalCredential.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toProfessionalCredentialDto);
  }

  async createCredential(studentId: string, body: unknown): Promise<ProfessionalCredentialDto> {
    const input = ProfessionalCredentialSchema.omit({ credentialId: true }).parse(body);

    await this.dedup.assertNoDuplicate(studentId, {
      issuer: input.issuer,
      title: input.credentialName,
      identifierNumber: input.externalCredentialId,
    });

    const row = await this.prisma.professionalCredential.create({
      data: {
        studentId,
        issuer: input.issuer,
        credentialName: input.credentialName,
        credentialType: input.credentialType,
        externalCredentialId: input.externalCredentialId,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        jurisdiction: input.jurisdiction,
        scope: input.scope,
        verificationSource: input.verificationSource,
        // Status and verification method are never client-supplied: they can
        // only move once the verification pipeline actually confirms a claim.
        status: 'PENDING_VERIFICATION',
        assessmentType: input.assessmentType,
        practicalComponent: input.practicalComponent ?? false,
        coveredTopics: input.coveredTopics ?? [],
        coveredSkillCodes: input.coveredSkills ?? [],
        applicationEvidence: (input.applicationEvidence ?? []) as Prisma.InputJsonValue,
        verificationMethod: 'SELF_ATTESTED',
      },
    });

    await this.prisma.evidenceRecord.create({
      data: {
        studentId,
        evidenceType: 'CREDENTIAL',
        source: 'CANDIDATE',
        relatedSkillCodes: input.coveredSkills ?? [],
        sourceEntityId: row.id,
        claim: input.credentialName,
        verificationStatus: 'PENDING',
      },
    });

    await this.reconciliation.reconcileForStudent(studentId);
    await this.credentialVerificationQueue.add('verify-credential', { credentialId: row.id });

    return toProfessionalCredentialDto(row);
  }

  async uploadCredentialDocument(
    studentId: string,
    credentialId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<ProfessionalCredentialDto> {
    const existing = await this.prisma.professionalCredential.findFirst({
      where: { id: credentialId, studentId },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Professional credential not found.',
        statusCode: 404,
      });
    }
    if (!CREDENTIAL_DOCUMENT_ALLOWED_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Only PDF, JPG, and PNG files are accepted.',
        statusCode: 400,
      });
    }
    if (file.buffer.byteLength > CREDENTIAL_DOCUMENT_MAX_BYTES) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'The supporting document must be 5MB or smaller.',
        statusCode: 400,
      });
    }

    const objectKey = await this.storageService.upload({
      buffer: file.buffer,
      namespace: `credential-documents/${studentId}`,
      fileName: file.fileName,
      contentType: file.mimeType,
    });

    const row = await this.prisma.professionalCredential.update({
      where: { id: credentialId },
      data: { documentObjectKey: objectKey },
    });

    await this.credentialVerificationQueue.add('verify-credential', { credentialId: row.id });

    return toProfessionalCredentialDto(row);
  }

  async listPassiveSignals(studentId: string): Promise<PassiveSignalEvidenceDto[]> {
    const rows = await this.prisma.passiveSignalEvidence.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toPassiveSignalEvidenceDto);
  }

  async createVerificationDecision(
    studentId: string,
    body: unknown,
    reviewerId?: string,
  ): Promise<VerificationDecisionDto> {
    const input = CreateVerificationDecisionRequestSchema.parse(body);
    const claim = await this.prisma.skillClaim.findFirst({
      where: { id: input.claimId, studentId },
    });
    if (!claim) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Skill claim not found.',
        statusCode: 404,
      });
    }
    const row = await this.prisma.verificationDecision.create({
      data: {
        claimId: input.claimId,
        evidenceSummary: input.evidenceSummary,
        assessmentSummary: input.assessmentSummary,
        interviewSummary: input.interviewSummary,
        decision: input.decision,
        confidence: input.confidence,
        reasons: input.reasons ?? [],
        reviewerId: reviewerId ?? input.reviewerId,
      },
    });
    return toVerificationDecisionDto(row);
  }

  async listProjectSkillMappings(
    studentId: string,
    projectId: string,
  ): Promise<ProjectSkillMappingDto[]> {
    await this.assertProject(studentId, projectId);
    const rows = await this.prisma.projectSkillMapping.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toProjectSkillMappingDto);
  }

  async replaceProjectSkillMappings(
    studentId: string,
    projectId: string,
    body: unknown,
  ): Promise<ProjectSkillMappingDto[]> {
    await this.assertProject(studentId, projectId);
    const items = z.array(ProjectSkillMappingSchema).parse(body);
    await this.prisma.$transaction([
      this.prisma.projectSkillMapping.deleteMany({ where: { projectId } }),
      ...items.map((item) =>
        this.prisma.projectSkillMapping.create({
          data: {
            projectId,
            skillCode: item.skillCode,
            specificContribution: item.specificContribution,
            componentWorkedOn: item.componentWorkedOn,
            actionsPerformed: item.actionsPerformed ?? [],
            decisionsMade: item.decisionsMade ?? [],
            constraintsHandled: item.constraintsHandled ?? [],
            artifactId: item.artifactId,
            verificationStatus: item.verificationStatus ?? 'PENDING',
            activity: item.activity as Prisma.InputJsonValue | undefined,
          },
        }),
      ),
    ]);
    await this.skillClaimAutoDeclare.ensureClaimsForProjectTags(
      studentId,
      projectId,
      items.map((item) => item.skillCode),
    );
    return this.listProjectSkillMappings(studentId, projectId);
  }

  private async assertProject(studentId: string, projectId: string): Promise<void> {
    const row = await this.prisma.project.findFirst({
      where: { id: projectId, studentId },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Project not found.',
        statusCode: 404,
      });
    }
  }

  /**
   * VER-01 — Authorized employer/placement read endpoint for candidate evidence provenance readout.
   * Categorizes existing evidence records into provenance categories (SELF_DECLARED, SOURCE_VERIFIED, ASSESSED, HUMAN_REVIEWED).
   * Enforces strict server-side authorization:
   * - INSTITUTION_ADMIN / PLACEMENT_STAFF: candidate must belong to the caller's institution (user.inst).
   * - COMPANY / B2B_PARTNER: candidate must have an active Application for a JobOpening owned by user.companyId.
   * - SUPER_ADMIN: unrestricted read access.
   */
  async getCandidateEvidenceProvenance(
    caller: RequestUser,
    studentId: string,
  ): Promise<CandidateEvidenceProvenanceResponse> {
    const candidate = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true, institutionId: true },
    });

    if (!candidate || candidate.role !== 'STUDENT') {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Candidate not found.',
        statusCode: 404,
      });
    }

    // Authorization checks
    if (caller.role === 'SUPER_ADMIN') {
      // Allowed
    } else if (caller.role === 'INSTITUTION_ADMIN' || caller.role === 'PLACEMENT_STAFF') {
      if (!caller.inst || caller.inst !== candidate.institutionId) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'You do not have access to candidate evidence outside your institution.',
          statusCode: 403,
        });
      }
    } else if (caller.role === 'COMPANY' || caller.role === 'B2B_PARTNER') {
      if (!caller.companyId) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'Company account is not associated with a registered company.',
          statusCode: 403,
        });
      }

      const applicationCount = await this.prisma.application.count({
        where: {
          studentId,
          opening: {
            companyId: caller.companyId,
          },
        },
      });

      if (applicationCount === 0) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'You do not have authorization to view evidence for this candidate.',
          statusCode: 403,
        });
      }
    } else {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Unauthorized role to view candidate evidence provenance.',
        statusCode: 403,
      });
    }

    const [evidenceRows, decisions] = await Promise.all([
      this.prisma.evidenceRecord.findMany({
        where: { studentId },
        select: {
          id: true,
          evidenceType: true,
          source: true,
          verificationStatus: true,
          verificationMetadata: true,
          claim: true,
          context: true,
          relatedSkillCodes: true,
          evidenceStrength: true,
          evidenceReliability: true,
          sourceOwner: true,
          sourceReference: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.verificationDecision.findMany({
        where: { claim: { studentId }, reviewerId: { not: null } },
        select: { claimId: true, reviewerId: true },
      }),
    ]);

    const hasReviewerDecisionMap = decisions.length > 0;

    const summary: EvidenceProvenanceSummary = {
      SELF_DECLARED: 0,
      SOURCE_VERIFIED: 0,
      ASSESSED: 0,
      HUMAN_REVIEWED: 0,
    };

    const items: EvidenceProvenanceItemDto[] = evidenceRows.map((row) => {
      const categories = deriveEvidenceCategories({
        evidenceType: row.evidenceType,
        source: row.source,
        verificationStatus: row.verificationStatus,
        verificationMetadata: row.verificationMetadata as Record<string, unknown> | null,
        hasReviewerDecision: hasReviewerDecisionMap,
      });

      for (const cat of categories) {
        summary[cat]++;
      }

      return {
        evidenceId: row.id,
        evidenceType: row.evidenceType as EvidenceProvenanceItemDto['evidenceType'],
        source: row.source as EvidenceProvenanceItemDto['source'],
        verificationStatus:
          row.verificationStatus as EvidenceProvenanceItemDto['verificationStatus'],
        categories,
        claim: row.claim ?? undefined,
        context: row.context ?? undefined,
        relatedSkillIds: row.relatedSkillCodes,
        evidenceStrength:
          (row.evidenceStrength as EvidenceProvenanceItemDto['evidenceStrength']) ?? undefined,
        evidenceReliability:
          (row.evidenceReliability as EvidenceProvenanceItemDto['evidenceReliability']) ??
          undefined,
        sourceOwner: row.sourceOwner ?? undefined,
        sourceReference: row.sourceReference ?? undefined,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    });

    return {
      studentId,
      total: items.length,
      summary,
      items,
    };
  }
}
