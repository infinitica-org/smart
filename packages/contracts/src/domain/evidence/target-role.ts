import { z } from 'zod';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';

export const TargetRoleSchema = z.object({
  roleId: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  domainId: z.string().min(1).max(64),
  recommendedSkillIds: z.array(TaxonomySkillCodeSchema).max(50).default([]),
  optionalSkillIds: z.array(TaxonomySkillCodeSchema).max(50).default([]),
});
export type TargetRole = z.infer<typeof TargetRoleSchema>;

/** V1 seed — common IT target roles with starter skill recommendations. */
export const TARGET_ROLES: readonly TargetRole[] = [
  {
    roleId: 'FULL_STACK_DEVELOPER',
    name: 'Full Stack Developer',
    domainId: 'SOFTWARE_IT',
    recommendedSkillIds: [
      'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      'MODERN_FRONTEND_FRAMEWORKS',
      'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
      'RESTFUL_GRAPHQL_API_DESIGN',
    ],
    optionalSkillIds: ['CONTAINERIZATION_ORCHESTRATION', 'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE'],
  },
  {
    roleId: 'BACKEND_DEVELOPER',
    name: 'Backend Developer',
    domainId: 'SOFTWARE_IT',
    recommendedSkillIds: [
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
      'RESTFUL_GRAPHQL_API_DESIGN',
      'CONTAINERIZATION_ORCHESTRATION',
    ],
    optionalSkillIds: ['NOSQL_DATABASE_ENGINEERING', 'BIG_DATA_PROCESSING_FRAMEWORKS'],
  },
  {
    roleId: 'FRONTEND_DEVELOPER',
    name: 'Frontend Developer',
    domainId: 'SOFTWARE_IT',
    recommendedSkillIds: [
      'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
      'MODERN_FRONTEND_FRAMEWORKS',
      'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
      'FRONTEND_PERFORMANCE_ENGINEERING',
    ],
    optionalSkillIds: ['RESTFUL_GRAPHQL_API_DESIGN'],
  },
  {
    roleId: 'DEVOPS_ENGINEER',
    name: 'DevOps Engineer',
    domainId: 'SOFTWARE_IT',
    recommendedSkillIds: [
      'CONTAINERIZATION_ORCHESTRATION',
      'CI_CD_PIPELINE_ENGINEERING',
      'LINUX_SYSTEMS_ADMINISTRATION',
      'OBSERVABILITY_MONITORING',
    ],
    optionalSkillIds: ['AMAZON_WEB_SERVICES_AWS_ARCHITECTURE', 'GITOPS_CONTINUOUS_DELIVERY'],
  },
  {
    roleId: 'DATA_ENGINEER',
    name: 'Data Engineer',
    domainId: 'SOFTWARE_IT',
    recommendedSkillIds: [
      'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
      'BIG_DATA_PROCESSING_FRAMEWORKS',
      'ETL_ELT_PIPELINE_DEVELOPMENT',
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    ],
    optionalSkillIds: ['DATA_MODELING_NORMALIZATION', 'NOSQL_DATABASE_ENGINEERING'],
  },
] as const;
