import type { ProjectVerificationReportDto } from '@smart/contracts';
import { decodeReportMeta as decodeReportMetaFromMapper } from '../evaluation/project-verify.mapper.js';

export interface ProjectWithVerificationRelations {
  id: string;
  studentId: string;
  title: string;
  problem: string;
  approach: string;
  stack: string;
  outcome: string;
  loomUrl: string | null;
  githubUrl: string | null;
  liveUrl: string | null;
  status: string;
  snapshotSha: string | null;
  qlixCheckId: string | null;
  skillMappings: Array<{
    skillCode: string;
    specificContribution: string;
    componentWorkedOn: string | null;
    actionsPerformed: string[] | null;
    decisionsMade: string[] | null;
    constraintsHandled: string[] | null;
    artifactId: string | null;
    verificationStatus: string;
    activity: unknown | null;
  }>;
  report: {
    id: string;
    projectId: string;
    score: { toNumber?: () => number } | number;
    plagiarismFlag: boolean;
    techAgeFlag: boolean;
    relevanceScore: { toNumber?: () => number } | number;
    explanation: string;
    routedToReview: boolean;
    createdAt: Date;
  } | null;
}

import type { StoredReportMeta } from '../evaluation/project-verify.mapper.js';

export function decodeReportMeta(explanation: string): {
  text: string;
  meta: StoredReportMeta | null;
} {
  return decodeReportMetaFromMapper(explanation);
}

export function projectTrustFromReport(
  report: ProjectVerificationReportDto,
): 'TRUSTED' | 'PROVISIONAL' | 'UNTRUSTED' {
  if (report.confidence < 0.5) return 'UNTRUSTED';
  if (report.routedToReview) return 'PROVISIONAL';
  return 'TRUSTED';
}

export function mapProjectStatusToEvidenceVerification(
  status: string,
): 'PENDING' | 'PROVISIONAL' | 'VERIFIED' {
  switch (status) {
    case 'VERIFIED':
    case 'APPROVED':
      return 'VERIFIED';
    case 'UNDER_REVIEW':
    case 'SUBMITTED':
      return 'PROVISIONAL';
    default:
      return 'PENDING';
  }
}

const PROJECT_EVIDENCE_VERIFIED_CONFIDENCE = 0.5;

/**
 * Derives evidence verification from project lifecycle plus QLIX report quality.
 * A trusted auto-pass report can mark evidence VERIFIED even while the project row
 * remains UNDER_REVIEW until an admin promotes it.
 */
export function mapProjectEvidenceVerification(input: {
  projectStatus: string;
  report: Pick<ProjectVerificationReportDto, 'confidence' | 'routedToReview'> | null;
}): 'PENDING' | 'PROVISIONAL' | 'VERIFIED' {
  const fromStatus = mapProjectStatusToEvidenceVerification(input.projectStatus);
  if (fromStatus === 'VERIFIED') return 'VERIFIED';
  if (!input.report) return fromStatus;
  if (input.report.routedToReview) return 'PROVISIONAL';
  if (input.report.confidence >= PROJECT_EVIDENCE_VERIFIED_CONFIDENCE) {
    return 'VERIFIED';
  }
  return fromStatus;
}

export function projectEvidenceStrengthFromReport(
  report: Pick<ProjectVerificationReportDto, 'confidence' | 'score'> | null,
): 'WEAK' | 'MODERATE' | 'STRONG' | 'DIRECT' | undefined {
  if (!report) return undefined;
  if (report.confidence >= 0.8 && report.score >= 70) return 'STRONG';
  if (report.confidence >= 0.5) return 'MODERATE';
  return 'WEAK';
}

export function projectEvidenceReliabilityFromReport(
  report: Pick<ProjectVerificationReportDto, 'confidence'> | null,
): 'LOW' | 'MEDIUM' | 'HIGH' | undefined {
  if (!report) return undefined;
  if (report.confidence >= 0.8) return 'HIGH';
  if (report.confidence >= 0.5) return 'MEDIUM';
  return 'LOW';
}

export interface ProjectSourceRef {
  id: string;
  title: string;
  problem: string;
  approach: string;
  stack: string;
  outcome: string;
  githubUrl: string | null;
  liveUrl: string | null;
  loomUrl: string | null;
  status: string;
  skillMappings: Array<{
    skillCode: string;
    specificContribution: string;
    componentWorkedOn: string | null;
    actionsPerformed: string[] | null;
    decisionsMade: string[] | null;
    constraintsHandled: string[] | null;
    artifactId: string | null;
    verificationStatus: string;
    activity: unknown | null;
  }>;
}

export function relatedSkillCodesFromProject(row: ProjectSourceRef): string[] {
  return row.skillMappings.map((m) => m.skillCode);
}

export function evidenceClaimFromProject(row: ProjectSourceRef): string {
  return row.title;
}

export function buildEvidenceFromProjectRow(row: ProjectWithVerificationRelations): {
  deliverables: string[];
  personalContributions: string[];
  skillMappings: Array<{
    skillCode: string;
    specificContribution: string;
    componentWorkedOn: string | null;
    actionsPerformed: string[];
    decisionsMade: string[];
    constraintsHandled: string[];
    artifactId: string | null;
    verificationStatus: string;
    activity: unknown | null;
  }>;
} | null {
  if (!row.report) return null;

  const deliverables: string[] = [];
  if (row.githubUrl) deliverables.push(`GitHub: ${row.githubUrl}`);
  if (row.liveUrl) deliverables.push(`Live: ${row.liveUrl}`);
  if (row.loomUrl) deliverables.push(`Demo: ${row.loomUrl}`);

  const personalContributions = [row.approach, row.outcome].filter(Boolean);

  return {
    deliverables,
    personalContributions,
    skillMappings: row.skillMappings.map((m) => ({
      skillCode: m.skillCode,
      specificContribution: m.specificContribution,
      componentWorkedOn: m.componentWorkedOn,
      actionsPerformed: m.actionsPerformed ?? [],
      decisionsMade: m.decisionsMade ?? [],
      constraintsHandled: m.constraintsHandled ?? [],
      artifactId: m.artifactId,
      verificationStatus: m.verificationStatus,
      activity: m.activity,
    })),
  };
}
