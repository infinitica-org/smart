import type {
  EvidenceRecordDto,
  ProjectDto,
  ProjectSkillMappingDto,
  WorkExperienceDto,
} from '@smart/contracts';

import { api } from '@/lib/api';
import {
  buildLinkedSkillEvidenceContext,
  type SkillEvidenceContextView,
} from '@/lib/skill-evidence-context';

export type ProfileLinkedEvidenceBundle = {
  projects: ProjectDto[];
  projectMappingsById: Map<string, ProjectSkillMappingDto[]>;
  workExperiences: WorkExperienceDto[];
  projectTitleById: Map<string, string>;
  experienceLabelById: Map<string, string>;
  liveProjectIds: Set<string>;
  liveExperienceIds: Set<string>;
};

export async function loadProfileLinkedEvidenceBundle(): Promise<ProfileLinkedEvidenceBundle> {
  const empty: ProfileLinkedEvidenceBundle = {
    projects: [],
    projectMappingsById: new Map(),
    workExperiences: [],
    projectTitleById: new Map(),
    experienceLabelById: new Map(),
    liveProjectIds: new Set(),
    liveExperienceIds: new Set(),
  };

  let projects: ProjectDto[] = [];
  try {
    const res = await api.projects.listMine();
    projects = res.projects as ProjectDto[];
  } catch {
    return empty;
  }

  const projectTitleById = new Map<string, string>();
  const liveProjectIds = new Set<string>();
  for (const project of projects) {
    projectTitleById.set(project.projectId, project.title);
    liveProjectIds.add(project.projectId);
  }

  const mappingEntries: [string, ProjectSkillMappingDto[]][] = await Promise.all(
    projects.map(async (project): Promise<[string, ProjectSkillMappingDto[]]> => {
      try {
        const mappings = await api.evidence.listProjectSkillMappings(project.projectId);
        return [project.projectId, mappings];
      } catch {
        return [project.projectId, []];
      }
    }),
  );

  let workExperiences: WorkExperienceDto[] = [];
  try {
    workExperiences = await api.users.listWorkExperiences();
  } catch {
    workExperiences = [];
  }

  const experienceLabelById = new Map<string, string>();
  const liveExperienceIds = new Set<string>();
  for (const exp of workExperiences) {
    liveExperienceIds.add(exp.id);
    experienceLabelById.set(exp.id, `${exp.role} · ${exp.companyName}`);
  }

  return {
    projects,
    projectMappingsById: new Map(mappingEntries),
    workExperiences,
    projectTitleById,
    experienceLabelById,
    liveProjectIds,
    liveExperienceIds,
  };
}

export function linkedEvidenceContextForSkill(
  skillCode: string,
  bundle: ProfileLinkedEvidenceBundle,
  evidenceRecords: readonly EvidenceRecordDto[] = [],
): SkillEvidenceContextView {
  return buildLinkedSkillEvidenceContext(
    skillCode,
    evidenceRecords,
    bundle.projects,
    bundle.projectMappingsById,
    bundle.workExperiences,
    {
      projectTitles: bundle.projectTitleById,
      experienceLabels: bundle.experienceLabelById,
      liveProjectIds: bundle.liveProjectIds,
      liveExperienceIds: bundle.liveExperienceIds,
    },
  );
}

export function linkedProjectItems(context: SkillEvidenceContextView | undefined) {
  return (context?.items ?? []).filter((item) => item.evidenceType === 'PROJECT');
}
