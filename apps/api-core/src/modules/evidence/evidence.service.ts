import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { z } from 'zod';
import {
  CreateEvidenceRequestSchema,
  CreateVerificationDecisionRequestSchema,
  LinkEvidenceToClaimRequestSchema,
  ProfessionalCredentialSchema,
  ProjectSkillMappingSchema,
  SaveOnboardingSelectionRequestSchema,
  UpdateEvidenceRequestSchema,
  evidenceRequiresRelatedSkills,
  type CandidateEvidenceProfileDto,
  type EvidenceRecordDto,
  type EvidenceRecordVersionDto,
  type ListEvidenceRecordVersionsResponse,
  type PassiveSignalEvidenceDto,
  type ProfessionalCredentialDto,
  type ProjectSkillMappingDto,
  type SkillClaimEvidenceLinkDto,
  type VerificationDecisionDto,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CREDENTIAL_VERIFICATION_QUEUE } from '../../platform/queue/queue.names.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { CredentialDedupService } from '../candidate-certificates/verification/credential-dedup.service.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';
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
    @Inject(EvidenceSyncService) private readonly evidenceSync: EvidenceSyncService,
    @Inject(EvidenceSkillInferenceService)
    private readonly skillInference: EvidenceSkillInferenceService,
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
    return toSkillClaimEvidenceLinkDto(link);
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
  }
}
