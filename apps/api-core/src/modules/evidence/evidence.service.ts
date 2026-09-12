import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
  type PassiveSignalEvidenceDto,
  type ProfessionalCredentialDto,
  type ProjectSkillMappingDto,
  type SkillClaimEvidenceLinkDto,
  type VerificationDecisionDto,
} from '@smart/contracts';
import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';
import {
  toEvidenceRecordDto,
  toPassiveSignalEvidenceDto,
  toProfessionalCredentialDto,
  toProjectSkillMappingDto,
  toSkillClaimEvidenceLinkDto,
  toVerificationDecisionDto,
} from './evidence.mapper.js';

@Injectable()
export class EvidenceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
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

  async linkEvidenceToClaim(
    studentId: string,
    evidenceId: string,
    body: unknown,
  ): Promise<SkillClaimEvidenceLinkDto> {
    await this.getEvidence(studentId, evidenceId);
    const input = LinkEvidenceToClaimRequestSchema.parse(body);
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
    const link = await this.prisma.skillClaimEvidenceLink.upsert({
      where: { claimId_evidenceId: { claimId: input.claimId, evidenceId } },
      create: {
        claimId: input.claimId,
        evidenceId,
        weight: input.weight,
      },
      update: { weight: input.weight },
    });
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
        status: input.status ?? 'PENDING_VERIFICATION',
        assessmentType: input.assessmentType,
        practicalComponent: input.practicalComponent ?? false,
        coveredTopics: input.coveredTopics ?? [],
        coveredSkillCodes: input.coveredSkills ?? [],
        applicationEvidence: (input.applicationEvidence ?? []) as Prisma.InputJsonValue,
        verificationMethod: input.verificationMethod,
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
