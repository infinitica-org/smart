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
    'Python (Application & Backend Development)',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
    'Java (Enterprise Application Development)',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
    'JavaScript / TypeScript (Full-Stack Development)',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
    'Go (Golang) for High-Performance Services',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'C_NET_ENTERPRISE_DEVELOPMENT',
    'C# / .NET Enterprise Development',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'C_SYSTEMS_PERFORMANCE_ENGINEERING',
    'C++ (Systems & Performance Engineering)',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
    'Rust for Systems & Reliability Engineering',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
    'Kotlin for Android & Backend Services',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
    'Swift for iOS/macOS Development',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'SQL_QUERY_OPTIMIZATION',
    'SQL & Query Optimization',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'R_FOR_STATISTICAL_COMPUTING',
    'R for Statistical Computing',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS',
    'Scala for Distributed Data Systems',
    'PROGRAMMING_LANGUAGES',
    'Programming Languages',
  ),
  entry(
    'DISTRIBUTED_SYSTEMS_DESIGN',
    'Distributed Systems Design',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'MICROSERVICES_ARCHITECTURE_SERVICE_DECOMPOSITION',
    'Microservices Architecture & Service Decomposition',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'EVENT_DRIVEN_ARCHITECTURE',
    'Event-Driven Architecture',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'RESTFUL_GRAPHQL_API_DESIGN',
    'RESTful & GraphQL API Design',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'SCALABLE_SYSTEM_HIGH_AVAILABILITY_ARCHITECTURE',
    'Scalable System & High-Availability Architecture',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'DOMAIN_DRIVEN_DESIGN_DDD',
    'Domain-Driven Design (DDD)',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'DESIGN_PATTERNS_CLEAN_ARCHITECTURE',
    'Design Patterns & Clean Architecture',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    'Algorithmic Complexity & Performance Optimization',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'API_GATEWAY_SERVICE_MESH_MANAGEMENT',
    'API Gateway & Service Mesh Management',
    'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
    'Software Architecture & System Design',
  ),
  entry(
    'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE',
    'Amazon Web Services (AWS) Architecture',
    'CLOUD_PLATFORMS',
    'Cloud Platforms',
  ),
  entry(
    'MICROSOFT_AZURE_CLOUD_ENGINEERING',
    'Microsoft Azure Cloud Engineering',
    'CLOUD_PLATFORMS',
    'Cloud Platforms',
  ),
  entry(
    'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING',
    'Google Cloud Platform (GCP) Engineering',
    'CLOUD_PLATFORMS',
    'Cloud Platforms',
  ),
  entry(
    'MULTI_CLOUD_HYBRID_CLOUD_STRATEGY',
    'Multi-Cloud & Hybrid Cloud Strategy',
    'CLOUD_PLATFORMS',
    'Cloud Platforms',
  ),
  entry('SERVERLESS_ARCHITECTURE', 'Serverless Architecture', 'CLOUD_PLATFORMS', 'Cloud Platforms'),
  entry(
    'CLOUD_COST_OPTIMIZATION_FINOPS',
    'Cloud Cost Optimization (FinOps)',
    'CLOUD_PLATFORMS',
    'Cloud Platforms',
  ),
  entry(
    'INFRASTRUCTURE_AS_CODE_IAC',
    'Infrastructure as Code (IaC)',
    'DEVOPS_INFRASTRUCTURE',
    'DevOps & Infrastructure',
  ),
  entry(
    'CI_CD_PIPELINE_ENGINEERING',
    'CI/CD Pipeline Engineering',
    'DEVOPS_INFRASTRUCTURE',
    'DevOps & Infrastructure',
  ),
  entry(
    'CONTAINERIZATION_ORCHESTRATION',
    'Containerization & Orchestration',
    'DEVOPS_INFRASTRUCTURE',
    'DevOps & Infrastructure',
  ),
  entry(
    'SITE_RELIABILITY_ENGINEERING_SRE',
    'Site Reliability Engineering (SRE)',
    'DEVOPS_INFRASTRUCTURE',
    'DevOps & Infrastructure',
  ),
  entry(
    'OBSERVABILITY_MONITORING',
    'Observability & Monitoring',
    'DEVOPS_INFRASTRUCTURE',
    'DevOps & Infrastructure',
  ),
  entry(
    'CONFIGURATION_MANAGEMENT_AUTOMATION',
    'Configuration Management & Automation',
    'DEVOPS_INFRASTRUCTURE',
    'DevOps & Infrastructure',
  ),
  entry(
    'GITOPS_CONTINUOUS_DELIVERY',
    'GitOps & Continuous Delivery',
    'DEVOPS_INFRASTRUCTURE',
    'DevOps & Infrastructure',
  ),
  entry(
    'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
    'Relational Database Design & Administration',
    'DATABASES_DATA_MANAGEMENT',
    'Databases & Data Management',
  ),
  entry(
    'NOSQL_DATABASE_ENGINEERING',
    'NoSQL Database Engineering',
    'DATABASES_DATA_MANAGEMENT',
    'Databases & Data Management',
  ),
  entry(
    'DATA_MODELING_NORMALIZATION',
    'Data Modeling & Normalization',
    'DATABASES_DATA_MANAGEMENT',
    'Databases & Data Management',
  ),
  entry(
    'DATABASE_PERFORMANCE_TUNING_INDEXING',
    'Database Performance Tuning & Indexing',
    'DATABASES_DATA_MANAGEMENT',
    'Databases & Data Management',
  ),
  entry(
    'DATA_WAREHOUSING',
    'Data Warehousing',
    'DATABASES_DATA_MANAGEMENT',
    'Databases & Data Management',
  ),
  entry(
    'ETL_ELT_PIPELINE_DEVELOPMENT',
    'ETL/ELT Pipeline Development',
    'DATA_ENGINEERING_BIG_DATA',
    'Data Engineering & Big Data',
  ),
  entry(
    'BIG_DATA_PROCESSING_FRAMEWORKS',
    'Big Data Processing Frameworks',
    'DATA_ENGINEERING_BIG_DATA',
    'Data Engineering & Big Data',
  ),
  entry(
    'STREAM_PROCESSING_MESSAGING_SYSTEMS',
    'Stream Processing & Messaging Systems',
    'DATA_ENGINEERING_BIG_DATA',
    'Data Engineering & Big Data',
  ),
  entry(
    'DATA_LAKE_LAKEHOUSE_ARCHITECTURE',
    'Data Lake & Lakehouse Architecture',
    'DATA_ENGINEERING_BIG_DATA',
    'Data Engineering & Big Data',
  ),
  entry(
    'DATA_GOVERNANCE_QUALITY_ENGINEERING',
    'Data Governance & Quality Engineering',
    'DATA_ENGINEERING_BIG_DATA',
    'Data Engineering & Big Data',
  ),
  entry(
    'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
    'Machine Learning Model Development & Deployment',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry(
    'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
    'Deep Learning & Neural Network Engineering',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry(
    'NATURAL_LANGUAGE_PROCESSING_NLP',
    'Natural Language Processing (NLP)',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry(
    'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
    'Large Language Model (LLM) Application Engineering',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry(
    'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
    'MLOps & Model Lifecycle Management',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry(
    'COMPUTER_VISION_ENGINEERING',
    'Computer Vision Engineering',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry(
    'STATISTICAL_ANALYSIS_EXPERIMENTATION',
    'Statistical Analysis & Experimentation',
    'AI_ML_DATA_SCIENCE',
    'AI, ML & Data Science',
  ),
  entry(
    'APPLICATION_SECURITY_APPSEC',
    'Application Security (AppSec)',
    'CYBERSECURITY',
    'Cybersecurity',
  ),
  entry(
    'CLOUD_SECURITY_ENGINEERING',
    'Cloud Security Engineering',
    'CYBERSECURITY',
    'Cybersecurity',
  ),
  entry(
    'IDENTITY_ACCESS_MANAGEMENT_IAM',
    'Identity & Access Management (IAM)',
    'CYBERSECURITY',
    'Cybersecurity',
  ),
  entry(
    'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
    'Penetration Testing & Vulnerability Assessment',
    'CYBERSECURITY',
    'Cybersecurity',
  ),
  entry(
    'SECURITY_OPERATIONS_INCIDENT_RESPONSE',
    'Security Operations & Incident Response',
    'CYBERSECURITY',
    'Cybersecurity',
  ),
  entry(
    'COMPLIANCE_RISK_MANAGEMENT',
    'Compliance & Risk Management',
    'CYBERSECURITY',
    'Cybersecurity',
  ),
  entry(
    'TEST_AUTOMATION_ENGINEERING',
    'Test Automation Engineering',
    'TESTING_QA_RELIABILITY',
    'Testing, QA & Reliability',
  ),
  entry(
    'PERFORMANCE_LOAD_TESTING',
    'Performance & Load Testing',
    'TESTING_QA_RELIABILITY',
    'Testing, QA & Reliability',
  ),
  entry(
    'CONTINUOUS_TESTING_QUALITY_ENGINEERING',
    'Continuous Testing & Quality Engineering',
    'TESTING_QA_RELIABILITY',
    'Testing, QA & Reliability',
  ),
  entry(
    'API_CONTRACT_TESTING',
    'API & Contract Testing',
    'TESTING_QA_RELIABILITY',
    'Testing, QA & Reliability',
  ),
  entry(
    'NATIVE_ANDROID_DEVELOPMENT',
    'Native Android Development',
    'MOBILE_DEVELOPMENT',
    'Mobile Development',
  ),
  entry(
    'NATIVE_IOS_DEVELOPMENT',
    'Native iOS Development',
    'MOBILE_DEVELOPMENT',
    'Mobile Development',
  ),
  entry(
    'CROSS_PLATFORM_MOBILE_DEVELOPMENT',
    'Cross-Platform Mobile Development',
    'MOBILE_DEVELOPMENT',
    'Mobile Development',
  ),
  entry(
    'MODERN_FRONTEND_FRAMEWORKS',
    'Modern Frontend Frameworks',
    'FRONTEND_WEB_DEVELOPMENT',
    'Frontend & Web Development',
  ),
  entry(
    'FRONTEND_PERFORMANCE_ENGINEERING',
    'Frontend Performance Engineering',
    'FRONTEND_WEB_DEVELOPMENT',
    'Frontend & Web Development',
  ),
  entry(
    'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
    'State Management & Component Architecture',
    'FRONTEND_WEB_DEVELOPMENT',
    'Frontend & Web Development',
  ),
  entry(
    'ACCESSIBILITY_ENGINEERING_A11Y',
    'Accessibility Engineering (a11y)',
    'FRONTEND_WEB_DEVELOPMENT',
    'Frontend & Web Development',
  ),
  entry(
    'NETWORK_ARCHITECTURE_PROTOCOLS',
    'Network Architecture & Protocols',
    'NETWORKING_SYSTEMS_ADMINISTRATION',
    'Networking & Systems Administration',
  ),
  entry(
    'LINUX_SYSTEMS_ADMINISTRATION',
    'Linux Systems Administration',
    'NETWORKING_SYSTEMS_ADMINISTRATION',
    'Networking & Systems Administration',
  ),
  entry(
    'VIRTUALIZATION_HYPERVISOR_MANAGEMENT',
    'Virtualization & Hypervisor Management',
    'NETWORKING_SYSTEMS_ADMINISTRATION',
    'Networking & Systems Administration',
  ),
  entry(
    'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT',
    'Blockchain & Smart Contract Development',
    'EMERGING_TECHNOLOGY',
    'Emerging Technology',
  ),
  entry(
    'INTERNET_OF_THINGS_IOT_ENGINEERING',
    'Internet of Things (IoT) Engineering',
    'EMERGING_TECHNOLOGY',
    'Emerging Technology',
  ),
  entry(
    'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT',
    'Augmented & Virtual Reality Development',
    'EMERGING_TECHNOLOGY',
    'Emerging Technology',
  ),
  entry('EDGE_COMPUTING', 'Edge Computing', 'EMERGING_TECHNOLOGY', 'Emerging Technology'),
  entry(
    'AGILE_DELIVERY_LEADERSHIP',
    'Agile Delivery Leadership',
    'DELIVERY_PROCESS_TOOLING',
    'Delivery, Process & Tooling',
  ),
  entry(
    'TECHNICAL_PROGRAM_PROJECT_MANAGEMENT',
    'Technical Program & Project Management',
    'DELIVERY_PROCESS_TOOLING',
    'Delivery, Process & Tooling',
  ),
  entry(
    'VERSION_CONTROL_CODE_COLLABORATION',
    'Version Control & Code Collaboration',
    'DELIVERY_PROCESS_TOOLING',
    'Delivery, Process & Tooling',
  ),
  entry(
    'TECHNICAL_DOCUMENTATION_KNOWLEDGE_MANAGEMENT',
    'Technical Documentation & Knowledge Management',
    'DELIVERY_PROCESS_TOOLING',
    'Delivery, Process & Tooling',
  ),
  entry(
    'CROSS_FUNCTIONAL_STAKEHOLDER_COLLABORATION',
    'Cross-Functional & Stakeholder Collaboration',
    'DELIVERY_PROCESS_TOOLING',
    'Delivery, Process & Tooling',
  ),
  entry(
    'MENTORSHIP_TECHNICAL_LEADERSHIP',
    'Mentorship & Technical Leadership',
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
