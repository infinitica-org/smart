/**
 * AUTO-GENERATED from tools/content-pipeline/data/taxonomies/skill.json
 * Source: docs/Global_IT_Skills_Database.xlsx (Category + Skill columns)
 * Regenerate: pnpm --filter @smart/content-pipeline codegen:skill
 * DO NOT EDIT MANUALLY.
 */

import {
  DEFAULT_COMPETENCY_BARS,
  levels,
  type LevelThreshold,
  type ProficiencyLevel,
} from './skill-levels.js';

export const SKILL_TAXONOMY_VERSION = 'skill@1' as const;
export const SKILL_TAXONOMY_DOMAINS = ['SOFTWARE_IT'] as const;
export type SkillTaxonomyDomain = (typeof SKILL_TAXONOMY_DOMAINS)[number];

export const SKILL_CATEGORY_IDS = [
  'PROGRAMMING_LANGUAGES',
  'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
  'CLOUD_PLATFORMS',
  'DEVOPS_INFRASTRUCTURE',
  'DATABASES_DATA_MANAGEMENT',
  'DATA_ENGINEERING_BIG_DATA',
  'AI_ML_DATA_SCIENCE',
  'CYBERSECURITY',
  'TESTING_QA_RELIABILITY',
  'MOBILE_DEVELOPMENT',
  'FRONTEND_WEB_DEVELOPMENT',
  'NETWORKING_SYSTEMS_ADMINISTRATION',
  'EMERGING_TECHNOLOGY',
  'DELIVERY_PROCESS_TOOLING',
] as const;
export type SkillCategoryId = (typeof SKILL_CATEGORY_IDS)[number];

export const SKILL_CATEGORIES: Readonly<
  Record<SkillCategoryId, { readonly id: SkillCategoryId; readonly name: string }>
> = {
  PROGRAMMING_LANGUAGES: { id: 'PROGRAMMING_LANGUAGES', name: 'Programming Languages' },
  SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN: {
    id: 'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    name: 'Software Architecture & System Design',
  },
  CLOUD_PLATFORMS: { id: 'CLOUD_PLATFORMS', name: 'Cloud Platforms' },
  DEVOPS_INFRASTRUCTURE: { id: 'DEVOPS_INFRASTRUCTURE', name: 'DevOps & Infrastructure' },
  DATABASES_DATA_MANAGEMENT: {
    id: 'DATABASES_DATA_MANAGEMENT',
    name: 'Databases & Data Management',
  },
  DATA_ENGINEERING_BIG_DATA: {
    id: 'DATA_ENGINEERING_BIG_DATA',
    name: 'Data Engineering & Big Data',
  },
  AI_ML_DATA_SCIENCE: { id: 'AI_ML_DATA_SCIENCE', name: 'AI, ML & Data Science' },
  CYBERSECURITY: { id: 'CYBERSECURITY', name: 'Cybersecurity' },
  TESTING_QA_RELIABILITY: { id: 'TESTING_QA_RELIABILITY', name: 'Testing, QA & Reliability' },
  MOBILE_DEVELOPMENT: { id: 'MOBILE_DEVELOPMENT', name: 'Mobile Development' },
  FRONTEND_WEB_DEVELOPMENT: { id: 'FRONTEND_WEB_DEVELOPMENT', name: 'Frontend & Web Development' },
  NETWORKING_SYSTEMS_ADMINISTRATION: {
    id: 'NETWORKING_SYSTEMS_ADMINISTRATION',
    name: 'Networking & Systems Administration',
  },
  EMERGING_TECHNOLOGY: { id: 'EMERGING_TECHNOLOGY', name: 'Emerging Technology' },
  DELIVERY_PROCESS_TOOLING: { id: 'DELIVERY_PROCESS_TOOLING', name: 'Delivery, Process & Tooling' },
};

export interface SkillDefinition {
  readonly code: string;
  readonly name: string;
  readonly categoryId: SkillCategoryId;
  readonly categoryName: string;
  readonly domain: SkillTaxonomyDomain;
  readonly levels: Readonly<Record<ProficiencyLevel, LevelThreshold>>;
  readonly corroborationEligible: boolean;
  readonly assessmentRequiredForClaim: boolean;
}

