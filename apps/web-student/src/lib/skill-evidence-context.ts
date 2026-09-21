import {
  mapWeStatusToEvidenceVerification,
  qualifiesAsSkillDemonstrationEvidence,
  type EvidenceRecordDto,
  type ProjectDto,
  type ProjectSkillMappingDto,
  type SkillEvidenceContext,
  type SkillEvidenceContextItem,
  type WorkExperienceDto,
} from '@smart/contracts';
import {
  isSkillEvidenceLinkedToProfile,
  profileProjectHref,
  profileWorkExperienceHref,
  skillEvidenceProfileHref,
  skillEvidenceSourceEntityId,
  skillEvidenceTitle,
  type SkillEvidenceTitleOptions,
} from '@/lib/skill-evidence-links';
import { projectStackDeclaresSkill } from '@/lib/skill-evidence-project-match';

export type SkillEvidenceContextBuildOptions = SkillEvidenceTitleOptions & {
  liveProjectIds?: ReadonlySet<string>;
  liveExperienceIds?: ReadonlySet<string>;
};

export type SkillEvidenceContextItemView = SkillEvidenceContextItem & {
  href?: string;
  evidenceId?: string;
};

export type SkillEvidenceContextView = Omit<SkillEvidenceContext, 'items'> & {
  items: SkillEvidenceContextItemView[];
};

/** Mirrors api-core evidence context assembly for repository skill detail. */
export function skillEvidenceContextFromRecords(
  records: readonly EvidenceRecordDto[],
  catalogSkillCode: string,
  options?: SkillEvidenceContextBuildOptions,
): SkillEvidenceContextView {
  const live = {
    projectIds: options?.liveProjectIds,
    experienceIds: options?.liveExperienceIds,
  };
  const items = records
    .filter(
      (record) =>
        (record.evidenceType === 'PROJECT' || record.evidenceType === 'WORK_EXPERIENCE') &&
        record.relatedSkillIds.includes(catalogSkillCode) &&
        isSkillEvidenceLinkedToProfile(record, live),
    )
    .map((record) => {
      const label = skillEvidenceTitle(record, options);
      const href = skillEvidenceProfileHref(record, live);
      return {
        evidenceType: record.evidenceType,
        label,
        href,
        evidenceId: record.evidenceId,
        verificationStatus: record.verificationStatus,
        qualifiesForDemonstration: qualifiesAsSkillDemonstrationEvidence({
          evidenceType: record.evidenceType,
          relatedSkillCodes: record.relatedSkillIds,
          catalogSkillCode,
          verificationStatus: record.verificationStatus,
        }),
      };
    });

  return {
    availableCount: items.length,
    items,
  };
}

function projectIdsFromContextItems(items: readonly SkillEvidenceContextItemView[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.evidenceType !== 'PROJECT') continue;
    const match = item.href ? /[?&]project=([^&]+)/.exec(item.href) : null;
    if (match?.[1]) ids.add(match[1]);
  }
  return ids;
}

function experienceIdsFromContextItems(
  items: readonly SkillEvidenceContextItemView[],
): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.evidenceType !== 'WORK_EXPERIENCE') continue;
    const match = item.href ? /[?&]experience=([^&]+)/.exec(item.href) : null;
    if (match?.[1]) ids.add(match[1]);
  }
  return ids;
}

/** Profile-linked evidence: evidence rows + project skill tags + work experience skills (any verification). */
export function buildLinkedSkillEvidenceContext(
  skillCode: string,
  records: readonly EvidenceRecordDto[],
  projects: readonly ProjectDto[],
  projectMappingsByProjectId: ReadonlyMap<string, readonly ProjectSkillMappingDto[]>,
  workExperiences: readonly WorkExperienceDto[],
  options?: SkillEvidenceContextBuildOptions,
): SkillEvidenceContextView {
  const fromRecords = skillEvidenceContextFromRecords(records, skillCode, options);
  const items: SkillEvidenceContextItemView[] = [...fromRecords.items];

  const projectIds = projectIdsFromContextItems(items);
  for (const record of records) {
    if (record.evidenceType !== 'PROJECT') continue;
    const id = skillEvidenceSourceEntityId(record);
    if (id) projectIds.add(id);
  }

  for (const project of projects) {
    if (options?.liveProjectIds && !options.liveProjectIds.has(project.projectId)) continue;
    const mappings = projectMappingsByProjectId.get(project.projectId) ?? [];
    const mapping = mappings.find((row) => row.skillCode === skillCode);
    const stackLinked = !mapping && projectStackDeclaresSkill(project, skillCode);
    if ((!mapping && !stackLinked) || projectIds.has(project.projectId)) continue;
    projectIds.add(project.projectId);
    const label = options?.projectTitles?.get(project.projectId) ?? project.title;
    const verificationStatus = mapping?.verificationStatus ?? 'PENDING';
    items.push({
      evidenceType: 'PROJECT',
      label,
      href: profileProjectHref(project.projectId),
      evidenceId: `project-skill-${project.projectId}-${skillCode}`,
      verificationStatus,
      qualifiesForDemonstration: verificationStatus === 'VERIFIED',
    });
  }

  const experienceIds = experienceIdsFromContextItems(items);
  for (const record of records) {
    if (record.evidenceType !== 'WORK_EXPERIENCE') continue;
    const id = skillEvidenceSourceEntityId(record);
    if (id) experienceIds.add(id);
  }

  for (const exp of workExperiences) {
    if (options?.liveExperienceIds && !options.liveExperienceIds.has(exp.id)) continue;
    if (!exp.skillsClaimed.includes(skillCode) || experienceIds.has(exp.id)) continue;
    experienceIds.add(exp.id);
    const verificationStatus = mapWeStatusToEvidenceVerification(exp.status);
    items.push({
      evidenceType: 'WORK_EXPERIENCE',
      label: options?.experienceLabels?.get(exp.id) ?? `${exp.role} · ${exp.companyName}`,
      href: profileWorkExperienceHref(exp.id),
      evidenceId: `work-skill-${exp.id}-${skillCode}`,
      verificationStatus,
      qualifiesForDemonstration: qualifiesAsSkillDemonstrationEvidence({
        evidenceType: 'WORK_EXPERIENCE',
        relatedSkillCodes: exp.skillsClaimed,
        catalogSkillCode: skillCode,
        verificationStatus,
      }),
    });
  }

  return {
    availableCount: items.length,
    items,
  };
}
