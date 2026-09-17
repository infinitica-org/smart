import type { EvidenceRecordDto } from '@smart/contracts';
import { profileSectionHref } from '@/lib/profile-sections';

export function profileProjectHref(projectId: string): string {
  const params = new URLSearchParams({ section: 'projects', project: projectId });
  return `/profile?${params.toString()}`;
}

export function profileWorkExperienceHref(experienceId: string): string {
  const params = new URLSearchParams({ section: 'experience', experience: experienceId });
  return `/profile?${params.toString()}`;
}

function readPayload(record: EvidenceRecordDto): Record<string, unknown> | undefined {
  const payload = record.sourcePayload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  return payload as Record<string, unknown>;
}

export function skillEvidenceSourceEntityId(record: EvidenceRecordDto): string | undefined {
  const payload = readPayload(record);
  if (record.evidenceType === 'PROJECT') {
    return (
      record.sourceEntityId ??
      (typeof payload?.projectId === 'string' ? payload.projectId : undefined)
    );
  }
  if (record.evidenceType === 'WORK_EXPERIENCE') {
    return (
      record.sourceEntityId ??
      (typeof payload?.experienceId === 'string' ? payload.experienceId : undefined)
    );
  }
  return undefined;
}

export type SkillEvidenceTitleOptions = {
  projectTitles?: ReadonlyMap<string, string>;
  experienceLabels?: ReadonlyMap<string, string>;
};

export function skillEvidenceTitle(
  record: EvidenceRecordDto,
  options?: SkillEvidenceTitleOptions | ReadonlyMap<string, string>,
): string {
  const titleOptions: SkillEvidenceTitleOptions | undefined =
    options instanceof Map ? { projectTitles: options } : options;
  const entityId = skillEvidenceSourceEntityId(record);
  const payload = readPayload(record);
  if (record.evidenceType === 'PROJECT') {
    if (entityId && titleOptions?.projectTitles?.has(entityId)) {
      return titleOptions.projectTitles.get(entityId)!;
    }
    const fromPayload = payload?.title;
    if (typeof fromPayload === 'string' && fromPayload.trim()) return fromPayload.trim();
  }
  if (record.evidenceType === 'WORK_EXPERIENCE') {
    if (entityId && titleOptions?.experienceLabels?.has(entityId)) {
      return titleOptions.experienceLabels.get(entityId)!;
    }
    if (payload) {
      const jobTitle = typeof payload.jobTitle === 'string' ? payload.jobTitle.trim() : '';
      const employer = typeof payload.employer === 'string' ? payload.employer.trim() : '';
      if (jobTitle && employer) return `${jobTitle} · ${employer}`;
      if (jobTitle) return jobTitle;
      if (employer) return employer;
    }
  }
  return (
    record.claim?.trim() ||
    record.context?.trim()?.slice(0, 120) ||
    `${record.evidenceType.replace('_', ' ')} evidence`
  );
}

export function skillEvidenceProfileHref(
  record: EvidenceRecordDto,
  live?: { projectIds?: ReadonlySet<string>; experienceIds?: ReadonlySet<string> },
): string | undefined {
  const entityId = skillEvidenceSourceEntityId(record);
  if (record.evidenceType === 'PROJECT') {
    if (!entityId) return profileSectionHref('projects');
    if (live?.projectIds && !live.projectIds.has(entityId)) return undefined;
    return profileProjectHref(entityId);
  }
  if (record.evidenceType === 'WORK_EXPERIENCE') {
    if (!entityId) return profileSectionHref('experience');
    if (live?.experienceIds && !live.experienceIds.has(entityId)) return undefined;
    return profileWorkExperienceHref(entityId);
  }
  return undefined;
}

/** Drop evidence rows that still mention a skill after the profile entity was removed. */
export function isSkillEvidenceLinkedToProfile(
  record: EvidenceRecordDto,
  live?: { projectIds?: ReadonlySet<string>; experienceIds?: ReadonlySet<string> },
): boolean {
  const entityId = skillEvidenceSourceEntityId(record);
  if (record.evidenceType === 'PROJECT') {
    if (!entityId) return false;
    if (live?.projectIds) return live.projectIds.has(entityId);
    return true;
  }
  if (record.evidenceType === 'WORK_EXPERIENCE') {
    if (!entityId) return false;
    if (live?.experienceIds) return live.experienceIds.has(entityId);
    return true;
  }
  return false;
}
