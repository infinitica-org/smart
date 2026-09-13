import type {
  EvidenceRecordDto,
  PassiveSignalEvidenceDto,
  ProfessionalCredentialDto,
  ProjectSkillMappingDto,
  SkillClaimEvidenceLinkDto,
  VerificationDecisionDto,
  WorkExperienceResponsibilityDto,
} from '@smart/contracts';
import type {
  EvidenceArtifact,
  EvidenceRecord,
  PassiveSignalEvidence,
  ProfessionalCredential,
  ProjectSkillMapping,
  SkillClaimEvidenceLink,
  VerificationDecision,
  WorkExperienceResponsibility,
} from '../../generated/prisma/index.js';

export function toEvidenceRecordDto(
  row: EvidenceRecord & { artifacts?: EvidenceArtifact[] },
): EvidenceRecordDto {
  return {
    evidenceId: row.id,
    candidateId: row.studentId,
    evidenceType: row.evidenceType,
    source: row.source,
    sourceOwner: row.sourceOwner ?? undefined,
    sourceReference: row.sourceReference ?? undefined,
    evidenceDate: row.evidenceDate ?? undefined,
    submissionDate: row.submissionDate?.toISOString(),
    claim: row.claim ?? undefined,
    context: row.context ?? undefined,
    provenance: (row.provenance as EvidenceRecordDto['provenance']) ?? undefined,
    accessibility: (row.accessibility as EvidenceRecordDto['accessibility']) ?? 'PRIVATE',
    relatedSkillIds: row.relatedSkillCodes,
    verificationStatus: row.verificationStatus,
    evidenceStrength: (row.evidenceStrength as EvidenceRecordDto['evidenceStrength']) ?? undefined,
    evidenceReliability:
      (row.evidenceReliability as EvidenceRecordDto['evidenceReliability']) ?? undefined,
    freshness: (row.freshness as EvidenceRecordDto['freshness']) ?? undefined,
    artifactIds: row.artifacts?.map((a) => a.id) ?? [],
    contradictions: [],
    verificationMetadata:
      (row.verificationMetadata as EvidenceRecordDto['verificationMetadata']) ?? undefined,
    sourceEntityId: row.sourceEntityId,
    sourcePayload: (row.sourcePayload as Record<string, unknown>) ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toWorkExperienceResponsibilityDto(
  row: WorkExperienceResponsibility,
): WorkExperienceResponsibilityDto {
  return {
    responsibilityId: row.id,
    task: row.task,
    skillCode: row.skillCode ?? undefined,
    personalContribution: row.personalContribution,
    responsibilityLevel:
      row.responsibilityLevel as WorkExperienceResponsibilityDto['responsibilityLevel'],
    independence:
      (row.independence as WorkExperienceResponsibilityDto['independence']) ?? undefined,
    tools: row.tools,
    decision: row.decision ?? undefined,
    constraint: row.constraintText ?? undefined,
    outcome: row.outcome ?? undefined,
    artifactId: row.artifactId,
    activity: (row.activity as WorkExperienceResponsibilityDto['activity']) ?? undefined,
  };
}

export function toProjectSkillMappingDto(row: ProjectSkillMapping): ProjectSkillMappingDto {
  return {
    skillCode: row.skillCode,
    specificContribution: row.specificContribution,
    componentWorkedOn: row.componentWorkedOn ?? undefined,
    actionsPerformed: row.actionsPerformed,
    decisionsMade: row.decisionsMade,
    constraintsHandled: row.constraintsHandled,
    artifactId: row.artifactId,
    verificationStatus: row.verificationStatus as ProjectSkillMappingDto['verificationStatus'],
    activity: (row.activity as ProjectSkillMappingDto['activity']) ?? undefined,
  };
}

export function toProfessionalCredentialDto(
  row: ProfessionalCredential,
): ProfessionalCredentialDto {
  return {
    credentialId: row.id,
    issuer: row.issuer,
    credentialName: row.credentialName,
    credentialType: row.credentialType as ProfessionalCredentialDto['credentialType'],
    externalCredentialId: row.externalCredentialId ?? undefined,
    issueDate: row.issueDate ?? undefined,
    expiryDate: row.expiryDate,
    jurisdiction: row.jurisdiction ?? undefined,
    scope: row.scope ?? undefined,
    verificationSource: row.verificationSource ?? undefined,
    status: row.status as ProfessionalCredentialDto['status'],
    assessmentType: row.assessmentType ?? undefined,
    practicalComponent: row.practicalComponent,
    coveredTopics: row.coveredTopics,
    coveredSkills: row.coveredSkillCodes,
    applicationEvidence:
      (row.applicationEvidence as ProfessionalCredentialDto['applicationEvidence']) ?? [],
    verificationMethod:
      (row.verificationMethod as ProfessionalCredentialDto['verificationMethod']) ?? undefined,
    documentObjectKey: row.documentObjectKey ?? undefined,
  };
}

export function toPassiveSignalEvidenceDto(row: PassiveSignalEvidence): PassiveSignalEvidenceDto {
  return {
    signalId: row.id,
    source: row.source as PassiveSignalEvidenceDto['source'],
    accountReference: row.accountReference,
    activity: (row.activity as PassiveSignalEvidenceDto['activity']) ?? [],
    activityPeriodStart: row.activityPeriodStart?.toISOString() ?? null,
    activityPeriodEnd: row.activityPeriodEnd?.toISOString() ?? null,
    relevantArtifactIds: row.relevantArtifactIds,
    skillMappings: (row.skillMappings as PassiveSignalEvidenceDto['skillMappings']) ?? [],
    signalStrength: row.signalStrength ? Number(row.signalStrength) : undefined,
    reliability: (row.reliability as PassiveSignalEvidenceDto['reliability']) ?? undefined,
    anomalies: row.anomalies,
  };
}

export function toSkillClaimEvidenceLinkDto(
  row: SkillClaimEvidenceLink,
): SkillClaimEvidenceLinkDto {
  return {
    linkId: row.id,
    claimId: row.claimId,
    evidenceId: row.evidenceId,
    weight: Number(row.weight),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toVerificationDecisionDto(row: VerificationDecision): VerificationDecisionDto {
  return {
    decisionId: row.id,
    claimId: row.claimId,
    evidenceSummary: row.evidenceSummary ?? undefined,
    assessmentSummary: row.assessmentSummary ?? undefined,
    interviewSummary: row.interviewSummary ?? undefined,
    decision: row.decision,
    confidence: Number(row.confidence),
    reasons: row.reasons,
    reviewerId: row.reviewerId,
    createdAt: row.createdAt.toISOString(),
  };
}
