import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
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
  ReviewEvidenceRequestSchema,
  SaveOnboardingSelectionRequestSchema,
  UpdateEvidenceRequestSchema,
  evidenceRequiresRelatedSkills,
  type EvidenceVerificationStatus,
  type AssociateEvidenceWithClaimRequest,
  type AssociateEvidenceWithClaimResponse,
  type CandidateEvidenceProfileDto,
  type CandidateEvidenceProvenanceResponse,
  type CandidateEducationEvidenceResponse,
  type CandidateSkillClaimsResponse,
  type CandidateSkillClaimStatusDto,
  type CandidateDemonstratedSkillsResponse,
  type PlacementCandidateDemonstratedSkillDto,
  type PlacementCandidateEducationDto,
  type EvidenceProvenanceItemDto,
  type EvidenceProvenanceSummary,
  type EvidenceRecordDto,
  type EvidenceRecordVersionDto,
  type ListEvidenceRecordVersionsResponse,
  type PassiveSignalEvidenceDto,
  type ProfessionalCredentialDto,
  type ProjectSkillMappingDto,
  type ReviewEvidenceResponse,
  type SkillClaimEvidenceLinkDto,
  type VerificationDecisionDto,
  type EvidenceSkillDisputeRequest,
  type EvidenceSkillDisputeResponse,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import type { EvidenceRecordRow } from './evidence-version.snapshot.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import {
  CREDENTIAL_VERIFICATION_QUEUE,
  DEFAULT_JOB_OPTIONS,
  EVIDENCE_RECONCILIATION_QUEUE,
} from '../../platform/queue/queue.names.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { CredentialDedupService } from '../candidate-certificates/verification/credential-dedup.service.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';
import { deriveEvidenceCategories } from './evidence-provenance.helper.js';
import {
  isIdempotentReviewRequest,
  mapReviewDecisionToVerificationStatus,
  mergeReviewVerificationMetadata,
  reviewBlocksTerminalStatus,
  reviewDecisionConflict,
} from './evidence-review.logic.js';
import { assertReviewerCanMutateCandidateEvidence } from './evidence-reviewer-auth.helper.js';
import { assertCanReadCandidateEvidenceVersions } from './evidence-version-auth.helper.js';
import { EvidenceVersionService } from './evidence-version.service.js';
import {
  evidenceReconciliationJobId,
  type EvidenceReconciliationJobPayload,
} from './evidence-reconciliation.processor.js';
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
import { EvidenceSyncService } from './evidence-sync.service.js';
import { EvidenceSkillInferenceService } from './evidence-skill-inference.service.js';

