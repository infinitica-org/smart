import { z } from 'zod';
import {
  ContributionSchema,
  WorkExperienceEvidenceSchema,
  WorkExperienceResponsibilitySchema,
  buildWorkExperienceEvidence,
  type WorkExperienceDto,
  type WorkExperienceResponsibility,
  type WorkExperienceStructuredMetadata,
} from '@smart/contracts';
import type {
  WorkExperience,
  WorkExperienceResponsibility as WorkExperienceResponsibilityRow,
} from '../../generated/prisma/index.js';
import { toWorkExperienceResponsibilityDto } from '../evidence/evidence.mapper.js';

const DeliverablesSchema = z.array(z.string().max(2000)).max(50);
const PersonalContributionsSchema = z.array(ContributionSchema).max(50);
export type WorkExperienceWithEvidenceRelations = WorkExperience & {
  structuredResponsibilities?: WorkExperienceResponsibilityRow[];
};

export function mapStructuredResponsibilities(
  rows: WorkExperienceResponsibilityRow[] | undefined,
): WorkExperienceResponsibility[] {
  return (rows ?? []).map((row) =>
    WorkExperienceResponsibilitySchema.parse(toWorkExperienceResponsibilityDto(row)),
  );
}

function parseDeliverables(value: unknown): string[] | undefined {
  if (value === null || value === undefined) return undefined;
  return DeliverablesSchema.parse(value);
}

function parsePersonalContributions(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return PersonalContributionsSchema.parse(value);
}

export function buildEvidenceFromWorkExperienceRow(
  row: WorkExperienceWithEvidenceRelations,
  overrides?: Partial<WorkExperienceStructuredMetadata>,
): WorkExperienceDto['evidence'] {
  const evidence = buildWorkExperienceEvidence({
    id: row.id,
    companyName: row.companyName,
    role: row.role,
    employmentType: row.employmentType,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate ? row.endDate.toISOString() : null,
    workLocation: row.workLocation,
    department: row.department,
    responsibilities: row.responsibilities,
    skillsClaimed: row.skills ?? [],
    status: row.status,
    verifierName: row.verifierName,
    verifierEmail: row.verifierEmail,
    verifierDesignation: row.verifierDesignation,
    verifierPhone: row.verifierPhone,
    structuredResponsibilities:
      overrides?.structuredResponsibilities ??
      mapStructuredResponsibilities(row.structuredResponsibilities),
    deliverables: overrides?.deliverables ?? parseDeliverables(row.deliverablesStructured),
    personalContributions:
      overrides?.personalContributions ?? parsePersonalContributions(row.personalContributions),
    skillMappings: overrides?.skillMappings,
    verifiedAt: row.status === 'VERIFIED' ? row.updatedAt.toISOString() : null,
  });

  return WorkExperienceEvidenceSchema.parse(evidence);
}

export function structuredMetadataWriteData(
  metadata: WorkExperienceStructuredMetadata | undefined,
) {
  if (!metadata) return {};
  const data: Record<string, unknown> = {};
  if (metadata.deliverables !== undefined) {
    data.deliverablesStructured = metadata.deliverables;
  }
  if (metadata.personalContributions !== undefined) {
    data.personalContributions = metadata.personalContributions;
  }
  return data;
}

export function extractStructuredMetadata(
  data: WorkExperienceStructuredMetadata,
): WorkExperienceStructuredMetadata {
  return {
    structuredResponsibilities: data.structuredResponsibilities,
    deliverables: data.deliverables,
    personalContributions: data.personalContributions,
    skillMappings: data.skillMappings,
  };
}

export function responsibilityRowsCreateInput(
  experienceId: string,
  items: WorkExperienceResponsibility[],
) {
  return items.map((item) => ({
    experienceId,
    task: item.task,
    skillCode: item.skillCode,
    personalContribution: item.personalContribution,
    responsibilityLevel: item.responsibilityLevel,
    independence: item.independence,
    tools: item.tools ?? [],
    decision: item.decision,
    constraintText: item.constraint,
    outcome: item.outcome,
    artifactId: item.artifactId,
    activity: item.activity,
  }));
}
