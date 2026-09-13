import type { WorkExperienceVerificationStatus } from '../enums.js';
import type { EvidenceVerificationStatus } from './enums.js';
import type {
  EmploymentVerification,
  WorkExperienceEvidence,
  WorkExperienceResponsibility,
} from './work-experience-evidence.js';
import type { Contribution, SkillMapping } from './metadata.js';

export interface WorkExperienceEvidenceSource {
  id: string;
  companyName: string;
  role: string;
  employmentType: WorkExperienceEvidence['employmentType'];
  startDate: string;
  endDate: string | null;
  workLocation: string | null;
  department: string | null;
  responsibilities: string | null;
  skillsClaimed: string[];
  status: WorkExperienceVerificationStatus;
  verifierName: string | null;
  verifierEmail: string | null;
  verifierDesignation: string | null;
  verifierPhone: string | null;
  structuredResponsibilities?: WorkExperienceResponsibility[];
  deliverables?: string[];
  personalContributions?: Contribution[];
  skillMappings?: SkillMapping[];
  verifiedAt?: string | null;
}

export function mapWeStatusToEvidenceVerification(
  status: WorkExperienceVerificationStatus,
): EvidenceVerificationStatus {
  switch (status) {
    case 'VERIFIED':
      return 'VERIFIED';
    case 'PENDING_EMPLOYER':
      return 'PROVISIONAL';
    case 'REJECTED':
    case 'VOIDED':
      return 'REJECTED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'DRAFT':
    case 'SUBMITTED':
    default:
      return 'PENDING';
  }
}

export function deriveSkillMappingsFromWorkExperience(
  source: Pick<
    WorkExperienceEvidenceSource,
    'skillsClaimed' | 'structuredResponsibilities' | 'skillMappings'
  >,
): SkillMapping[] {
  if (source.skillMappings && source.skillMappings.length > 0) {
    return source.skillMappings;
  }

  const fromResponsibilities = new Map<string, SkillMapping>();
  for (const item of source.structuredResponsibilities ?? []) {
    if (!item.skillCode) continue;
    fromResponsibilities.set(item.skillCode, {
      skillCode: item.skillCode,
      contribution: item.personalContribution,
      responsibilityLevel: item.responsibilityLevel,
    });
  }
  if (fromResponsibilities.size > 0) {
    return [...fromResponsibilities.values()];
  }

  return (source.skillsClaimed ?? []).map((skillCode) => ({ skillCode }));
}

export function buildEmploymentVerification(
  source: Pick<
    WorkExperienceEvidenceSource,
    | 'status'
    | 'verifierName'
    | 'verifierEmail'
    | 'verifierDesignation'
    | 'verifierPhone'
    | 'verifiedAt'
  >,
): EmploymentVerification | undefined {
  const hasVerifier =
    Boolean(source.verifierName?.trim()) ||
    Boolean(source.verifierEmail?.trim()) ||
    Boolean(source.verifierDesignation?.trim()) ||
    Boolean(source.verifierPhone?.trim());

  if (!hasVerifier && source.status === 'DRAFT') {
    return undefined;
  }

  const contactParts = [source.verifierEmail?.trim(), source.verifierPhone?.trim()].filter(Boolean);

  return {
    verifierName: source.verifierName ?? undefined,
    verifierRole: source.verifierDesignation ?? undefined,
    verifierContact: contactParts.length > 0 ? contactParts.join(' · ') : undefined,
    verificationStatus: mapWeStatusToEvidenceVerification(source.status),
    verifiedAt: source.verifiedAt ?? null,
  };
}

function deriveEvidenceClaim(source: WorkExperienceEvidenceSource): string | undefined {
  const firstTask = source.structuredResponsibilities?.[0]?.task?.trim();
  if (firstTask) return firstTask.slice(0, 4000);
  const text = source.responsibilities?.trim();
  if (text) return text.slice(0, 4000);
  return undefined;
}

export function buildWorkExperienceEvidence(
  source: WorkExperienceEvidenceSource,
): WorkExperienceEvidence {
  return {
    experienceId: source.id,
    employer: source.companyName,
    jobTitle: source.role,
    employmentType: source.employmentType,
    startDate: source.startDate,
    endDate: source.endDate,
    location: source.workLocation ?? undefined,
    departmentOrTeam: source.department ?? undefined,
    responsibilities: source.structuredResponsibilities ?? [],
    deliverables: source.deliverables ?? [],
    skillMappings: deriveSkillMappingsFromWorkExperience(source),
    personalContributions: source.personalContributions ?? [],
    employmentVerification: buildEmploymentVerification(source),
  };
}

export function evidenceClaimFromWorkExperience(
  source: WorkExperienceEvidenceSource,
): string | undefined {
  return deriveEvidenceClaim(source);
}

export function relatedSkillCodesFromWorkExperience(
  source: WorkExperienceEvidenceSource,
): string[] {
  return deriveSkillMappingsFromWorkExperience(source).map((mapping) => mapping.skillCode);
}