const CREDENTIAL_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const CREDENTIAL_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
    @Inject(StorageService) private readonly storageService: StorageService,
    @InjectQueue(CREDENTIAL_VERIFICATION_QUEUE)
    private readonly credentialVerificationQueue: Queue<CredentialVerificationJobPayload>,
    @InjectQueue(EVIDENCE_RECONCILIATION_QUEUE)
    private readonly evidenceReconciliationQueue: Queue<EvidenceReconciliationJobPayload>,
    @Inject(CredentialDedupService) private readonly dedup: CredentialDedupService,
    @Inject(SkillClaimAutoDeclareService)
    private readonly skillClaimAutoDeclare: SkillClaimAutoDeclareService,
    @Inject(EvidenceSyncService) private readonly evidenceSync: EvidenceSyncService,
    @Inject(EvidenceSkillInferenceService)
    private readonly skillInference: EvidenceSkillInferenceService,
    @Inject(EvidenceVersionService)
    private readonly evidenceVersions: EvidenceVersionService,
    @Inject(AuditPublisherService)
    private readonly auditPublisher: AuditPublisherService,
  ) {}

  private async recomputeInferenceForSkills(
    studentId: string,
    skillCodes: readonly string[],
  ): Promise<void> {
    const codes = skillCodes.map((c) => c.trim()).filter(Boolean);
    if (codes.length === 0) return;
    await this.skillInference.recomputeForStudentSkills(studentId, codes);
  }

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

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.evidenceRecord.create({
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

      const organizationId = await this.evidenceVersions.resolveStudentOrganizationId(studentId);
      await this.evidenceVersions.createInitialVersion(tx, created, {
        mutationKey: `create:${created.id}`,
        actorId: studentId,
        organizationId,
        source: created.source,
        priorVerificationStatus: null,
        newVerificationStatus: created.verificationStatus,
      });

      return created;
    });

    await this.reconciliation.reconcileForStudent(studentId);
    await this.recomputeInferenceForSkills(studentId, row.relatedSkillCodes);
    return toEvidenceRecordDto(row);
  }

  async listEvidenceVersions(
    studentId: string,
    evidenceId: string,
  ): Promise<ListEvidenceRecordVersionsResponse> {
    return this.evidenceVersions.listStudentEvidenceVersions(studentId, evidenceId);
  }

  async getEvidenceVersion(
    studentId: string,
    evidenceId: string,
    versionNumber: number,
  ): Promise<EvidenceRecordVersionDto> {
    return this.evidenceVersions.getStudentEvidenceVersion(studentId, evidenceId, versionNumber);
  }

  async listCandidateEvidenceVersions(caller: RequestUser, studentId: string, evidenceId: string) {
    return this.evidenceVersions.listCandidateEvidenceVersions(caller, studentId, evidenceId);
  }

  async getCandidateEvidenceVersion(
    caller: RequestUser,
    studentId: string,
    evidenceId: string,
    versionNumber: number,
  ) {
    return this.evidenceVersions.getCandidateEvidenceVersion(
      caller,
      studentId,
      evidenceId,
      versionNumber,
    );
  }

  async updateEvidence(
    studentId: string,
    evidenceId: string,
    body: unknown,
  ): Promise<EvidenceRecordDto> {
    const existingRow = await this.prisma.evidenceRecord.findFirst({
      where: { id: evidenceId, studentId },
      include: { artifacts: true },
    });
    if (!existingRow) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Evidence not found.',
        statusCode: 404,
      });
    }

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

    const mergedCandidate = {
      ...existingRow,
      source: input.source ?? existingRow.source,
      sourceOwner: input.sourceOwner ?? existingRow.sourceOwner,
      sourceReference: input.sourceReference ?? existingRow.sourceReference,
      evidenceDate: input.evidenceDate ?? existingRow.evidenceDate,
      submissionDate: input.submissionDate
        ? new Date(input.submissionDate)
        : existingRow.submissionDate,
      claim: input.claim ?? existingRow.claim,
      context: input.context ?? existingRow.context,
      provenance: (input.provenance as Prisma.InputJsonValue | undefined) ?? existingRow.provenance,
      accessibility: input.accessibility ?? existingRow.accessibility,
      relatedSkillCodes: input.relatedSkillIds ?? existingRow.relatedSkillCodes,
      freshness: (input.freshness as Prisma.InputJsonValue | undefined) ?? existingRow.freshness,
      sourceEntityId: input.sourceEntityId ?? existingRow.sourceEntityId,
      sourcePayload:
        (input.sourcePayload as Prisma.InputJsonValue | undefined) ?? existingRow.sourcePayload,
      verificationMetadata:
        (input.verificationMetadata as Prisma.InputJsonValue | undefined) ??
        existingRow.verificationMetadata,
    } as EvidenceRecordRow;

    if (this.evidenceVersions.contentEquals(existingRow, mergedCandidate)) {
      return toEvidenceRecordDto(existingRow);
    }

    const contentHash = this.evidenceVersions.hashContent(mergedCandidate);
    const organizationId = await this.evidenceVersions.resolveStudentOrganizationId(studentId);

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.evidenceRecord.update({
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

      await this.evidenceVersions.appendVersion(tx, updated, {
        mutationKey: `update:${evidenceId}:${contentHash}`,
        actorId: studentId,
        organizationId,
        source: updated.source,
        priorVerificationStatus: existingRow.verificationStatus,
        newVerificationStatus: updated.verificationStatus,
      });

      return updated;
    });

    await this.reconciliation.reconcileForStudent(studentId);
    await this.recomputeInferenceForSkills(studentId, row.relatedSkillCodes);
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
      where: { id: input.claimId, studentId },
      include: { skill: { select: { code: true } } },
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
      where: { id: { in: input.evidenceIds }, studentId },
    });
    if (evidenceRecords.length !== input.evidenceIds.length) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'One or more evidence records not found.',
        statusCode: 404,
      });
    }

    const links: SkillClaimEvidenceLinkDto[] = [];
    for (const record of evidenceRecords) {
      const link = await this.prisma.skillClaimEvidenceLink.upsert({
        where: { claimId_evidenceId: { claimId: claim.id, evidenceId: record.id } },
        create: { claimId: claim.id, evidenceId: record.id, weight: 1 },
        update: { weight: 1 },
      });
      links.push({
        linkId: link.id,
        claimId: link.claimId,
        evidenceId: link.evidenceId,
        weight: Number(link.weight),
        createdAt: link.createdAt.toISOString(),
      });
    }

    await this.recomputeInferenceForSkills(studentId, [claim.skill.code]);
    const reconciliation = await this.reconciliation.reconcileForStudent(studentId);
    return {
      claimId: claim.id,
      associatedCount: links.length,
      links,
      reconciliation,
    };
  }

  async linkEvidenceToClaim(
    studentId: string,
    evidenceId: string,
    body: unknown,
  ): Promise<SkillClaimEvidenceLinkDto> {
    await this.getEvidence(studentId, evidenceId);
    const input = LinkEvidenceToClaimRequestSchema.parse(body);
    const claim = await this.prisma.skillClaim.findFirst({
      where: { id: input.claimId, studentId },
      include: { skill: { select: { code: true } } },
    });
    if (!claim) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Skill claim not found.',
        statusCode: 404,
      });
    }
    const link = await this.prisma.skillClaimEvidenceLink.upsert({
      where: { claimId_evidenceId: { claimId: input.claimId, evidenceId } },
      create: {
        claimId: input.claimId,
        evidenceId,
        weight: input.weight,
      },
      update: { weight: input.weight },
    });
    await this.recomputeInferenceForSkills(studentId, [claim.skill.code]);
    return {
      linkId: link.id,
      claimId: link.claimId,
      evidenceId: link.evidenceId,
      weight: Number(link.weight),
      createdAt: link.createdAt.toISOString(),
    };
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

    const organizationId = await this.evidenceVersions.resolveStudentOrganizationId(studentId);
    await this.prisma.$transaction(async (tx) => {
      const evidence = await tx.evidenceRecord.create({
        data: {
          studentId,
          evidenceType: 'CREDENTIAL',
          source: 'CANDIDATE',
          relatedSkillCodes: input.coveredSkills ?? [],
          sourceEntityId: row.id,
          claim: input.credentialName,
          verificationStatus: 'PENDING',
        },
        include: { artifacts: true },
      });

      await this.evidenceVersions.createInitialVersion(tx, evidence, {
        mutationKey: `create:${evidence.id}`,
        actorId: studentId,
        organizationId,
        source: evidence.source,
        priorVerificationStatus: null,
        newVerificationStatus: evidence.verificationStatus,
      });
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
    await this.evidenceSync.syncProjectEvidenceRecord(studentId, projectId);
    await this.evidenceSync.linkProjectEvidenceToTaggedClaims(
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
    if (row.isActive === false) {
      throw new BadRequestException({
        error: 'project_inactive',
        message: 'This project is inactive and cannot be updated.',
        statusCode: 400,
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
    const access = await assertCanReadCandidateEvidenceVersions(this.prisma, caller, studentId);

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
          sourceEntityId: true,
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
        sourceOwner: access.redacted ? undefined : (row.sourceOwner ?? undefined),
        sourceReference: access.redacted ? undefined : (row.sourceReference ?? undefined),
        sourceEntityId: row.sourceEntityId ?? undefined,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    });

    if (this.auditPublisher) {
      await this.auditPublisher.record({
        actorId: caller.sub,
        action: 'evidence.accessed',
        resourceType: 'candidate_evidence',
        resourceId: studentId,
        reasonCode: null,
        metadata: {
          studentId,
          callerRole: caller.role,
          companyId: caller.companyId ?? null,
          redacted: access.redacted,
          totalRecords: items.length,
        },
      });
    }

    return {
      studentId,
      total: items.length,
      summary,
      items,
    };
  }

  /**
   * VER-01 — Institution reviewer marks evidence accepted, rejected, or needing information.
   * Uses compare-and-set on verificationStatus; idempotent on identical reviewer decisions.
   */
  async reviewEvidence(
    caller: RequestUser,
    studentId: string,
    evidenceId: string,
    body: unknown,
  ): Promise<ReviewEvidenceResponse> {
    const input = ReviewEvidenceRequestSchema.parse(body);
    await assertReviewerCanMutateCandidateEvidence(this.prisma, caller, studentId);

    const record = await this.prisma.evidenceRecord.findFirst({
      where: { id: evidenceId, studentId },
      include: { artifacts: true },
    });
    if (!record) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Evidence not found for this candidate.',
        statusCode: 404,
      });
    }

    const currentStatus = record.verificationStatus as EvidenceVerificationStatus;
    const existingMetadata =
      (record.verificationMetadata as Record<string, unknown> | null) ?? null;

    if (reviewBlocksTerminalStatus(currentStatus)) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Expired evidence cannot be reviewed.',
        statusCode: 400,
      });
    }

    if (reviewDecisionConflict(currentStatus, input.decision)) {
      throw new ConflictException({
        error: 'conflict',
        message: 'Rejected evidence cannot be accepted without a new review workflow.',
        statusCode: 409,
      });
    }

    if (isIdempotentReviewRequest(currentStatus, existingMetadata, input.decision, caller.sub)) {
      const reconciliation = await this.ensureEvidenceReconciliationQueued(studentId, evidenceId);
      return {
        evidence: toEvidenceRecordDto(record),
        decision: input.decision,
        idempotent: true,
        reconciliation,
      };
    }

    const targetStatus = mapReviewDecisionToVerificationStatus(input.decision);

    const nowIso = new Date().toISOString();
    const mergedMetadata = mergeReviewVerificationMetadata(existingMetadata, {
      decision: input.decision,
      reviewerId: caller.sub,
      reviewerDisplay: caller.sub,
      reason: input.reason,
      requestedInformation: input.requestedInformation,
      nowIso,
    });

    const priorState = {
      verificationStatus: currentStatus,
      source: record.source,
      evidenceType: record.evidenceType,
      reviewRequired: existingMetadata?.reviewRequired ?? false,
    };

    const updateResult = await this.prisma.evidenceRecord.updateMany({
      where: {
        id: evidenceId,
        studentId,
        verificationStatus: currentStatus,
      },
      data: {
        verificationStatus: targetStatus,
        verificationMetadata: mergedMetadata as Prisma.InputJsonValue,
      },
    });

    if (updateResult.count === 0) {
      const refreshed = await this.prisma.evidenceRecord.findFirst({
        where: { id: evidenceId, studentId },
        include: { artifacts: true },
      });
      if (!refreshed) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'Evidence not found for this candidate.',
          statusCode: 404,
        });
      }

      const refreshedMetadata =
        (refreshed.verificationMetadata as Record<string, unknown> | null) ?? null;
      if (
        isIdempotentReviewRequest(
          refreshed.verificationStatus as EvidenceVerificationStatus,
          refreshedMetadata,
          input.decision,
          caller.sub,
        )
      ) {
        const reconciliation = await this.ensureEvidenceReconciliationQueued(studentId, evidenceId);
        return {
          evidence: toEvidenceRecordDto(refreshed),
          decision: input.decision,
          idempotent: true,
          reconciliation,
        };
      }

      throw new ConflictException({
        error: 'conflict',
        message: 'Evidence review conflict — another reviewer updated this record.',
        statusCode: 409,
      });
    }

    const updated = await this.prisma.evidenceRecord.findFirst({
      where: { id: evidenceId, studentId },
      include: { artifacts: true },
    });
    if (!updated) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Evidence not found after review.',
        statusCode: 404,
      });
    }

    if (this.auditPublisher) {
      await this.auditPublisher.record({
        actorId: caller.sub,
        action: 'evidence.updated',
        resourceType: 'evidence_record',
        resourceId: evidenceId,
        reasonCode: input.reason?.trim() ?? null,
        metadata: {
          priorState,
          newState: {
            verificationStatus: targetStatus,
            source: record.source,
            evidenceType: record.evidenceType,
            reviewRequired: mergedMetadata.reviewRequired ?? false,
          },
          source: record.source,
          evidenceType: record.evidenceType,
          decision: input.decision,
          institutionId: caller.inst ?? null,
          trigger: 'evidence_review',
          requestedInformation: input.requestedInformation ?? null,
        },
      });
    }

    const reconciliation = await this.ensureEvidenceReconciliationQueued(studentId, evidenceId);

    if (targetStatus === 'VERIFIED' && updated.relatedSkillCodes?.length > 0) {
      this.recomputeInferenceForSkills(studentId, updated.relatedSkillCodes).catch((err) => {
        this.logger.warn(
          `Failed cascading skill inference recomputation for student ${studentId}: ${err}`,
        );
      });
    }

    return {
      evidence: toEvidenceRecordDto(updated),
      decision: input.decision,
      idempotent: false,
      reconciliation,
    };
  }

  private async ensureEvidenceReconciliationQueued(
    studentId: string,
    evidenceId: string,
  ): Promise<ReviewEvidenceResponse['reconciliation']> {
    const jobId = evidenceReconciliationJobId(studentId, evidenceId);
    const existing = await this.evidenceReconciliationQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        await existing.retry();
        return { status: 'QUEUED', jobId };
      }
      if (state === 'completed') {
        return { status: 'COMPLETED', jobId };
      }
      if (state === 'active') {
        return { status: 'PROCESSING', jobId };
      }
      return { status: 'QUEUED', jobId };
    }

    try {
      await this.evidenceReconciliationQueue.add(
        'reconcile-student',
        { studentId, evidenceId, trigger: 'evidence_review' },
        { jobId, ...DEFAULT_JOB_OPTIONS },
      );
      return { status: 'QUEUED', jobId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/job.*exist/i.test(message)) {
        return { status: 'QUEUED', jobId };
      }
      const raced = await this.evidenceReconciliationQueue.getJob(jobId);
      if (raced) {
        return { status: 'QUEUED', jobId };
      }
      return { status: 'FAILED', jobId };
    }
  }

  async getCandidateEducation(
    caller: RequestUser,
    studentId: string,
  ): Promise<CandidateEducationEvidenceResponse> {
    const access = await assertCanReadCandidateEvidenceVersions(this.prisma, caller, studentId);

    const [educationRows, evidenceResponse] = await Promise.all([
      this.prisma.candidateEducation.findMany({
        where: { studentId },
        include: { documents: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.getCandidateEvidenceProvenance(caller, studentId),
    ]);

    const credentialItems = evidenceResponse.items.filter(
      (item) => item.evidenceType === 'CREDENTIAL',
    );

    const educationItems: PlacementCandidateEducationDto[] = educationRows.map((r) => {
      const relatedEvidence = credentialItems.filter(
        (item) => item.sourceReference === r.id || item.sourceEntityId === r.id,
      );
      return {
        id: r.id,
        studentId: r.studentId,
        institutionName: r.institutionName,
        degree: r.degree,
        fieldOfStudy: r.fieldOfStudy,
        startDate: r.startDate,
        endDate: r.endDate,
        current: r.current,
        grade: r.grade,
        status: r.status as PlacementCandidateEducationDto['status'],
        rejectionReason: access.redacted ? null : r.rejectionReason,
        documents: (r.documents ?? []).map((doc) => ({
          id: doc.id,
          educationId: doc.educationId,
          documentType:
            doc.documentType as PlacementCandidateEducationDto['documents'][number]['documentType'],
          fileUrl: access.redacted ? '' : doc.fileUrl,
          fileName: doc.fileName,
          fileSizeBytes: doc.fileSizeBytes,
          mimeType: doc.mimeType,
          createdAt: doc.createdAt.toISOString(),
        })),
        relatedEvidence,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return {
      studentId,
      total: educationItems.length,
      education: educationItems,
    };
  }

  async getCandidateSkillClaims(
    caller: RequestUser,
    studentId: string,
  ): Promise<CandidateSkillClaimsResponse> {
    await assertCanReadCandidateEvidenceVersions(this.prisma, caller, studentId);

    const claims = await this.prisma.skillClaim.findMany({
      where: { studentId },
      include: { skill: true },
      orderBy: { createdAt: 'desc' },
    });

    const claimDtos: CandidateSkillClaimStatusDto[] = claims.map((claim) => ({
      claimId: claim.id,
      studentId: claim.studentId,
      skillCode: claim.skill.code,
      skillName: claim.skill.name,
      category: claim.skill.domain ?? undefined,
      status: claim.status,
      claimedProficiency: claim.proficiency,
      verifiedProficiency: claim.finalProficiency ?? undefined,
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
    }));

    return {
      studentId,
      total: claimDtos.length,
      claims: claimDtos,
    };
  }

  async getCandidateDemonstratedSkills(
    caller: RequestUser,
    studentId: string,
  ): Promise<CandidateDemonstratedSkillsResponse> {
    await assertCanReadCandidateEvidenceVersions(this.prisma, caller, studentId);

    const claims = await this.prisma.skillClaim.findMany({
      where: {
        studentId,
        OR: [{ status: 'VERIFIED' }, { finalProficiency: { not: null } }],
      },
      include: {
        skill: true,
        evidenceLinks: {
          include: {
            evidence: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const skills: PlacementCandidateDemonstratedSkillDto[] = claims.map((claim) => {
      const evidenceTypes = Array.from(
        new Set(
          (claim.evidenceLinks ?? [])
            .map((link) => link.evidence?.evidenceType)
            .filter((t): t is NonNullable<typeof t> => Boolean(t)),
        ),
      );
      const summary =
        claim.evidenceSummary && typeof claim.evidenceSummary === 'object'
          ? (claim.evidenceSummary as Record<string, unknown>)
          : claim.evidenceLinks && claim.evidenceLinks.length > 0
            ? {
                totalItems: claim.evidenceLinks.length,
                types: evidenceTypes,
              }
            : null;

      return {
        claimId: claim.id,
        studentId: claim.studentId,
        skillCode: claim.skill.code,
        skillName: claim.skill.name,
        category: claim.skill.domain ?? undefined,
        status: claim.status,
        claimedProficiency: claim.proficiency,
        verifiedProficiency:
          claim.finalProficiency ?? (claim.status === 'VERIFIED' ? claim.proficiency : null),
        evidenceSummary: summary,
        createdAt: claim.createdAt.toISOString(),
        updatedAt: claim.updatedAt.toISOString(),
      };
    });

    return {
      studentId,
      total: skills.length,
      skills,
    };
  }

  async submitEvidenceSkillDispute(
    studentId: string,
    body: EvidenceSkillDisputeRequest,
  ): Promise<EvidenceSkillDisputeResponse> {
    const record = await this.prisma.evidenceRecord.findFirst({
      where: { id: body.evidenceId, studentId },
    });
    if (!record) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Evidence record not found.',
        statusCode: 404,
      });
    }

    const disputeId = randomUUID ? randomUUID() : (await import('node:crypto')).randomUUID();
    const now = new Date().toISOString();

    if (this.auditPublisher) {
      await this.auditPublisher.record({
        actorId: studentId,
        action: 'evidence.disputed',
        resourceType: 'evidence_record',
        resourceId: body.evidenceId,
        reasonCode: 'STUDENT_DISPUTE',
        metadata: {
          disputeId,
          skillCode: body.skillCode,
          reason: body.reason,
          submittedAt: now,
        },
      });
    }

    return {
      disputeId,
      evidenceId: body.evidenceId,
      skillCode: body.skillCode,
      status: 'UNDER_REVIEW',
      submittedAt: now,
    };
  }
}