function entry(
  code: string,
  name: string,
  categoryId: SkillCategoryId,
  categoryName: string,
): SkillDefinition {
  return {
    code,
    name,
    categoryId,
    categoryName,
    domain: 'SOFTWARE_IT',
    levels: levels(DEFAULT_COMPETENCY_BARS),
    corroborationEligible: true,
    assessmentRequiredForClaim: true,
  };
}

export const SKILL_DEFINITIONS: readonly SkillDefinition[] = [
  entry(
    'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    'Python',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
    'Java',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
    'JavaScript / TypeScript',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
    'Go',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'C_NET_ENTERPRISE_DEVELOPMENT',
    'C# / .NET',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'C_SYSTEMS_PERFORMANCE_ENGINEERING',
    'C++',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
    'Rust',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
    'Kotlin',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
    'Swift',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry('SQL_QUERY_OPTIMIZATION', 'SQL', 'PROGRAMMING_LANGUAGES', 'Programming Languages'),
  entry('R_FOR_STATISTICAL_COMPUTING', 'R', 'PROGRAMMING_LANGUAGES', 'Programming Languages'),
  entry(
    'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS',
    'Scala',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'RESTFUL_GRAPHQL_API_DESIGN',
    'API Design',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    'Algorithms & Performance',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry('AMAZON_WEB_SERVICES_AWS_ARCHITECTURE', 'AWS', 'CLOUD_PLATFORMS', 'Cloud Platforms'),
  entry('MICROSOFT_AZURE_CLOUD_ENGINEERING', 'Azure', 'CLOUD_PLATFORMS', 'Cloud Platforms'),
  entry(
    'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING',
    'Google Cloud (GCP)',
    'CLOUD_PLATFORMS',
    'Cloud Platforms',
  ),
  entry('CI_CD_PIPELINE_ENGINEERING', 'CI/CD', 'DEVOPS_INFRASTRUCTURE', 'DevOps & Infrastructure'),
  entry(
    'CONTAINERIZATION_ORCHESTRATION',
    'Containers & Kubernetes',
    'DEVOPS_INFRASTRUCTURE',
    'DevOps & Infrastructure',
  ),
  entry(
    'OBSERVABILITY_MONITORING',
    'Observability',
    'DEVOPS_INFRASTRUCTURE',
    'DevOps & Infrastructure',
  ),
  entry('GITOPS_CONTINUOUS_DELIVERY', 'GitOps', 'DEVOPS_INFRASTRUCTURE', 'DevOps & Infrastructure'),
  entry(
    'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
    'Relational Databases',
    'DATABASES_DATA_MANAGEMENT',
    'Databases & Data Management',
  ),
  entry(
    'NOSQL_DATABASE_ENGINEERING',
    'NoSQL Databases',
    'DATABASES_DATA_MANAGEMENT',
    'Databases & Data Management',
  ),
  entry(
    'DATA_MODELING_NORMALIZATION',
    'Data Modeling',
    'DATABASES_DATA_MANAGEMENT',
    'Databases & Data Management',
  ),
  entry(
    'DATABASE_PERFORMANCE_TUNING_INDEXING',
    'Database Performance Tuning',
    'DATABASES_DATA_MANAGEMENT',
    'Databases & Data Management',
  ),
  entry(
    'ETL_ELT_PIPELINE_DEVELOPMENT',
    'ETL / ELT',
    'DATA_ENGINEERING_BIG_DATA',
    'Data Engineering & Big Data',
  ),
  entry(
    'BIG_DATA_PROCESSING_FRAMEWORKS',
    'Big Data Processing',
    'DATA_ENGINEERING_BIG_DATA',
    'Data Engineering & Big Data',
  ),
  entry(
    'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
    'Machine Learning',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry(
    'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
    'Deep Learning',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry('NATURAL_LANGUAGE_PROCESSING_NLP', 'NLP', 'AI_ML_DATA_SCIENCE', 'AI, ML & Data Science'),
  entry(
    'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
    'LLM Engineering',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry('MLOPS_MODEL_LIFECYCLE_MANAGEMENT', 'MLOps', 'AI_ML_DATA_SCIENCE', 'AI, ML & Data Science'),
  entry(
    'COMPUTER_VISION_ENGINEERING',
    'Computer Vision',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry(
    'STATISTICAL_ANALYSIS_EXPERIMENTATION',
    'Statistics & A/B Testing',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry('APPLICATION_SECURITY_APPSEC', 'Application Security', 'CYBERSECURITY', 'Cybersecurity'),
  entry('CLOUD_SECURITY_ENGINEERING', 'Cloud Security', 'CYBERSECURITY', 'Cybersecurity'),
  entry(
    'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
    'Penetration Testing',
    'CYBERSECURITY',
    'Cybersecurity',
  ),
  entry(
    'PERFORMANCE_LOAD_TESTING',
    'Performance Testing',
    'TESTING_QA_RELIABILITY',
    'Testing, QA & Reliability',
  ),
  entry(
    'CONTINUOUS_TESTING_QUALITY_ENGINEERING',
    'Quality Engineering',
    'TESTING_QA_RELIABILITY',
    'Testing, QA & Reliability',
  ),
  entry(
    'API_CONTRACT_TESTING',
    'API Testing',
    'TESTING_QA_RELIABILITY',
    'Testing, QA & Reliability',
  ),
  entry(
    'NATIVE_ANDROID_DEVELOPMENT',
    'Android Development',
    'MOBILE_DEVELOPMENT',
    'Mobile Development',
  ),
  entry('NATIVE_IOS_DEVELOPMENT', 'iOS Development', 'MOBILE_DEVELOPMENT', 'Mobile Development'),
  entry(
    'MODERN_FRONTEND_FRAMEWORKS',
    'Frontend Frameworks',
    'FRONTEND_WEB_DEVELOPMENT',
    'Frontend & Web Development',
  ),
  entry(
    'FRONTEND_PERFORMANCE_ENGINEERING',
    'Frontend Performance',
    'FRONTEND_WEB_DEVELOPMENT',
    'Frontend & Web Development',
  ),
  entry(
    'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
    'State Management',
    'FRONTEND_WEB_DEVELOPMENT',
    'Frontend & Web Development',
  ),
  entry(
    'NETWORK_ARCHITECTURE_PROTOCOLS',
    'Networking',
    'NETWORKING_SYSTEMS_ADMINISTRATION',
    'Networking & Systems Administration',
  ),
  entry(
    'LINUX_SYSTEMS_ADMINISTRATION',
    'Linux Administration',
    'NETWORKING_SYSTEMS_ADMINISTRATION',
    'Networking & Systems Administration',
  ),
  entry(
    'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT',
    'Blockchain Development',
    'EMERGING_TECHNOLOGY',
    'Emerging Technology',
  ),
  entry(
    'INTERNET_OF_THINGS_IOT_ENGINEERING',
    'IoT Development',
    'EMERGING_TECHNOLOGY',
    'Emerging Technology',
  ),
  entry(
    'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT',
    'AR / VR Development',
    'EMERGING_TECHNOLOGY',
    'Emerging Technology',
  ),
  entry(
    'VERSION_CONTROL_CODE_COLLABORATION',
    'Git & Version Control',
    'DELIVERY_PROCESS_TOOLING',
    'Delivery, Process & Tooling',
  ),
] as const;

export const SKILL_CODES = SKILL_DEFINITIONS.map((skill) => skill.code);
export const SKILL_CODE_SET: ReadonlySet<string> = new Set(SKILL_CODES);

export interface SkillCategoryGroup {
  readonly id: SkillCategoryId;
  readonly name: string;
  readonly skills: readonly SkillDefinition[];
}

export function groupSkillsByCategory(): readonly SkillCategoryGroup[] {
  return SKILL_CATEGORY_IDS.map((id) => ({
    id,
    name: SKILL_CATEGORIES[id].name,
    skills: SKILL_DEFINITIONS.filter((skill) => skill.categoryId === id),
  }));
}

export function getSkillDefinition(code: string): SkillDefinition | undefined {
  return SKILL_DEFINITIONS.find((skill) => skill.code === code);
}
