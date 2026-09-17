/**
 * AUTO-GENERATED from tools/content-pipeline/src/skill-registry-data.ts
 * Regenerate: pnpm --filter @smart/content-pipeline codegen:competencies
 * DO NOT EDIT MANUALLY.
 */
import type { SkillBlueprint } from '../domain/evidence/skill-blueprint.js';

export const SKILL_COMPETENCY_INDEX: Readonly<Record<string, SkillBlueprint>> = {
  'PYTHON_APPLICATION_BACKEND_DEVELOPMENT': {
    skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    name: 'Python',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '828ed14b-2aca-408b-adc1-78e24f22b09d',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        capability: 'Python syntax, idioms & standard library',
        observableBehaviours: [
          'Explains python syntax, idioms & standard library accurately under assessment conditions',
          'Applies python syntax, idioms & standard library to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates python syntax, idioms & standard library in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'e74fb14e-7e33-41fd-a709-4c23f24656be',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        capability: 'OOP, typing & backend framework basics',
        observableBehaviours: [
          'Explains oop, typing & backend framework basics accurately under assessment conditions',
          'Applies oop, typing & backend framework basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates oop, typing & backend framework basics in timed assessment items',
        ],
        prerequisites: [ '828ed14b-2aca-408b-adc1-78e24f22b09d' ],
        role: 'core',
      },
      {
        competencyId: '296c4b35-7619-482c-aa9c-5d9b980598d3',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        capability: 'REST APIs, data validation & persistence',
        observableBehaviours: [
          'Explains rest apis, data validation & persistence accurately under assessment conditions',
          'Applies rest apis, data validation & persistence to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates rest apis, data validation & persistence in timed assessment items',
        ],
        prerequisites: [ 'e74fb14e-7e33-41fd-a709-4c23f24656be' ],
        role: 'supporting',
      },
      {
        competencyId: 'a12803b7-ad4b-48a4-a042-5a948daaf7ef',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        capability: 'Async I/O, concurrency & service integration',
        observableBehaviours: [
          'Explains async i/o, concurrency & service integration accurately under assessment conditions',
          'Applies async i/o, concurrency & service integration to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates async i/o, concurrency & service integration in timed assessment items',
        ],
        prerequisites: [ '296c4b35-7619-482c-aa9c-5d9b980598d3' ],
        role: 'critical',
      },
      {
        competencyId: '445faf5d-334e-473a-adda-495be6fb6350',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        capability: 'Testing, profiling & production debugging',
        observableBehaviours: [
          'Explains testing, profiling & production debugging accurately under assessment conditions',
          'Applies testing, profiling & production debugging to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates testing, profiling & production debugging in timed assessment items',
        ],
        prerequisites: [ 'a12803b7-ad4b-48a4-a042-5a948daaf7ef' ],
        role: 'critical',
      },
      {
        competencyId: 'ce43fb80-9697-44ea-af6a-bbdc7f60c0e4',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        capability: 'Backend architecture, packaging & deployment',
        observableBehaviours: [
          'Explains backend architecture, packaging & deployment accurately under assessment conditions',
          'Applies backend architecture, packaging & deployment to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates backend architecture, packaging & deployment in timed assessment items',
        ],
        prerequisites: [ '445faf5d-334e-473a-adda-495be6fb6350' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '828ed14b-2aca-408b-adc1-78e24f22b09d' ], criticalCompetencyIds: [ '828ed14b-2aca-408b-adc1-78e24f22b09d' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '828ed14b-2aca-408b-adc1-78e24f22b09d', 'e74fb14e-7e33-41fd-a709-4c23f24656be', '296c4b35-7619-482c-aa9c-5d9b980598d3' ], criticalCompetencyIds: [ '296c4b35-7619-482c-aa9c-5d9b980598d3' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '828ed14b-2aca-408b-adc1-78e24f22b09d', 'e74fb14e-7e33-41fd-a709-4c23f24656be', '296c4b35-7619-482c-aa9c-5d9b980598d3', 'a12803b7-ad4b-48a4-a042-5a948daaf7ef', '445faf5d-334e-473a-adda-495be6fb6350' ], criticalCompetencyIds: [ 'a12803b7-ad4b-48a4-a042-5a948daaf7ef', '445faf5d-334e-473a-adda-495be6fb6350' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '828ed14b-2aca-408b-adc1-78e24f22b09d', 'e74fb14e-7e33-41fd-a709-4c23f24656be', '296c4b35-7619-482c-aa9c-5d9b980598d3', 'a12803b7-ad4b-48a4-a042-5a948daaf7ef', '445faf5d-334e-473a-adda-495be6fb6350', 'ce43fb80-9697-44ea-af6a-bbdc7f60c0e4' ], criticalCompetencyIds: [ '445faf5d-334e-473a-adda-495be6fb6350', 'ce43fb80-9697-44ea-af6a-bbdc7f60c0e4' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Python',
      INTERMEDIATE: 'Independent execution of bounded Python tasks',
      ADVANCED: 'Owns Python components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Python at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT': {
    skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
    name: 'Java',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '28c50e02-3e03-471b-af3c-7e1550c1306a',
        skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
        capability: 'Java language fundamentals & JVM basics',
        observableBehaviours: [
          'Explains java language fundamentals & jvm basics accurately under assessment conditions',
          'Applies java language fundamentals & jvm basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates java language fundamentals & jvm basics in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '55b9fc11-2d27-4b66-acb5-7e831a446065',
        skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
        capability: 'OOP, collections & Spring Boot essentials',
        observableBehaviours: [
          'Explains oop, collections & spring boot essentials accurately under assessment conditions',
          'Applies oop, collections & spring boot essentials to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates oop, collections & spring boot essentials in timed assessment items',
        ],
        prerequisites: [ '28c50e02-3e03-471b-af3c-7e1550c1306a' ],
        role: 'core',
      },
      {
        competencyId: 'f0b2b3a0-4a69-49a9-abfe-84d7adff25ab',
        skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
        capability: 'Enterprise APIs, JPA & transaction management',
        observableBehaviours: [
          'Explains enterprise apis, jpa & transaction management accurately under assessment conditions',
          'Applies enterprise apis, jpa & transaction management to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates enterprise apis, jpa & transaction management in timed assessment items',
        ],
        prerequisites: [ '55b9fc11-2d27-4b66-acb5-7e831a446065' ],
        role: 'supporting',
      },
      {
        competencyId: '841483d9-ef92-4e64-ab32-569f940bb9fe',
        skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
        capability: 'Concurrency, JVM tuning & microservice patterns',
        observableBehaviours: [
          'Explains concurrency, jvm tuning & microservice patterns accurately under assessment conditions',
          'Applies concurrency, jvm tuning & microservice patterns to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates concurrency, jvm tuning & microservice patterns in timed assessment items',
        ],
        prerequisites: [ 'f0b2b3a0-4a69-49a9-abfe-84d7adff25ab' ],
        role: 'critical',
      },
      {
        competencyId: '8c670f60-16cb-4b16-aa36-374f69b4ff1c',
        skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
        capability: 'JUnit testing, debugging & observability',
        observableBehaviours: [
          'Explains junit testing, debugging & observability accurately under assessment conditions',
          'Applies junit testing, debugging & observability to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates junit testing, debugging & observability in timed assessment items',
        ],
        prerequisites: [ '841483d9-ef92-4e64-ab32-569f940bb9fe' ],
        role: 'critical',
      },
      {
        competencyId: '61a02bdd-fdd8-45d6-aa3a-ae11f6e1f4bc',
        skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
        capability: 'Enterprise architecture & modular design',
        observableBehaviours: [
          'Explains enterprise architecture & modular design accurately under assessment conditions',
          'Applies enterprise architecture & modular design to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates enterprise architecture & modular design in timed assessment items',
        ],
        prerequisites: [ '8c670f60-16cb-4b16-aa36-374f69b4ff1c' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '28c50e02-3e03-471b-af3c-7e1550c1306a' ], criticalCompetencyIds: [ '28c50e02-3e03-471b-af3c-7e1550c1306a' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '28c50e02-3e03-471b-af3c-7e1550c1306a', '55b9fc11-2d27-4b66-acb5-7e831a446065', 'f0b2b3a0-4a69-49a9-abfe-84d7adff25ab' ], criticalCompetencyIds: [ 'f0b2b3a0-4a69-49a9-abfe-84d7adff25ab' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '28c50e02-3e03-471b-af3c-7e1550c1306a', '55b9fc11-2d27-4b66-acb5-7e831a446065', 'f0b2b3a0-4a69-49a9-abfe-84d7adff25ab', '841483d9-ef92-4e64-ab32-569f940bb9fe', '8c670f60-16cb-4b16-aa36-374f69b4ff1c' ], criticalCompetencyIds: [ '841483d9-ef92-4e64-ab32-569f940bb9fe', '8c670f60-16cb-4b16-aa36-374f69b4ff1c' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '28c50e02-3e03-471b-af3c-7e1550c1306a', '55b9fc11-2d27-4b66-acb5-7e831a446065', 'f0b2b3a0-4a69-49a9-abfe-84d7adff25ab', '841483d9-ef92-4e64-ab32-569f940bb9fe', '8c670f60-16cb-4b16-aa36-374f69b4ff1c', '61a02bdd-fdd8-45d6-aa3a-ae11f6e1f4bc' ], criticalCompetencyIds: [ '8c670f60-16cb-4b16-aa36-374f69b4ff1c', '61a02bdd-fdd8-45d6-aa3a-ae11f6e1f4bc' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Java',
      INTERMEDIATE: 'Independent execution of bounded Java tasks',
      ADVANCED: 'Owns Java components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Java at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT': {
    skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
    name: 'JavaScript / TypeScript',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '5ab5195a-f35b-40ae-ab33-a64c9622afb2',
        skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
        capability: 'JavaScript/TypeScript language fundamentals',
        observableBehaviours: [
          'Explains javascript/typescript language fundamentals accurately under assessment conditions',
          'Applies javascript/typescript language fundamentals to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates javascript/typescript language fundamentals in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '5ac9bf05-7872-4116-a62a-d2f7a1e1d6d2',
        skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
        capability: 'DOM, async patterns & Node.js runtime',
        observableBehaviours: [
          'Explains dom, async patterns & node.js runtime accurately under assessment conditions',
          'Applies dom, async patterns & node.js runtime to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates dom, async patterns & node.js runtime in timed assessment items',
        ],
        prerequisites: [ '5ab5195a-f35b-40ae-ab33-a64c9622afb2' ],
        role: 'core',
      },
      {
        competencyId: '00b56ff3-f3c2-4693-a868-c7d571a16e98',
        skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
        capability: 'React/Node full-stack component design',
        observableBehaviours: [
          'Explains react/node full-stack component design accurately under assessment conditions',
          'Applies react/node full-stack component design to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates react/node full-stack component design in timed assessment items',
        ],
        prerequisites: [ '5ac9bf05-7872-4116-a62a-d2f7a1e1d6d2' ],
        role: 'supporting',
      },
      {
        competencyId: '87983fe0-51c8-4676-afdc-390fc141a694',
        skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
        capability: 'State management, APIs & auth flows',
        observableBehaviours: [
          'Explains state management, apis & auth flows accurately under assessment conditions',
          'Applies state management, apis & auth flows to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates state management, apis & auth flows in timed assessment items',
        ],
        prerequisites: [ '00b56ff3-f3c2-4693-a868-c7d571a16e98' ],
        role: 'critical',
      },
      {
        competencyId: '231ce1dd-97aa-4ceb-a76a-36bedceee509',
        skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
        capability: 'Testing, bundling & performance tuning',
        observableBehaviours: [
          'Explains testing, bundling & performance tuning accurately under assessment conditions',
          'Applies testing, bundling & performance tuning to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates testing, bundling & performance tuning in timed assessment items',
        ],
        prerequisites: [ '87983fe0-51c8-4676-afdc-390fc141a694' ],
        role: 'critical',
      },
      {
        competencyId: '166f8955-9fb1-4904-a46d-f866b3a2adbe',
        skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
        capability: 'Full-stack architecture & deployment',
        observableBehaviours: [
          'Explains full-stack architecture & deployment accurately under assessment conditions',
          'Applies full-stack architecture & deployment to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates full-stack architecture & deployment in timed assessment items',
        ],
        prerequisites: [ '231ce1dd-97aa-4ceb-a76a-36bedceee509' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '5ab5195a-f35b-40ae-ab33-a64c9622afb2' ], criticalCompetencyIds: [ '5ab5195a-f35b-40ae-ab33-a64c9622afb2' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '5ab5195a-f35b-40ae-ab33-a64c9622afb2', '5ac9bf05-7872-4116-a62a-d2f7a1e1d6d2', '00b56ff3-f3c2-4693-a868-c7d571a16e98' ], criticalCompetencyIds: [ '00b56ff3-f3c2-4693-a868-c7d571a16e98' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '5ab5195a-f35b-40ae-ab33-a64c9622afb2', '5ac9bf05-7872-4116-a62a-d2f7a1e1d6d2', '00b56ff3-f3c2-4693-a868-c7d571a16e98', '87983fe0-51c8-4676-afdc-390fc141a694', '231ce1dd-97aa-4ceb-a76a-36bedceee509' ], criticalCompetencyIds: [ '87983fe0-51c8-4676-afdc-390fc141a694', '231ce1dd-97aa-4ceb-a76a-36bedceee509' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '5ab5195a-f35b-40ae-ab33-a64c9622afb2', '5ac9bf05-7872-4116-a62a-d2f7a1e1d6d2', '00b56ff3-f3c2-4693-a868-c7d571a16e98', '87983fe0-51c8-4676-afdc-390fc141a694', '231ce1dd-97aa-4ceb-a76a-36bedceee509', '166f8955-9fb1-4904-a46d-f866b3a2adbe' ], criticalCompetencyIds: [ '231ce1dd-97aa-4ceb-a76a-36bedceee509', '166f8955-9fb1-4904-a46d-f866b3a2adbe' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of JavaScript / TypeScript',
      INTERMEDIATE: 'Independent execution of bounded JavaScript / TypeScript tasks',
      ADVANCED: 'Owns JavaScript / TypeScript components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for JavaScript / TypeScript at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES': {
    skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
    name: 'Go',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '3e4021f8-2e53-4a9f-a557-bc4e5dfc7db5',
        skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
        capability: 'Go syntax, interfaces & error handling',
        observableBehaviours: [
          'Explains go syntax, interfaces & error handling accurately under assessment conditions',
          'Applies go syntax, interfaces & error handling to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates go syntax, interfaces & error handling in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'f5e4e54f-72ae-4fd0-ab16-ffbeaff5b0f9',
        skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
        capability: 'Goroutines, channels & concurrency primitives',
        observableBehaviours: [
          'Explains goroutines, channels & concurrency primitives accurately under assessment conditions',
          'Applies goroutines, channels & concurrency primitives to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates goroutines, channels & concurrency primitives in timed assessment items',
        ],
        prerequisites: [ '3e4021f8-2e53-4a9f-a557-bc4e5dfc7db5' ],
        role: 'core',
      },
      {
        competencyId: '97ebbb4b-5b35-4dc9-ad13-5a471c975d4d',
        skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
        capability: 'HTTP services, middleware & stdlib patterns',
        observableBehaviours: [
          'Explains http services, middleware & stdlib patterns accurately under assessment conditions',
          'Applies http services, middleware & stdlib patterns to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates http services, middleware & stdlib patterns in timed assessment items',
        ],
        prerequisites: [ 'f5e4e54f-72ae-4fd0-ab16-ffbeaff5b0f9' ],
        role: 'supporting',
      },
      {
        competencyId: '80d946f1-6cf6-4c10-af29-a5f91235cd00',
        skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
        capability: 'Performance profiling & memory management',
        observableBehaviours: [
          'Explains performance profiling & memory management accurately under assessment conditions',
          'Applies performance profiling & memory management to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates performance profiling & memory management in timed assessment items',
        ],
        prerequisites: [ '97ebbb4b-5b35-4dc9-ad13-5a471c975d4d' ],
        role: 'critical',
      },
      {
        competencyId: '44915f9f-185e-433f-a98d-5034c23acf5b',
        skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
        capability: 'Testing, benchmarking & deployment',
        observableBehaviours: [
          'Explains testing, benchmarking & deployment accurately under assessment conditions',
          'Applies testing, benchmarking & deployment to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates testing, benchmarking & deployment in timed assessment items',
        ],
        prerequisites: [ '80d946f1-6cf6-4c10-af29-a5f91235cd00' ],
        role: 'critical',
      },
      {
        competencyId: '12cf4c61-47b1-4165-a91d-c91e3c11812a',
        skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
        capability: 'Distributed service design with Go',
        observableBehaviours: [
          'Explains distributed service design with go accurately under assessment conditions',
          'Applies distributed service design with go to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates distributed service design with go in timed assessment items',
        ],
        prerequisites: [ '44915f9f-185e-433f-a98d-5034c23acf5b' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '3e4021f8-2e53-4a9f-a557-bc4e5dfc7db5' ], criticalCompetencyIds: [ '3e4021f8-2e53-4a9f-a557-bc4e5dfc7db5' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '3e4021f8-2e53-4a9f-a557-bc4e5dfc7db5', 'f5e4e54f-72ae-4fd0-ab16-ffbeaff5b0f9', '97ebbb4b-5b35-4dc9-ad13-5a471c975d4d' ], criticalCompetencyIds: [ '97ebbb4b-5b35-4dc9-ad13-5a471c975d4d' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '3e4021f8-2e53-4a9f-a557-bc4e5dfc7db5', 'f5e4e54f-72ae-4fd0-ab16-ffbeaff5b0f9', '97ebbb4b-5b35-4dc9-ad13-5a471c975d4d', '80d946f1-6cf6-4c10-af29-a5f91235cd00', '44915f9f-185e-433f-a98d-5034c23acf5b' ], criticalCompetencyIds: [ '80d946f1-6cf6-4c10-af29-a5f91235cd00', '44915f9f-185e-433f-a98d-5034c23acf5b' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '3e4021f8-2e53-4a9f-a557-bc4e5dfc7db5', 'f5e4e54f-72ae-4fd0-ab16-ffbeaff5b0f9', '97ebbb4b-5b35-4dc9-ad13-5a471c975d4d', '80d946f1-6cf6-4c10-af29-a5f91235cd00', '44915f9f-185e-433f-a98d-5034c23acf5b', '12cf4c61-47b1-4165-a91d-c91e3c11812a' ], criticalCompetencyIds: [ '44915f9f-185e-433f-a98d-5034c23acf5b', '12cf4c61-47b1-4165-a91d-c91e3c11812a' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Go',
      INTERMEDIATE: 'Independent execution of bounded Go tasks',
      ADVANCED: 'Owns Go components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Go at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'C_NET_ENTERPRISE_DEVELOPMENT': {
    skillCode: 'C_NET_ENTERPRISE_DEVELOPMENT',
    name: 'C# / .NET',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '149f8167-2fea-4c83-af90-2790815828f9',
        skillCode: 'C_NET_ENTERPRISE_DEVELOPMENT',
        capability: 'C# language & .NET runtime fundamentals',
        observableBehaviours: [
          'Explains c# language & .net runtime fundamentals accurately under assessment conditions',
          'Applies c# language & .net runtime fundamentals to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates c# language & .net runtime fundamentals in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '43da0926-e990-4cbb-a2c7-239080001e3b',
        skillCode: 'C_NET_ENTERPRISE_DEVELOPMENT',
        capability: 'OOP, LINQ & ASP.NET Core basics',
        observableBehaviours: [
          'Explains oop, linq & asp.net core basics accurately under assessment conditions',
          'Applies oop, linq & asp.net core basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates oop, linq & asp.net core basics in timed assessment items',
        ],
        prerequisites: [ '149f8167-2fea-4c83-af90-2790815828f9' ],
        role: 'core',
      },
      {
        competencyId: '09de4f38-32d7-488a-a0cb-20404ea45748',
        skillCode: 'C_NET_ENTERPRISE_DEVELOPMENT',
        capability: 'Entity Framework, APIs & dependency injection',
        observableBehaviours: [
          'Explains entity framework, apis & dependency injection accurately under assessment conditions',
          'Applies entity framework, apis & dependency injection to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates entity framework, apis & dependency injection in timed assessment items',
        ],
        prerequisites: [ '43da0926-e990-4cbb-a2c7-239080001e3b' ],
        role: 'supporting',
      },
      {
        competencyId: '524faa52-acc8-47d5-a456-ec5b469c6d71',
        skillCode: 'C_NET_ENTERPRISE_DEVELOPMENT',
        capability: 'Async/await, caching & enterprise patterns',
        observableBehaviours: [
          'Explains async/await, caching & enterprise patterns accurately under assessment conditions',
          'Applies async/await, caching & enterprise patterns to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates async/await, caching & enterprise patterns in timed assessment items',
        ],
        prerequisites: [ '09de4f38-32d7-488a-a0cb-20404ea45748' ],
        role: 'critical',
      },
      {
        competencyId: '90e1b076-77d3-4a3b-a082-d36e11a21e2c',
        skillCode: 'C_NET_ENTERPRISE_DEVELOPMENT',
        capability: 'xUnit testing, diagnostics & performance',
        observableBehaviours: [
          'Explains xunit testing, diagnostics & performance accurately under assessment conditions',
          'Applies xunit testing, diagnostics & performance to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates xunit testing, diagnostics & performance in timed assessment items',
        ],
        prerequisites: [ '524faa52-acc8-47d5-a456-ec5b469c6d71' ],
        role: 'critical',
      },
      {
        competencyId: '81178f98-8408-444e-abf8-4fc6a34f023e',
        skillCode: 'C_NET_ENTERPRISE_DEVELOPMENT',
        capability: '.NET enterprise architecture & cloud deployment',
        observableBehaviours: [
          'Explains .net enterprise architecture & cloud deployment accurately under assessment conditions',
          'Applies .net enterprise architecture & cloud deployment to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates .net enterprise architecture & cloud deployment in timed assessment items',
        ],
        prerequisites: [ '90e1b076-77d3-4a3b-a082-d36e11a21e2c' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '149f8167-2fea-4c83-af90-2790815828f9' ], criticalCompetencyIds: [ '149f8167-2fea-4c83-af90-2790815828f9' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '149f8167-2fea-4c83-af90-2790815828f9', '43da0926-e990-4cbb-a2c7-239080001e3b', '09de4f38-32d7-488a-a0cb-20404ea45748' ], criticalCompetencyIds: [ '09de4f38-32d7-488a-a0cb-20404ea45748' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '149f8167-2fea-4c83-af90-2790815828f9', '43da0926-e990-4cbb-a2c7-239080001e3b', '09de4f38-32d7-488a-a0cb-20404ea45748', '524faa52-acc8-47d5-a456-ec5b469c6d71', '90e1b076-77d3-4a3b-a082-d36e11a21e2c' ], criticalCompetencyIds: [ '524faa52-acc8-47d5-a456-ec5b469c6d71', '90e1b076-77d3-4a3b-a082-d36e11a21e2c' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '149f8167-2fea-4c83-af90-2790815828f9', '43da0926-e990-4cbb-a2c7-239080001e3b', '09de4f38-32d7-488a-a0cb-20404ea45748', '524faa52-acc8-47d5-a456-ec5b469c6d71', '90e1b076-77d3-4a3b-a082-d36e11a21e2c', '81178f98-8408-444e-abf8-4fc6a34f023e' ], criticalCompetencyIds: [ '90e1b076-77d3-4a3b-a082-d36e11a21e2c', '81178f98-8408-444e-abf8-4fc6a34f023e' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of C# / .NET',
      INTERMEDIATE: 'Independent execution of bounded C# / .NET tasks',
      ADVANCED: 'Owns C# / .NET components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for C# / .NET at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'C_SYSTEMS_PERFORMANCE_ENGINEERING': {
    skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
    name: 'C++',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'ad3b22da-451a-45c8-a3a9-83c435352a6c',
        skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
        capability: 'C++ syntax, memory model & pointers',
        observableBehaviours: [
          'Explains c++ syntax, memory model & pointers accurately under assessment conditions',
          'Applies c++ syntax, memory model & pointers to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates c++ syntax, memory model & pointers in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '66630e84-70ec-453b-ae76-a5b56b2d87dc',
        skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
        capability: 'STL, algorithms & template basics',
        observableBehaviours: [
          'Explains stl, algorithms & template basics accurately under assessment conditions',
          'Applies stl, algorithms & template basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates stl, algorithms & template basics in timed assessment items',
        ],
        prerequisites: [ 'ad3b22da-451a-45c8-a3a9-83c435352a6c' ],
        role: 'core',
      },
      {
        competencyId: '18163587-8eba-49be-a27f-578540cc297d',
        skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
        capability: 'Systems programming & low-level I/O',
        observableBehaviours: [
          'Explains systems programming & low-level i/o accurately under assessment conditions',
          'Applies systems programming & low-level i/o to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates systems programming & low-level i/o in timed assessment items',
        ],
        prerequisites: [ '66630e84-70ec-453b-ae76-a5b56b2d87dc' ],
        role: 'supporting',
      },
      {
        competencyId: 'd88ac038-cac1-4f4b-ae48-cddb5f65e16b',
        skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
        capability: 'Performance optimization & cache awareness',
        observableBehaviours: [
          'Explains performance optimization & cache awareness accurately under assessment conditions',
          'Applies performance optimization & cache awareness to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates performance optimization & cache awareness in timed assessment items',
        ],
        prerequisites: [ '18163587-8eba-49be-a27f-578540cc297d' ],
        role: 'critical',
      },
      {
        competencyId: '30463732-2f0c-4c5c-afcc-09540ef0e3c2',
        skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
        capability: 'Debugging, sanitizers & tooling',
        observableBehaviours: [
          'Explains debugging, sanitizers & tooling accurately under assessment conditions',
          'Applies debugging, sanitizers & tooling to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates debugging, sanitizers & tooling in timed assessment items',
        ],
        prerequisites: [ 'd88ac038-cac1-4f4b-ae48-cddb5f65e16b' ],
        role: 'critical',
      },
      {
        competencyId: '862a2b48-9ce2-416c-aec9-cb94c6c929c7',
        skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
        capability: 'Systems architecture & resource trade-offs',
        observableBehaviours: [
          'Explains systems architecture & resource trade-offs accurately under assessment conditions',
          'Applies systems architecture & resource trade-offs to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates systems architecture & resource trade-offs in timed assessment items',
        ],
        prerequisites: [ '30463732-2f0c-4c5c-afcc-09540ef0e3c2' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'ad3b22da-451a-45c8-a3a9-83c435352a6c' ], criticalCompetencyIds: [ 'ad3b22da-451a-45c8-a3a9-83c435352a6c' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'ad3b22da-451a-45c8-a3a9-83c435352a6c', '66630e84-70ec-453b-ae76-a5b56b2d87dc', '18163587-8eba-49be-a27f-578540cc297d' ], criticalCompetencyIds: [ '18163587-8eba-49be-a27f-578540cc297d' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'ad3b22da-451a-45c8-a3a9-83c435352a6c', '66630e84-70ec-453b-ae76-a5b56b2d87dc', '18163587-8eba-49be-a27f-578540cc297d', 'd88ac038-cac1-4f4b-ae48-cddb5f65e16b', '30463732-2f0c-4c5c-afcc-09540ef0e3c2' ], criticalCompetencyIds: [ 'd88ac038-cac1-4f4b-ae48-cddb5f65e16b', '30463732-2f0c-4c5c-afcc-09540ef0e3c2' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'ad3b22da-451a-45c8-a3a9-83c435352a6c', '66630e84-70ec-453b-ae76-a5b56b2d87dc', '18163587-8eba-49be-a27f-578540cc297d', 'd88ac038-cac1-4f4b-ae48-cddb5f65e16b', '30463732-2f0c-4c5c-afcc-09540ef0e3c2', '862a2b48-9ce2-416c-aec9-cb94c6c929c7' ], criticalCompetencyIds: [ '30463732-2f0c-4c5c-afcc-09540ef0e3c2', '862a2b48-9ce2-416c-aec9-cb94c6c929c7' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of C++',
      INTERMEDIATE: 'Independent execution of bounded C++ tasks',
      ADVANCED: 'Owns C++ components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for C++ at org scale',
    },
    assessmentBlueprint: 'SDE_DSA',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING': {
    skillCode: 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
    name: 'Rust',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '48a7bc1a-2153-4c36-aea1-3f16f549fdc6',
        skillCode: 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
        capability: 'Ownership, borrowing & lifetimes',
        observableBehaviours: [
          'Explains ownership, borrowing & lifetimes accurately under assessment conditions',
          'Applies ownership, borrowing & lifetimes to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates ownership, borrowing & lifetimes in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '9f01b32e-50e5-454d-a824-4ea4542a6974',
        skillCode: 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
        capability: 'Traits, enums & error handling idioms',
        observableBehaviours: [
          'Explains traits, enums & error handling idioms accurately under assessment conditions',
          'Applies traits, enums & error handling idioms to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates traits, enums & error handling idioms in timed assessment items',
        ],
        prerequisites: [ '48a7bc1a-2153-4c36-aea1-3f16f549fdc6' ],
        role: 'core',
      },
      {
        competencyId: '3c30312d-b65c-4e18-abeb-5087328b4238',
        skillCode: 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
        capability: 'Async Rust, concurrency & safe parallelism',
        observableBehaviours: [
          'Explains async rust, concurrency & safe parallelism accurately under assessment conditions',
          'Applies async rust, concurrency & safe parallelism to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates async rust, concurrency & safe parallelism in timed assessment items',
        ],
        prerequisites: [ '9f01b32e-50e5-454d-a824-4ea4542a6974' ],
        role: 'supporting',
      },
      {
        competencyId: '55df270e-39c7-4fd6-a6a8-6ce6bc8c078f',
        skillCode: 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
        capability: 'Unsafe code, FFI & systems integration',
        observableBehaviours: [
          'Explains unsafe code, ffi & systems integration accurately under assessment conditions',
          'Applies unsafe code, ffi & systems integration to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates unsafe code, ffi & systems integration in timed assessment items',
        ],
        prerequisites: [ '3c30312d-b65c-4e18-abeb-5087328b4238' ],
        role: 'critical',
      },
      {
        competencyId: '0f189776-19c9-413e-ac54-39c7295a848f',
        skillCode: 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
        capability: 'Testing, Clippy & reliability practices',
        observableBehaviours: [
          'Explains testing, clippy & reliability practices accurately under assessment conditions',
          'Applies testing, clippy & reliability practices to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates testing, clippy & reliability practices in timed assessment items',
        ],
        prerequisites: [ '55df270e-39c7-4fd6-a6a8-6ce6bc8c078f' ],
        role: 'critical',
      },
      {
        competencyId: '34f90e80-dc77-45f8-a6bc-e78ac30490dc',
        skillCode: 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
        capability: 'Reliable systems design with Rust',
        observableBehaviours: [
          'Explains reliable systems design with rust accurately under assessment conditions',
          'Applies reliable systems design with rust to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates reliable systems design with rust in timed assessment items',
        ],
        prerequisites: [ '0f189776-19c9-413e-ac54-39c7295a848f' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '48a7bc1a-2153-4c36-aea1-3f16f549fdc6' ], criticalCompetencyIds: [ '48a7bc1a-2153-4c36-aea1-3f16f549fdc6' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '48a7bc1a-2153-4c36-aea1-3f16f549fdc6', '9f01b32e-50e5-454d-a824-4ea4542a6974', '3c30312d-b65c-4e18-abeb-5087328b4238' ], criticalCompetencyIds: [ '3c30312d-b65c-4e18-abeb-5087328b4238' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '48a7bc1a-2153-4c36-aea1-3f16f549fdc6', '9f01b32e-50e5-454d-a824-4ea4542a6974', '3c30312d-b65c-4e18-abeb-5087328b4238', '55df270e-39c7-4fd6-a6a8-6ce6bc8c078f', '0f189776-19c9-413e-ac54-39c7295a848f' ], criticalCompetencyIds: [ '55df270e-39c7-4fd6-a6a8-6ce6bc8c078f', '0f189776-19c9-413e-ac54-39c7295a848f' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '48a7bc1a-2153-4c36-aea1-3f16f549fdc6', '9f01b32e-50e5-454d-a824-4ea4542a6974', '3c30312d-b65c-4e18-abeb-5087328b4238', '55df270e-39c7-4fd6-a6a8-6ce6bc8c078f', '0f189776-19c9-413e-ac54-39c7295a848f', '34f90e80-dc77-45f8-a6bc-e78ac30490dc' ], criticalCompetencyIds: [ '0f189776-19c9-413e-ac54-39c7295a848f', '34f90e80-dc77-45f8-a6bc-e78ac30490dc' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Rust',
      INTERMEDIATE: 'Independent execution of bounded Rust tasks',
      ADVANCED: 'Owns Rust components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Rust at org scale',
    },
    assessmentBlueprint: 'SDE_DSA',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'KOTLIN_FOR_ANDROID_BACKEND_SERVICES': {
    skillCode: 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
    name: 'Kotlin',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '78993fb5-2016-4609-a2c9-70b21da269b3',
        skillCode: 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
        capability: 'Kotlin syntax, null safety & coroutines',
        observableBehaviours: [
          'Explains kotlin syntax, null safety & coroutines accurately under assessment conditions',
          'Applies kotlin syntax, null safety & coroutines to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates kotlin syntax, null safety & coroutines in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '72dd82c4-c48b-40c6-aa12-9f421eec1e39',
        skillCode: 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
        capability: 'Android UI fundamentals & Jetpack',
        observableBehaviours: [
          'Explains android ui fundamentals & jetpack accurately under assessment conditions',
          'Applies android ui fundamentals & jetpack to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates android ui fundamentals & jetpack in timed assessment items',
        ],
        prerequisites: [ '78993fb5-2016-4609-a2c9-70b21da269b3' ],
        role: 'core',
      },
      {
        competencyId: 'e7fa81ec-d6dc-4f08-a853-f87b3848027e',
        skillCode: 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
        capability: 'Backend services with Ktor/Spring',
        observableBehaviours: [
          'Explains backend services with ktor/spring accurately under assessment conditions',
          'Applies backend services with ktor/spring to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates backend services with ktor/spring in timed assessment items',
        ],
        prerequisites: [ '72dd82c4-c48b-40c6-aa12-9f421eec1e39' ],
        role: 'supporting',
      },
      {
        competencyId: '33103905-d651-443f-af00-0e955b02458e',
        skillCode: 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
        capability: 'Functional patterns & interop with Java',
        observableBehaviours: [
          'Explains functional patterns & interop with java accurately under assessment conditions',
          'Applies functional patterns & interop with java to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates functional patterns & interop with java in timed assessment items',
        ],
        prerequisites: [ 'e7fa81ec-d6dc-4f08-a853-f87b3848027e' ],
        role: 'critical',
      },
      {
        competencyId: '9b41709e-3b31-4559-ad31-01bfb0fb2571',
        skillCode: 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
        capability: 'Testing, Gradle & CI for Kotlin projects',
        observableBehaviours: [
          'Explains testing, gradle & ci for kotlin projects accurately under assessment conditions',
          'Applies testing, gradle & ci for kotlin projects to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates testing, gradle & ci for kotlin projects in timed assessment items',
        ],
        prerequisites: [ '33103905-d651-443f-af00-0e955b02458e' ],
        role: 'critical',
      },
      {
        competencyId: 'a5dd9346-9463-4973-aa63-812db202f7fb',
        skillCode: 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
        capability: 'Mobile/backend architecture with Kotlin',
        observableBehaviours: [
          'Explains mobile/backend architecture with kotlin accurately under assessment conditions',
          'Applies mobile/backend architecture with kotlin to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates mobile/backend architecture with kotlin in timed assessment items',
        ],
        prerequisites: [ '9b41709e-3b31-4559-ad31-01bfb0fb2571' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '78993fb5-2016-4609-a2c9-70b21da269b3' ], criticalCompetencyIds: [ '78993fb5-2016-4609-a2c9-70b21da269b3' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '78993fb5-2016-4609-a2c9-70b21da269b3', '72dd82c4-c48b-40c6-aa12-9f421eec1e39', 'e7fa81ec-d6dc-4f08-a853-f87b3848027e' ], criticalCompetencyIds: [ 'e7fa81ec-d6dc-4f08-a853-f87b3848027e' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '78993fb5-2016-4609-a2c9-70b21da269b3', '72dd82c4-c48b-40c6-aa12-9f421eec1e39', 'e7fa81ec-d6dc-4f08-a853-f87b3848027e', '33103905-d651-443f-af00-0e955b02458e', '9b41709e-3b31-4559-ad31-01bfb0fb2571' ], criticalCompetencyIds: [ '33103905-d651-443f-af00-0e955b02458e', '9b41709e-3b31-4559-ad31-01bfb0fb2571' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '78993fb5-2016-4609-a2c9-70b21da269b3', '72dd82c4-c48b-40c6-aa12-9f421eec1e39', 'e7fa81ec-d6dc-4f08-a853-f87b3848027e', '33103905-d651-443f-af00-0e955b02458e', '9b41709e-3b31-4559-ad31-01bfb0fb2571', 'a5dd9346-9463-4973-aa63-812db202f7fb' ], criticalCompetencyIds: [ '9b41709e-3b31-4559-ad31-01bfb0fb2571', 'a5dd9346-9463-4973-aa63-812db202f7fb' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Kotlin',
      INTERMEDIATE: 'Independent execution of bounded Kotlin tasks',
      ADVANCED: 'Owns Kotlin components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Kotlin at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'SWIFT_FOR_IOS_MACOS_DEVELOPMENT': {
    skillCode: 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
    name: 'Swift',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '4f14488a-2e9f-410d-aa1a-0219f31fcb12',
        skillCode: 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
        capability: 'Swift language & value/reference semantics',
        observableBehaviours: [
          'Explains swift language & value/reference semantics accurately under assessment conditions',
          'Applies swift language & value/reference semantics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates swift language & value/reference semantics in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '7cc3c174-1540-445d-afe0-0ccf7ba64a28',
        skillCode: 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
        capability: 'UIKit/SwiftUI fundamentals',
        observableBehaviours: [
          'Explains uikit/swiftui fundamentals accurately under assessment conditions',
          'Applies uikit/swiftui fundamentals to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates uikit/swiftui fundamentals in timed assessment items',
        ],
        prerequisites: [ '4f14488a-2e9f-410d-aa1a-0219f31fcb12' ],
        role: 'core',
      },
      {
        competencyId: '25552444-2ebd-45b2-a331-2db27f651a6d',
        skillCode: 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
        capability: 'iOS app architecture & navigation patterns',
        observableBehaviours: [
          'Explains ios app architecture & navigation patterns accurately under assessment conditions',
          'Applies ios app architecture & navigation patterns to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates ios app architecture & navigation patterns in timed assessment items',
        ],
        prerequisites: [ '7cc3c174-1540-445d-afe0-0ccf7ba64a28' ],
        role: 'supporting',
      },
      {
        competencyId: 'ac9e0816-d68d-4093-a711-c56a4266de54',
        skillCode: 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
        capability: 'Concurrency, Combine & async/await',
        observableBehaviours: [
          'Explains concurrency, combine & async/await accurately under assessment conditions',
          'Applies concurrency, combine & async/await to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates concurrency, combine & async/await in timed assessment items',
        ],
        prerequisites: [ '25552444-2ebd-45b2-a331-2db27f651a6d' ],
        role: 'critical',
      },
      {
        competencyId: 'ca8cd5fc-62de-4aaa-a12e-af294601b74c',
        skillCode: 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
        capability: 'XCTest, Instruments & App Store readiness',
        observableBehaviours: [
          'Explains xctest, instruments & app store readiness accurately under assessment conditions',
          'Applies xctest, instruments & app store readiness to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates xctest, instruments & app store readiness in timed assessment items',
        ],
        prerequisites: [ 'ac9e0816-d68d-4093-a711-c56a4266de54' ],
        role: 'critical',
      },
      {
        competencyId: '0e773219-6973-4174-a90f-06656d31b5e2',
        skillCode: 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
        capability: 'iOS/macOS system design & performance',
        observableBehaviours: [
          'Explains ios/macos system design & performance accurately under assessment conditions',
          'Applies ios/macos system design & performance to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates ios/macos system design & performance in timed assessment items',
        ],
        prerequisites: [ 'ca8cd5fc-62de-4aaa-a12e-af294601b74c' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '4f14488a-2e9f-410d-aa1a-0219f31fcb12' ], criticalCompetencyIds: [ '4f14488a-2e9f-410d-aa1a-0219f31fcb12' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '4f14488a-2e9f-410d-aa1a-0219f31fcb12', '7cc3c174-1540-445d-afe0-0ccf7ba64a28', '25552444-2ebd-45b2-a331-2db27f651a6d' ], criticalCompetencyIds: [ '25552444-2ebd-45b2-a331-2db27f651a6d' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '4f14488a-2e9f-410d-aa1a-0219f31fcb12', '7cc3c174-1540-445d-afe0-0ccf7ba64a28', '25552444-2ebd-45b2-a331-2db27f651a6d', 'ac9e0816-d68d-4093-a711-c56a4266de54', 'ca8cd5fc-62de-4aaa-a12e-af294601b74c' ], criticalCompetencyIds: [ 'ac9e0816-d68d-4093-a711-c56a4266de54', 'ca8cd5fc-62de-4aaa-a12e-af294601b74c' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '4f14488a-2e9f-410d-aa1a-0219f31fcb12', '7cc3c174-1540-445d-afe0-0ccf7ba64a28', '25552444-2ebd-45b2-a331-2db27f651a6d', 'ac9e0816-d68d-4093-a711-c56a4266de54', 'ca8cd5fc-62de-4aaa-a12e-af294601b74c', '0e773219-6973-4174-a90f-06656d31b5e2' ], criticalCompetencyIds: [ 'ca8cd5fc-62de-4aaa-a12e-af294601b74c', '0e773219-6973-4174-a90f-06656d31b5e2' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Swift',
      INTERMEDIATE: 'Independent execution of bounded Swift tasks',
      ADVANCED: 'Owns Swift components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Swift at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'SQL_QUERY_OPTIMIZATION': {
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    name: 'SQL',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '6578d134-67b9-45f6-a4ea-34e09ed1eff2',
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        capability: 'SQL fundamentals & relational algebra',
        observableBehaviours: [
          'Explains sql fundamentals & relational algebra accurately under assessment conditions',
          'Applies sql fundamentals & relational algebra to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates sql fundamentals & relational algebra in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'b1d1b1b7-b86e-4cba-aab2-b3e0649b1d08',
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        capability: 'Joins, subqueries & window functions',
        observableBehaviours: [
          'Explains joins, subqueries & window functions accurately under assessment conditions',
          'Applies joins, subqueries & window functions to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates joins, subqueries & window functions in timed assessment items',
        ],
        prerequisites: [ '6578d134-67b9-45f6-a4ea-34e09ed1eff2' ],
        role: 'core',
      },
      {
        competencyId: '5c027d64-473c-40a6-a86a-de01e173abe0',
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        capability: 'Query plans, indexes & optimization',
        observableBehaviours: [
          'Explains query plans, indexes & optimization accurately under assessment conditions',
          'Applies query plans, indexes & optimization to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates query plans, indexes & optimization in timed assessment items',
        ],
        prerequisites: [ 'b1d1b1b7-b86e-4cba-aab2-b3e0649b1d08' ],
        role: 'supporting',
      },
      {
        competencyId: '7c5483db-6e7d-4594-a2f2-be324f580ff7',
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        capability: 'Transactions, isolation & locking',
        observableBehaviours: [
          'Explains transactions, isolation & locking accurately under assessment conditions',
          'Applies transactions, isolation & locking to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates transactions, isolation & locking in timed assessment items',
        ],
        prerequisites: [ '5c027d64-473c-40a6-a86a-de01e173abe0' ],
        role: 'critical',
      },
      {
        competencyId: 'a2f247e1-b0d4-495e-ab7f-5969d15fd3fa',
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        capability: 'Stored procedures, views & CTEs',
        observableBehaviours: [
          'Explains stored procedures, views & ctes accurately under assessment conditions',
          'Applies stored procedures, views & ctes to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates stored procedures, views & ctes in timed assessment items',
        ],
        prerequisites: [ '7c5483db-6e7d-4594-a2f2-be324f580ff7' ],
        role: 'critical',
      },
      {
        competencyId: 'a50adaaf-86ba-46fa-a0e6-fdacc998d503',
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        capability: 'Schema design for analytical workloads',
        observableBehaviours: [
          'Explains schema design for analytical workloads accurately under assessment conditions',
          'Applies schema design for analytical workloads to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates schema design for analytical workloads in timed assessment items',
        ],
        prerequisites: [ 'a2f247e1-b0d4-495e-ab7f-5969d15fd3fa' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '6578d134-67b9-45f6-a4ea-34e09ed1eff2' ], criticalCompetencyIds: [ '6578d134-67b9-45f6-a4ea-34e09ed1eff2' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '6578d134-67b9-45f6-a4ea-34e09ed1eff2', 'b1d1b1b7-b86e-4cba-aab2-b3e0649b1d08', '5c027d64-473c-40a6-a86a-de01e173abe0' ], criticalCompetencyIds: [ '5c027d64-473c-40a6-a86a-de01e173abe0' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '6578d134-67b9-45f6-a4ea-34e09ed1eff2', 'b1d1b1b7-b86e-4cba-aab2-b3e0649b1d08', '5c027d64-473c-40a6-a86a-de01e173abe0', '7c5483db-6e7d-4594-a2f2-be324f580ff7', 'a2f247e1-b0d4-495e-ab7f-5969d15fd3fa' ], criticalCompetencyIds: [ '7c5483db-6e7d-4594-a2f2-be324f580ff7', 'a2f247e1-b0d4-495e-ab7f-5969d15fd3fa' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '6578d134-67b9-45f6-a4ea-34e09ed1eff2', 'b1d1b1b7-b86e-4cba-aab2-b3e0649b1d08', '5c027d64-473c-40a6-a86a-de01e173abe0', '7c5483db-6e7d-4594-a2f2-be324f580ff7', 'a2f247e1-b0d4-495e-ab7f-5969d15fd3fa', 'a50adaaf-86ba-46fa-a0e6-fdacc998d503' ], criticalCompetencyIds: [ 'a2f247e1-b0d4-495e-ab7f-5969d15fd3fa', 'a50adaaf-86ba-46fa-a0e6-fdacc998d503' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of SQL',
      INTERMEDIATE: 'Independent execution of bounded SQL tasks',
      ADVANCED: 'Owns SQL components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for SQL at org scale',
    },
    assessmentBlueprint: 'SDE_DATABASE_SQL',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'R_FOR_STATISTICAL_COMPUTING': {
    skillCode: 'R_FOR_STATISTICAL_COMPUTING',
    name: 'R',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '9c28c23d-00c2-4bf8-aa35-8dc83d720f5e',
        skillCode: 'R_FOR_STATISTICAL_COMPUTING',
        capability: 'R syntax, vectors & data frames',
        observableBehaviours: [
          'Explains r syntax, vectors & data frames accurately under assessment conditions',
          'Applies r syntax, vectors & data frames to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates r syntax, vectors & data frames in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'a6a4090c-3d72-46bc-a41a-50c8a169cd42',
        skillCode: 'R_FOR_STATISTICAL_COMPUTING',
        capability: 'Descriptive stats & probability basics',
        observableBehaviours: [
          'Explains descriptive stats & probability basics accurately under assessment conditions',
          'Applies descriptive stats & probability basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates descriptive stats & probability basics in timed assessment items',
        ],
        prerequisites: [ '9c28c23d-00c2-4bf8-aa35-8dc83d720f5e' ],
        role: 'core',
      },
      {
        competencyId: 'a4a67df6-47ec-48eb-ae2c-a226d2ec5b7c',
        skillCode: 'R_FOR_STATISTICAL_COMPUTING',
        capability: 'Visualization with ggplot2 & reporting',
        observableBehaviours: [
          'Explains visualization with ggplot2 & reporting accurately under assessment conditions',
          'Applies visualization with ggplot2 & reporting to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates visualization with ggplot2 & reporting in timed assessment items',
        ],
        prerequisites: [ 'a6a4090c-3d72-46bc-a41a-50c8a169cd42' ],
        role: 'supporting',
      },
      {
        competencyId: 'd331c76a-0ab6-4944-a9d5-fc52a809d301',
        skillCode: 'R_FOR_STATISTICAL_COMPUTING',
        capability: 'Statistical modeling & R packages',
        observableBehaviours: [
          'Explains statistical modeling & r packages accurately under assessment conditions',
          'Applies statistical modeling & r packages to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates statistical modeling & r packages in timed assessment items',
        ],
        prerequisites: [ 'a4a67df6-47ec-48eb-ae2c-a226d2ec5b7c' ],
        role: 'critical',
      },
      {
        competencyId: '72a26ba6-7c55-49d8-a33b-782bbec401fe',
        skillCode: 'R_FOR_STATISTICAL_COMPUTING',
        capability: 'Reproducible research & R Markdown',
        observableBehaviours: [
          'Explains reproducible research & r markdown accurately under assessment conditions',
          'Applies reproducible research & r markdown to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates reproducible research & r markdown in timed assessment items',
        ],
        prerequisites: [ 'd331c76a-0ab6-4944-a9d5-fc52a809d301' ],
        role: 'critical',
      },
      {
        competencyId: '9bb640be-ae86-4883-ac63-4ba5da9761e9',
        skillCode: 'R_FOR_STATISTICAL_COMPUTING',
        capability: 'Analysis pipeline design & validation',
        observableBehaviours: [
          'Explains analysis pipeline design & validation accurately under assessment conditions',
          'Applies analysis pipeline design & validation to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates analysis pipeline design & validation in timed assessment items',
        ],
        prerequisites: [ '72a26ba6-7c55-49d8-a33b-782bbec401fe' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '9c28c23d-00c2-4bf8-aa35-8dc83d720f5e' ], criticalCompetencyIds: [ '9c28c23d-00c2-4bf8-aa35-8dc83d720f5e' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '9c28c23d-00c2-4bf8-aa35-8dc83d720f5e', 'a6a4090c-3d72-46bc-a41a-50c8a169cd42', 'a4a67df6-47ec-48eb-ae2c-a226d2ec5b7c' ], criticalCompetencyIds: [ 'a4a67df6-47ec-48eb-ae2c-a226d2ec5b7c' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '9c28c23d-00c2-4bf8-aa35-8dc83d720f5e', 'a6a4090c-3d72-46bc-a41a-50c8a169cd42', 'a4a67df6-47ec-48eb-ae2c-a226d2ec5b7c', 'd331c76a-0ab6-4944-a9d5-fc52a809d301', '72a26ba6-7c55-49d8-a33b-782bbec401fe' ], criticalCompetencyIds: [ 'd331c76a-0ab6-4944-a9d5-fc52a809d301', '72a26ba6-7c55-49d8-a33b-782bbec401fe' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '9c28c23d-00c2-4bf8-aa35-8dc83d720f5e', 'a6a4090c-3d72-46bc-a41a-50c8a169cd42', 'a4a67df6-47ec-48eb-ae2c-a226d2ec5b7c', 'd331c76a-0ab6-4944-a9d5-fc52a809d301', '72a26ba6-7c55-49d8-a33b-782bbec401fe', '9bb640be-ae86-4883-ac63-4ba5da9761e9' ], criticalCompetencyIds: [ '72a26ba6-7c55-49d8-a33b-782bbec401fe', '9bb640be-ae86-4883-ac63-4ba5da9761e9' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of R',
      INTERMEDIATE: 'Independent execution of bounded R tasks',
      ADVANCED: 'Owns R components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for R at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS': {
    skillCode: 'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS',
    name: 'Scala',
    domain: 'SOFTWARE_IT',
    category: 'Programming Languages',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'e27f6991-0d5d-4a9a-a0fb-a761dd5c60eb',
        skillCode: 'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS',
        capability: 'Scala syntax, immutability & FP basics',
        observableBehaviours: [
          'Explains scala syntax, immutability & fp basics accurately under assessment conditions',
          'Applies scala syntax, immutability & fp basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates scala syntax, immutability & fp basics in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'c47314dd-e908-4289-a4ae-4b74a6797f2b',
        skillCode: 'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS',
        capability: 'Collections, implicits & type classes',
        observableBehaviours: [
          'Explains collections, implicits & type classes accurately under assessment conditions',
          'Applies collections, implicits & type classes to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates collections, implicits & type classes in timed assessment items',
        ],
        prerequisites: [ 'e27f6991-0d5d-4a9a-a0fb-a761dd5c60eb' ],
        role: 'core',
      },
      {
        competencyId: '025ea8ac-1c42-4d86-a8f9-664b1fcdec9e',
        skillCode: 'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS',
        capability: 'Spark/Akka distributed programming',
        observableBehaviours: [
          'Explains spark/akka distributed programming accurately under assessment conditions',
          'Applies spark/akka distributed programming to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates spark/akka distributed programming in timed assessment items',
        ],
        prerequisites: [ 'c47314dd-e908-4289-a4ae-4b74a6797f2b' ],
        role: 'supporting',
      },
      {
        competencyId: 'db78d1b0-2db2-4faf-a0fb-3f04b4cf5a6f',
        skillCode: 'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS',
        capability: 'Advanced type system & pattern matching',
        observableBehaviours: [
          'Explains advanced type system & pattern matching accurately under assessment conditions',
          'Applies advanced type system & pattern matching to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates advanced type system & pattern matching in timed assessment items',
        ],
        prerequisites: [ '025ea8ac-1c42-4d86-a8f9-664b1fcdec9e' ],
        role: 'critical',
      },
      {
        competencyId: 'c57d90eb-e7bc-4fd1-a606-93b7453415c9',
        skillCode: 'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS',
        capability: 'Testing with ScalaTest & sbt workflows',
        observableBehaviours: [
          'Explains testing with scalatest & sbt workflows accurately under assessment conditions',
          'Applies testing with scalatest & sbt workflows to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates testing with scalatest & sbt workflows in timed assessment items',
        ],
        prerequisites: [ 'db78d1b0-2db2-4faf-a0fb-3f04b4cf5a6f' ],
        role: 'critical',
      },
      {
        competencyId: 'e927bd50-6051-4e0b-a945-395921333e74',
        skillCode: 'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS',
        capability: 'Distributed data system architecture',
        observableBehaviours: [
          'Explains distributed data system architecture accurately under assessment conditions',
          'Applies distributed data system architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates distributed data system architecture in timed assessment items',
        ],
        prerequisites: [ 'c57d90eb-e7bc-4fd1-a606-93b7453415c9' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'e27f6991-0d5d-4a9a-a0fb-a761dd5c60eb' ], criticalCompetencyIds: [ 'e27f6991-0d5d-4a9a-a0fb-a761dd5c60eb' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'e27f6991-0d5d-4a9a-a0fb-a761dd5c60eb', 'c47314dd-e908-4289-a4ae-4b74a6797f2b', '025ea8ac-1c42-4d86-a8f9-664b1fcdec9e' ], criticalCompetencyIds: [ '025ea8ac-1c42-4d86-a8f9-664b1fcdec9e' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'e27f6991-0d5d-4a9a-a0fb-a761dd5c60eb', 'c47314dd-e908-4289-a4ae-4b74a6797f2b', '025ea8ac-1c42-4d86-a8f9-664b1fcdec9e', 'db78d1b0-2db2-4faf-a0fb-3f04b4cf5a6f', 'c57d90eb-e7bc-4fd1-a606-93b7453415c9' ], criticalCompetencyIds: [ 'db78d1b0-2db2-4faf-a0fb-3f04b4cf5a6f', 'c57d90eb-e7bc-4fd1-a606-93b7453415c9' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'e27f6991-0d5d-4a9a-a0fb-a761dd5c60eb', 'c47314dd-e908-4289-a4ae-4b74a6797f2b', '025ea8ac-1c42-4d86-a8f9-664b1fcdec9e', 'db78d1b0-2db2-4faf-a0fb-3f04b4cf5a6f', 'c57d90eb-e7bc-4fd1-a606-93b7453415c9', 'e927bd50-6051-4e0b-a945-395921333e74' ], criticalCompetencyIds: [ 'c57d90eb-e7bc-4fd1-a606-93b7453415c9', 'e927bd50-6051-4e0b-a945-395921333e74' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Scala',
      INTERMEDIATE: 'Independent execution of bounded Scala tasks',
      ADVANCED: 'Owns Scala components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Scala at org scale',
    },
    assessmentBlueprint: 'SDE_DSA',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'RESTFUL_GRAPHQL_API_DESIGN': {
    skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
    name: 'API Design',
    domain: 'SOFTWARE_IT',
    category: 'Software Architecture & System Design',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'fb63f0c3-4422-437b-a426-c784deaef0b2',
        skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
        capability: 'HTTP/REST fundamentals & resource modeling',
        observableBehaviours: [
          'Explains http/rest fundamentals & resource modeling accurately under assessment conditions',
          'Applies http/rest fundamentals & resource modeling to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates http/rest fundamentals & resource modeling in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'bf0de8e5-8c77-4279-ae95-78c122120b53',
        skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
        capability: 'API versioning, pagination & HATEOAS',
        observableBehaviours: [
          'Explains api versioning, pagination & hateoas accurately under assessment conditions',
          'Applies api versioning, pagination & hateoas to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates api versioning, pagination & hateoas in timed assessment items',
        ],
        prerequisites: [ 'fb63f0c3-4422-437b-a426-c784deaef0b2' ],
        role: 'core',
      },
      {
        competencyId: '474ddc4f-b186-45f8-a428-8bee5cbd20e1',
        skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
        capability: 'GraphQL schema design & resolvers',
        observableBehaviours: [
          'Explains graphql schema design & resolvers accurately under assessment conditions',
          'Applies graphql schema design & resolvers to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates graphql schema design & resolvers in timed assessment items',
        ],
        prerequisites: [ 'bf0de8e5-8c77-4279-ae95-78c122120b53' ],
        role: 'supporting',
      },
      {
        competencyId: 'fa7f9bba-3acf-4709-aa6c-4beb6f500494',
        skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
        capability: 'Auth, rate limiting & API security',
        observableBehaviours: [
          'Explains auth, rate limiting & api security accurately under assessment conditions',
          'Applies auth, rate limiting & api security to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates auth, rate limiting & api security in timed assessment items',
        ],
        prerequisites: [ '474ddc4f-b186-45f8-a428-8bee5cbd20e1' ],
        role: 'critical',
      },
      {
        competencyId: '3565d9b9-545a-4ef0-a091-d9be39fd7824',
        skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
        capability: 'API testing, documentation & SDK design',
        observableBehaviours: [
          'Explains api testing, documentation & sdk design accurately under assessment conditions',
          'Applies api testing, documentation & sdk design to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates api testing, documentation & sdk design in timed assessment items',
        ],
        prerequisites: [ 'fa7f9bba-3acf-4709-aa6c-4beb6f500494' ],
        role: 'critical',
      },
      {
        competencyId: '1e9b00db-b684-4832-a51d-c63b6af6c427',
        skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
        capability: 'Public API platform architecture',
        observableBehaviours: [
          'Explains public api platform architecture accurately under assessment conditions',
          'Applies public api platform architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates public api platform architecture in timed assessment items',
        ],
        prerequisites: [ '3565d9b9-545a-4ef0-a091-d9be39fd7824' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'fb63f0c3-4422-437b-a426-c784deaef0b2' ], criticalCompetencyIds: [ 'fb63f0c3-4422-437b-a426-c784deaef0b2' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'fb63f0c3-4422-437b-a426-c784deaef0b2', 'bf0de8e5-8c77-4279-ae95-78c122120b53', '474ddc4f-b186-45f8-a428-8bee5cbd20e1' ], criticalCompetencyIds: [ '474ddc4f-b186-45f8-a428-8bee5cbd20e1' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'fb63f0c3-4422-437b-a426-c784deaef0b2', 'bf0de8e5-8c77-4279-ae95-78c122120b53', '474ddc4f-b186-45f8-a428-8bee5cbd20e1', 'fa7f9bba-3acf-4709-aa6c-4beb6f500494', '3565d9b9-545a-4ef0-a091-d9be39fd7824' ], criticalCompetencyIds: [ 'fa7f9bba-3acf-4709-aa6c-4beb6f500494', '3565d9b9-545a-4ef0-a091-d9be39fd7824' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'fb63f0c3-4422-437b-a426-c784deaef0b2', 'bf0de8e5-8c77-4279-ae95-78c122120b53', '474ddc4f-b186-45f8-a428-8bee5cbd20e1', 'fa7f9bba-3acf-4709-aa6c-4beb6f500494', '3565d9b9-545a-4ef0-a091-d9be39fd7824', '1e9b00db-b684-4832-a51d-c63b6af6c427' ], criticalCompetencyIds: [ '3565d9b9-545a-4ef0-a091-d9be39fd7824', '1e9b00db-b684-4832-a51d-c63b6af6c427' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of API Design',
      INTERMEDIATE: 'Independent execution of bounded API Design tasks',
      ADVANCED: 'Owns API Design components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for API Design at org scale',
    },
    assessmentBlueprint: 'SDE_SYSTEM_DESIGN',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION': {
    skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    name: 'Algorithms & Performance',
    domain: 'SOFTWARE_IT',
    category: 'Software Architecture & System Design',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'f25545a5-f30a-47f7-abff-60a052eaeea2',
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        capability: 'Big-O analysis & algorithm fundamentals',
        observableBehaviours: [
          'Explains big-o analysis & algorithm fundamentals accurately under assessment conditions',
          'Applies big-o analysis & algorithm fundamentals to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates big-o analysis & algorithm fundamentals in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '5fbbf941-e7f0-446c-a5fe-0b3fc40a7f21',
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        capability: 'Arrays, hashing & two-pointer techniques',
        observableBehaviours: [
          'Explains arrays, hashing & two-pointer techniques accurately under assessment conditions',
          'Applies arrays, hashing & two-pointer techniques to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates arrays, hashing & two-pointer techniques in timed assessment items',
        ],
        prerequisites: [ 'f25545a5-f30a-47f7-abff-60a052eaeea2' ],
        role: 'core',
      },
      {
        competencyId: '099b1472-62d1-4258-a452-b4ad122f09b1',
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        capability: 'Trees, graphs & traversal algorithms',
        observableBehaviours: [
          'Explains trees, graphs & traversal algorithms accurately under assessment conditions',
          'Applies trees, graphs & traversal algorithms to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates trees, graphs & traversal algorithms in timed assessment items',
        ],
        prerequisites: [ '5fbbf941-e7f0-446c-a5fe-0b3fc40a7f21' ],
        role: 'supporting',
      },
      {
        competencyId: 'feef8103-9da5-45c9-a8ab-f88801ccc467',
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        capability: 'Dynamic programming & greedy methods',
        observableBehaviours: [
          'Explains dynamic programming & greedy methods accurately under assessment conditions',
          'Applies dynamic programming & greedy methods to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates dynamic programming & greedy methods in timed assessment items',
        ],
        prerequisites: [ '099b1472-62d1-4258-a452-b4ad122f09b1' ],
        role: 'critical',
      },
      {
        competencyId: '489be34f-7c5e-4447-a80b-21d508d5d873',
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        capability: 'Performance profiling & optimization',
        observableBehaviours: [
          'Explains performance profiling & optimization accurately under assessment conditions',
          'Applies performance profiling & optimization to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates performance profiling & optimization in timed assessment items',
        ],
        prerequisites: [ 'feef8103-9da5-45c9-a8ab-f88801ccc467' ],
        role: 'critical',
      },
      {
        competencyId: '7e9bb7c3-659a-4981-ad5a-c6739e80343a',
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        capability: 'Algorithm selection for production systems',
        observableBehaviours: [
          'Explains algorithm selection for production systems accurately under assessment conditions',
          'Applies algorithm selection for production systems to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates algorithm selection for production systems in timed assessment items',
        ],
        prerequisites: [ '489be34f-7c5e-4447-a80b-21d508d5d873' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'f25545a5-f30a-47f7-abff-60a052eaeea2' ], criticalCompetencyIds: [ 'f25545a5-f30a-47f7-abff-60a052eaeea2' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'f25545a5-f30a-47f7-abff-60a052eaeea2', '5fbbf941-e7f0-446c-a5fe-0b3fc40a7f21', '099b1472-62d1-4258-a452-b4ad122f09b1' ], criticalCompetencyIds: [ '099b1472-62d1-4258-a452-b4ad122f09b1' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'f25545a5-f30a-47f7-abff-60a052eaeea2', '5fbbf941-e7f0-446c-a5fe-0b3fc40a7f21', '099b1472-62d1-4258-a452-b4ad122f09b1', 'feef8103-9da5-45c9-a8ab-f88801ccc467', '489be34f-7c5e-4447-a80b-21d508d5d873' ], criticalCompetencyIds: [ 'feef8103-9da5-45c9-a8ab-f88801ccc467', '489be34f-7c5e-4447-a80b-21d508d5d873' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'f25545a5-f30a-47f7-abff-60a052eaeea2', '5fbbf941-e7f0-446c-a5fe-0b3fc40a7f21', '099b1472-62d1-4258-a452-b4ad122f09b1', 'feef8103-9da5-45c9-a8ab-f88801ccc467', '489be34f-7c5e-4447-a80b-21d508d5d873', '7e9bb7c3-659a-4981-ad5a-c6739e80343a' ], criticalCompetencyIds: [ '489be34f-7c5e-4447-a80b-21d508d5d873', '7e9bb7c3-659a-4981-ad5a-c6739e80343a' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Algorithms & Performance',
      INTERMEDIATE: 'Independent execution of bounded Algorithms & Performance tasks',
      ADVANCED: 'Owns Algorithms & Performance components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Algorithms & Performance at org scale',
    },
    assessmentBlueprint: 'SDE_DSA',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE': {
    skillCode: 'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE',
    name: 'AWS',
    domain: 'SOFTWARE_IT',
    category: 'Cloud Platforms',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '55c76148-5681-43f5-a10a-93ad5ea586de',
        skillCode: 'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE',
        capability: 'AWS core services & Well-Architected pillars',
        observableBehaviours: [
          'Explains aws core services & well-architected pillars accurately under assessment conditions',
          'Applies aws core services & well-architected pillars to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates aws core services & well-architected pillars in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '664456d4-b6f5-44b6-a52a-f9d8d21d3e41',
        skillCode: 'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE',
        capability: 'Compute (EC2, Lambda) & networking (VPC)',
        observableBehaviours: [
          'Explains compute (ec2, lambda) & networking (vpc) accurately under assessment conditions',
          'Applies compute (ec2, lambda) & networking (vpc) to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates compute (ec2, lambda) & networking (vpc) in timed assessment items',
        ],
        prerequisites: [ '55c76148-5681-43f5-a10a-93ad5ea586de' ],
        role: 'core',
      },
      {
        competencyId: 'c1aa820c-2274-44e4-aa40-8b65fa87032b',
        skillCode: 'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE',
        capability: 'Storage (S3, EBS) & database services (RDS/DynamoDB)',
        observableBehaviours: [
          'Explains storage (s3, ebs) & database services (rds/dynamodb) accurately under assessment conditions',
          'Applies storage (s3, ebs) & database services (rds/dynamodb) to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates storage (s3, ebs) & database services (rds/dynamodb) in timed assessment items',
        ],
        prerequisites: [ '664456d4-b6f5-44b6-a52a-f9d8d21d3e41' ],
        role: 'supporting',
      },
      {
        competencyId: 'bb1c8eb7-b59f-45c9-a81b-5be5a75eb75e',
        skillCode: 'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE',
        capability: 'IAM, security groups & secrets management',
        observableBehaviours: [
          'Explains iam, security groups & secrets management accurately under assessment conditions',
          'Applies iam, security groups & secrets management to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates iam, security groups & secrets management in timed assessment items',
        ],
        prerequisites: [ 'c1aa820c-2274-44e4-aa40-8b65fa87032b' ],
        role: 'critical',
      },
      {
        competencyId: '63d2f1c9-2982-4a07-a5b6-f16ef0e97a0c',
        skillCode: 'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE',
        capability: 'CloudWatch, cost optimization & automation',
        observableBehaviours: [
          'Explains cloudwatch, cost optimization & automation accurately under assessment conditions',
          'Applies cloudwatch, cost optimization & automation to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates cloudwatch, cost optimization & automation in timed assessment items',
        ],
        prerequisites: [ 'bb1c8eb7-b59f-45c9-a81b-5be5a75eb75e' ],
        role: 'critical',
      },
      {
        competencyId: '36330b42-a81f-4f02-ac02-c024bc63d3bd',
        skillCode: 'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE',
        capability: 'Production AWS landing zone architecture',
        observableBehaviours: [
          'Explains production aws landing zone architecture accurately under assessment conditions',
          'Applies production aws landing zone architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates production aws landing zone architecture in timed assessment items',
        ],
        prerequisites: [ '63d2f1c9-2982-4a07-a5b6-f16ef0e97a0c' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '55c76148-5681-43f5-a10a-93ad5ea586de' ], criticalCompetencyIds: [ '55c76148-5681-43f5-a10a-93ad5ea586de' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '55c76148-5681-43f5-a10a-93ad5ea586de', '664456d4-b6f5-44b6-a52a-f9d8d21d3e41', 'c1aa820c-2274-44e4-aa40-8b65fa87032b' ], criticalCompetencyIds: [ 'c1aa820c-2274-44e4-aa40-8b65fa87032b' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '55c76148-5681-43f5-a10a-93ad5ea586de', '664456d4-b6f5-44b6-a52a-f9d8d21d3e41', 'c1aa820c-2274-44e4-aa40-8b65fa87032b', 'bb1c8eb7-b59f-45c9-a81b-5be5a75eb75e', '63d2f1c9-2982-4a07-a5b6-f16ef0e97a0c' ], criticalCompetencyIds: [ 'bb1c8eb7-b59f-45c9-a81b-5be5a75eb75e', '63d2f1c9-2982-4a07-a5b6-f16ef0e97a0c' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '55c76148-5681-43f5-a10a-93ad5ea586de', '664456d4-b6f5-44b6-a52a-f9d8d21d3e41', 'c1aa820c-2274-44e4-aa40-8b65fa87032b', 'bb1c8eb7-b59f-45c9-a81b-5be5a75eb75e', '63d2f1c9-2982-4a07-a5b6-f16ef0e97a0c', '36330b42-a81f-4f02-ac02-c024bc63d3bd' ], criticalCompetencyIds: [ '63d2f1c9-2982-4a07-a5b6-f16ef0e97a0c', '36330b42-a81f-4f02-ac02-c024bc63d3bd' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of AWS',
      INTERMEDIATE: 'Independent execution of bounded AWS tasks',
      ADVANCED: 'Owns AWS components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for AWS at org scale',
    },
    assessmentBlueprint: 'SDE_DEPLOYMENT_CICD',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'MICROSOFT_AZURE_CLOUD_ENGINEERING': {
    skillCode: 'MICROSOFT_AZURE_CLOUD_ENGINEERING',
    name: 'Azure',
    domain: 'SOFTWARE_IT',
    category: 'Cloud Platforms',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '2c93f40f-941b-44de-aa6a-78a32722e487',
        skillCode: 'MICROSOFT_AZURE_CLOUD_ENGINEERING',
        capability: 'Azure fundamentals & resource organization',
        observableBehaviours: [
          'Explains azure fundamentals & resource organization accurately under assessment conditions',
          'Applies azure fundamentals & resource organization to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates azure fundamentals & resource organization in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '73f3d6ae-91b3-4e0c-a97d-5bab77191cb9',
        skillCode: 'MICROSOFT_AZURE_CLOUD_ENGINEERING',
        capability: 'App Service, Functions & container apps',
        observableBehaviours: [
          'Explains app service, functions & container apps accurately under assessment conditions',
          'Applies app service, functions & container apps to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates app service, functions & container apps in timed assessment items',
        ],
        prerequisites: [ '2c93f40f-941b-44de-aa6a-78a32722e487' ],
        role: 'core',
      },
      {
        competencyId: 'da8d3beb-e9f3-4b66-ae26-dd7b9e4e00cd',
        skillCode: 'MICROSOFT_AZURE_CLOUD_ENGINEERING',
        capability: 'Azure SQL, Cosmos DB & storage accounts',
        observableBehaviours: [
          'Explains azure sql, cosmos db & storage accounts accurately under assessment conditions',
          'Applies azure sql, cosmos db & storage accounts to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates azure sql, cosmos db & storage accounts in timed assessment items',
        ],
        prerequisites: [ '73f3d6ae-91b3-4e0c-a97d-5bab77191cb9' ],
        role: 'supporting',
      },
      {
        competencyId: '68f5370c-b7de-4e73-a528-26a14f9ea0de',
        skillCode: 'MICROSOFT_AZURE_CLOUD_ENGINEERING',
        capability: 'Entra ID, RBAC & Key Vault',
        observableBehaviours: [
          'Explains entra id, rbac & key vault accurately under assessment conditions',
          'Applies entra id, rbac & key vault to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates entra id, rbac & key vault in timed assessment items',
        ],
        prerequisites: [ 'da8d3beb-e9f3-4b66-ae26-dd7b9e4e00cd' ],
        role: 'critical',
      },
      {
        competencyId: 'e24a1d07-982e-4005-a7f3-f27db80ef1b4',
        skillCode: 'MICROSOFT_AZURE_CLOUD_ENGINEERING',
        capability: 'Monitor, ARM/Bicep & cost management',
        observableBehaviours: [
          'Explains monitor, arm/bicep & cost management accurately under assessment conditions',
          'Applies monitor, arm/bicep & cost management to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates monitor, arm/bicep & cost management in timed assessment items',
        ],
        prerequisites: [ '68f5370c-b7de-4e73-a528-26a14f9ea0de' ],
        role: 'critical',
      },
      {
        competencyId: '0568590a-f17e-4dba-acdb-c16c47b72d63',
        skillCode: 'MICROSOFT_AZURE_CLOUD_ENGINEERING',
        capability: 'Enterprise Azure architecture patterns',
        observableBehaviours: [
          'Explains enterprise azure architecture patterns accurately under assessment conditions',
          'Applies enterprise azure architecture patterns to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates enterprise azure architecture patterns in timed assessment items',
        ],
        prerequisites: [ 'e24a1d07-982e-4005-a7f3-f27db80ef1b4' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '2c93f40f-941b-44de-aa6a-78a32722e487' ], criticalCompetencyIds: [ '2c93f40f-941b-44de-aa6a-78a32722e487' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '2c93f40f-941b-44de-aa6a-78a32722e487', '73f3d6ae-91b3-4e0c-a97d-5bab77191cb9', 'da8d3beb-e9f3-4b66-ae26-dd7b9e4e00cd' ], criticalCompetencyIds: [ 'da8d3beb-e9f3-4b66-ae26-dd7b9e4e00cd' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '2c93f40f-941b-44de-aa6a-78a32722e487', '73f3d6ae-91b3-4e0c-a97d-5bab77191cb9', 'da8d3beb-e9f3-4b66-ae26-dd7b9e4e00cd', '68f5370c-b7de-4e73-a528-26a14f9ea0de', 'e24a1d07-982e-4005-a7f3-f27db80ef1b4' ], criticalCompetencyIds: [ '68f5370c-b7de-4e73-a528-26a14f9ea0de', 'e24a1d07-982e-4005-a7f3-f27db80ef1b4' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '2c93f40f-941b-44de-aa6a-78a32722e487', '73f3d6ae-91b3-4e0c-a97d-5bab77191cb9', 'da8d3beb-e9f3-4b66-ae26-dd7b9e4e00cd', '68f5370c-b7de-4e73-a528-26a14f9ea0de', 'e24a1d07-982e-4005-a7f3-f27db80ef1b4', '0568590a-f17e-4dba-acdb-c16c47b72d63' ], criticalCompetencyIds: [ 'e24a1d07-982e-4005-a7f3-f27db80ef1b4', '0568590a-f17e-4dba-acdb-c16c47b72d63' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Azure',
      INTERMEDIATE: 'Independent execution of bounded Azure tasks',
      ADVANCED: 'Owns Azure components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Azure at org scale',
    },
    assessmentBlueprint: 'SDE_DEPLOYMENT_CICD',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING': {
    skillCode: 'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING',
    name: 'Google Cloud (GCP)',
    domain: 'SOFTWARE_IT',
    category: 'Cloud Platforms',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '564e57ab-7aa7-44b5-a82b-a50165ca3a8e',
        skillCode: 'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING',
        capability: 'GCP core services & project hierarchy',
        observableBehaviours: [
          'Explains gcp core services & project hierarchy accurately under assessment conditions',
          'Applies gcp core services & project hierarchy to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates gcp core services & project hierarchy in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'ab8c33e1-6631-4c51-ae70-229d916dce95',
        skillCode: 'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING',
        capability: 'GCE, Cloud Run & GKE workloads',
        observableBehaviours: [
          'Explains gce, cloud run & gke workloads accurately under assessment conditions',
          'Applies gce, cloud run & gke workloads to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates gce, cloud run & gke workloads in timed assessment items',
        ],
        prerequisites: [ '564e57ab-7aa7-44b5-a82b-a50165ca3a8e' ],
        role: 'core',
      },
      {
        competencyId: '934624d8-e287-4dc6-a91e-e1bde4d63772',
        skillCode: 'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING',
        capability: 'Cloud Storage, BigQuery & Spanner',
        observableBehaviours: [
          'Explains cloud storage, bigquery & spanner accurately under assessment conditions',
          'Applies cloud storage, bigquery & spanner to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates cloud storage, bigquery & spanner in timed assessment items',
        ],
        prerequisites: [ 'ab8c33e1-6631-4c51-ae70-229d916dce95' ],
        role: 'supporting',
      },
      {
        competencyId: '6f22da75-930f-417c-ac65-775308a532b4',
        skillCode: 'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING',
        capability: 'IAM, VPC & Cloud Armor security',
        observableBehaviours: [
          'Explains iam, vpc & cloud armor security accurately under assessment conditions',
          'Applies iam, vpc & cloud armor security to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates iam, vpc & cloud armor security in timed assessment items',
        ],
        prerequisites: [ '934624d8-e287-4dc6-a91e-e1bde4d63772' ],
        role: 'critical',
      },
      {
        competencyId: 'b5ec7473-f6a9-4500-a23b-596e72a08df0',
        skillCode: 'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING',
        capability: 'Cloud Monitoring, Terraform & FinOps',
        observableBehaviours: [
          'Explains cloud monitoring, terraform & finops accurately under assessment conditions',
          'Applies cloud monitoring, terraform & finops to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates cloud monitoring, terraform & finops in timed assessment items',
        ],
        prerequisites: [ '6f22da75-930f-417c-ac65-775308a532b4' ],
        role: 'critical',
      },
      {
        competencyId: 'e24a0bff-3ebe-4f22-a4ee-fec6468ccc85',
        skillCode: 'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING',
        capability: 'GCP multi-region architecture design',
        observableBehaviours: [
          'Explains gcp multi-region architecture design accurately under assessment conditions',
          'Applies gcp multi-region architecture design to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates gcp multi-region architecture design in timed assessment items',
        ],
        prerequisites: [ 'b5ec7473-f6a9-4500-a23b-596e72a08df0' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '564e57ab-7aa7-44b5-a82b-a50165ca3a8e' ], criticalCompetencyIds: [ '564e57ab-7aa7-44b5-a82b-a50165ca3a8e' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '564e57ab-7aa7-44b5-a82b-a50165ca3a8e', 'ab8c33e1-6631-4c51-ae70-229d916dce95', '934624d8-e287-4dc6-a91e-e1bde4d63772' ], criticalCompetencyIds: [ '934624d8-e287-4dc6-a91e-e1bde4d63772' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '564e57ab-7aa7-44b5-a82b-a50165ca3a8e', 'ab8c33e1-6631-4c51-ae70-229d916dce95', '934624d8-e287-4dc6-a91e-e1bde4d63772', '6f22da75-930f-417c-ac65-775308a532b4', 'b5ec7473-f6a9-4500-a23b-596e72a08df0' ], criticalCompetencyIds: [ '6f22da75-930f-417c-ac65-775308a532b4', 'b5ec7473-f6a9-4500-a23b-596e72a08df0' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '564e57ab-7aa7-44b5-a82b-a50165ca3a8e', 'ab8c33e1-6631-4c51-ae70-229d916dce95', '934624d8-e287-4dc6-a91e-e1bde4d63772', '6f22da75-930f-417c-ac65-775308a532b4', 'b5ec7473-f6a9-4500-a23b-596e72a08df0', 'e24a0bff-3ebe-4f22-a4ee-fec6468ccc85' ], criticalCompetencyIds: [ 'b5ec7473-f6a9-4500-a23b-596e72a08df0', 'e24a0bff-3ebe-4f22-a4ee-fec6468ccc85' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Google Cloud (GCP)',
      INTERMEDIATE: 'Independent execution of bounded Google Cloud (GCP) tasks',
      ADVANCED: 'Owns Google Cloud (GCP) components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Google Cloud (GCP) at org scale',
    },
    assessmentBlueprint: 'SDE_DEPLOYMENT_CICD',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'CI_CD_PIPELINE_ENGINEERING': {
    skillCode: 'CI_CD_PIPELINE_ENGINEERING',
    name: 'CI/CD',
    domain: 'SOFTWARE_IT',
    category: 'DevOps & Infrastructure',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '24787c65-1248-41ad-a010-f5a2fd15e489',
        skillCode: 'CI_CD_PIPELINE_ENGINEERING',
        capability: 'CI/CD fundamentals & pipeline design',
        observableBehaviours: [
          'Explains ci/cd fundamentals & pipeline design accurately under assessment conditions',
          'Applies ci/cd fundamentals & pipeline design to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates ci/cd fundamentals & pipeline design in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'b6e1cc6b-0c0c-486f-a3c8-eb37bdee2bb9',
        skillCode: 'CI_CD_PIPELINE_ENGINEERING',
        capability: 'Build, test & artifact promotion stages',
        observableBehaviours: [
          'Explains build, test & artifact promotion stages accurately under assessment conditions',
          'Applies build, test & artifact promotion stages to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates build, test & artifact promotion stages in timed assessment items',
        ],
        prerequisites: [ '24787c65-1248-41ad-a010-f5a2fd15e489' ],
        role: 'core',
      },
      {
        competencyId: '561c4f4f-3d74-4468-aae0-bca2f28b6b27',
        skillCode: 'CI_CD_PIPELINE_ENGINEERING',
        capability: 'Deployment strategies & environment gates',
        observableBehaviours: [
          'Explains deployment strategies & environment gates accurately under assessment conditions',
          'Applies deployment strategies & environment gates to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates deployment strategies & environment gates in timed assessment items',
        ],
        prerequisites: [ 'b6e1cc6b-0c0c-486f-a3c8-eb37bdee2bb9' ],
        role: 'supporting',
      },
      {
        competencyId: '06361992-cf4b-4723-ada0-ea8e0fa7662a',
        skillCode: 'CI_CD_PIPELINE_ENGINEERING',
        capability: 'Pipeline security & supply chain hardening',
        observableBehaviours: [
          'Explains pipeline security & supply chain hardening accurately under assessment conditions',
          'Applies pipeline security & supply chain hardening to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates pipeline security & supply chain hardening in timed assessment items',
        ],
        prerequisites: [ '561c4f4f-3d74-4468-aae0-bca2f28b6b27' ],
        role: 'critical',
      },
      {
        competencyId: 'fc93f670-f37a-4ee5-ab9e-45a7ead6e3c6',
        skillCode: 'CI_CD_PIPELINE_ENGINEERING',
        capability: 'Observability, rollback & release metrics',
        observableBehaviours: [
          'Explains observability, rollback & release metrics accurately under assessment conditions',
          'Applies observability, rollback & release metrics to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates observability, rollback & release metrics in timed assessment items',
        ],
        prerequisites: [ '06361992-cf4b-4723-ada0-ea8e0fa7662a' ],
        role: 'critical',
      },
      {
        competencyId: '4d099e04-e6b6-47c9-a181-9adc981fd1be',
        skillCode: 'CI_CD_PIPELINE_ENGINEERING',
        capability: 'Enterprise delivery pipeline architecture',
        observableBehaviours: [
          'Explains enterprise delivery pipeline architecture accurately under assessment conditions',
          'Applies enterprise delivery pipeline architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates enterprise delivery pipeline architecture in timed assessment items',
        ],
        prerequisites: [ 'fc93f670-f37a-4ee5-ab9e-45a7ead6e3c6' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '24787c65-1248-41ad-a010-f5a2fd15e489' ], criticalCompetencyIds: [ '24787c65-1248-41ad-a010-f5a2fd15e489' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '24787c65-1248-41ad-a010-f5a2fd15e489', 'b6e1cc6b-0c0c-486f-a3c8-eb37bdee2bb9', '561c4f4f-3d74-4468-aae0-bca2f28b6b27' ], criticalCompetencyIds: [ '561c4f4f-3d74-4468-aae0-bca2f28b6b27' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '24787c65-1248-41ad-a010-f5a2fd15e489', 'b6e1cc6b-0c0c-486f-a3c8-eb37bdee2bb9', '561c4f4f-3d74-4468-aae0-bca2f28b6b27', '06361992-cf4b-4723-ada0-ea8e0fa7662a', 'fc93f670-f37a-4ee5-ab9e-45a7ead6e3c6' ], criticalCompetencyIds: [ '06361992-cf4b-4723-ada0-ea8e0fa7662a', 'fc93f670-f37a-4ee5-ab9e-45a7ead6e3c6' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '24787c65-1248-41ad-a010-f5a2fd15e489', 'b6e1cc6b-0c0c-486f-a3c8-eb37bdee2bb9', '561c4f4f-3d74-4468-aae0-bca2f28b6b27', '06361992-cf4b-4723-ada0-ea8e0fa7662a', 'fc93f670-f37a-4ee5-ab9e-45a7ead6e3c6', '4d099e04-e6b6-47c9-a181-9adc981fd1be' ], criticalCompetencyIds: [ 'fc93f670-f37a-4ee5-ab9e-45a7ead6e3c6', '4d099e04-e6b6-47c9-a181-9adc981fd1be' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of CI/CD',
      INTERMEDIATE: 'Independent execution of bounded CI/CD tasks',
      ADVANCED: 'Owns CI/CD components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for CI/CD at org scale',
    },
    assessmentBlueprint: 'SDE_DEPLOYMENT_CICD',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'CONTAINERIZATION_ORCHESTRATION': {
    skillCode: 'CONTAINERIZATION_ORCHESTRATION',
    name: 'Containers & Kubernetes',
    domain: 'SOFTWARE_IT',
    category: 'DevOps & Infrastructure',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '528c1b0c-bf63-4ac6-a056-a0c8b5703e52',
        skillCode: 'CONTAINERIZATION_ORCHESTRATION',
        capability: 'Containers, images & Dockerfile best practices',
        observableBehaviours: [
          'Explains containers, images & dockerfile best practices accurately under assessment conditions',
          'Applies containers, images & dockerfile best practices to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates containers, images & dockerfile best practices in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'dad490b0-2a89-4e03-ad82-0b7580037bba',
        skillCode: 'CONTAINERIZATION_ORCHESTRATION',
        capability: 'Kubernetes workloads, services & ingress',
        observableBehaviours: [
          'Explains kubernetes workloads, services & ingress accurately under assessment conditions',
          'Applies kubernetes workloads, services & ingress to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates kubernetes workloads, services & ingress in timed assessment items',
        ],
        prerequisites: [ '528c1b0c-bf63-4ac6-a056-a0c8b5703e52' ],
        role: 'core',
      },
      {
        competencyId: '8d76a764-5a7b-4d9e-a7f6-b9bc74e9beb0',
        skillCode: 'CONTAINERIZATION_ORCHESTRATION',
        capability: 'Helm charts, namespaces & RBAC',
        observableBehaviours: [
          'Explains helm charts, namespaces & rbac accurately under assessment conditions',
          'Applies helm charts, namespaces & rbac to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates helm charts, namespaces & rbac in timed assessment items',
        ],
        prerequisites: [ 'dad490b0-2a89-4e03-ad82-0b7580037bba' ],
        role: 'supporting',
      },
      {
        competencyId: '8dbc0a02-5313-444f-a3bb-25f60362a998',
        skillCode: 'CONTAINERIZATION_ORCHESTRATION',
        capability: 'Scheduling, autoscaling & resource limits',
        observableBehaviours: [
          'Explains scheduling, autoscaling & resource limits accurately under assessment conditions',
          'Applies scheduling, autoscaling & resource limits to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates scheduling, autoscaling & resource limits in timed assessment items',
        ],
        prerequisites: [ '8d76a764-5a7b-4d9e-a7f6-b9bc74e9beb0' ],
        role: 'critical',
      },
      {
        competencyId: '8ed6de3e-b6b1-470d-ada3-4b98218f96e4',
        skillCode: 'CONTAINERIZATION_ORCHESTRATION',
        capability: 'Cluster observability & troubleshooting',
        observableBehaviours: [
          'Explains cluster observability & troubleshooting accurately under assessment conditions',
          'Applies cluster observability & troubleshooting to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates cluster observability & troubleshooting in timed assessment items',
        ],
        prerequisites: [ '8dbc0a02-5313-444f-a3bb-25f60362a998' ],
        role: 'critical',
      },
      {
        competencyId: '42fcbad3-816d-4ad0-a995-2e0eab648421',
        skillCode: 'CONTAINERIZATION_ORCHESTRATION',
        capability: 'Production Kubernetes platform design',
        observableBehaviours: [
          'Explains production kubernetes platform design accurately under assessment conditions',
          'Applies production kubernetes platform design to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates production kubernetes platform design in timed assessment items',
        ],
        prerequisites: [ '8ed6de3e-b6b1-470d-ada3-4b98218f96e4' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '528c1b0c-bf63-4ac6-a056-a0c8b5703e52' ], criticalCompetencyIds: [ '528c1b0c-bf63-4ac6-a056-a0c8b5703e52' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '528c1b0c-bf63-4ac6-a056-a0c8b5703e52', 'dad490b0-2a89-4e03-ad82-0b7580037bba', '8d76a764-5a7b-4d9e-a7f6-b9bc74e9beb0' ], criticalCompetencyIds: [ '8d76a764-5a7b-4d9e-a7f6-b9bc74e9beb0' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '528c1b0c-bf63-4ac6-a056-a0c8b5703e52', 'dad490b0-2a89-4e03-ad82-0b7580037bba', '8d76a764-5a7b-4d9e-a7f6-b9bc74e9beb0', '8dbc0a02-5313-444f-a3bb-25f60362a998', '8ed6de3e-b6b1-470d-ada3-4b98218f96e4' ], criticalCompetencyIds: [ '8dbc0a02-5313-444f-a3bb-25f60362a998', '8ed6de3e-b6b1-470d-ada3-4b98218f96e4' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '528c1b0c-bf63-4ac6-a056-a0c8b5703e52', 'dad490b0-2a89-4e03-ad82-0b7580037bba', '8d76a764-5a7b-4d9e-a7f6-b9bc74e9beb0', '8dbc0a02-5313-444f-a3bb-25f60362a998', '8ed6de3e-b6b1-470d-ada3-4b98218f96e4', '42fcbad3-816d-4ad0-a995-2e0eab648421' ], criticalCompetencyIds: [ '8ed6de3e-b6b1-470d-ada3-4b98218f96e4', '42fcbad3-816d-4ad0-a995-2e0eab648421' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Containers & Kubernetes',
      INTERMEDIATE: 'Independent execution of bounded Containers & Kubernetes tasks',
      ADVANCED: 'Owns Containers & Kubernetes components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Containers & Kubernetes at org scale',
    },
    assessmentBlueprint: 'SDE_DEPLOYMENT_CICD',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'OBSERVABILITY_MONITORING': {
    skillCode: 'OBSERVABILITY_MONITORING',
    name: 'Observability',
    domain: 'SOFTWARE_IT',
    category: 'DevOps & Infrastructure',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '3592afbb-eac0-4084-a3e4-865fcb238308',
        skillCode: 'OBSERVABILITY_MONITORING',
        capability: 'Metrics, logs & traces fundamentals',
        observableBehaviours: [
          'Explains metrics, logs & traces fundamentals accurately under assessment conditions',
          'Applies metrics, logs & traces fundamentals to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates metrics, logs & traces fundamentals in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '014964e9-65ff-4ce2-abfd-3dce2a5477c2',
        skillCode: 'OBSERVABILITY_MONITORING',
        capability: 'Instrumentation & OpenTelemetry practices',
        observableBehaviours: [
          'Explains instrumentation & opentelemetry practices accurately under assessment conditions',
          'Applies instrumentation & opentelemetry practices to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates instrumentation & opentelemetry practices in timed assessment items',
        ],
        prerequisites: [ '3592afbb-eac0-4084-a3e4-865fcb238308' ],
        role: 'core',
      },
      {
        competencyId: 'fd681316-5926-4a65-acc2-9bb966a9a52d',
        skillCode: 'OBSERVABILITY_MONITORING',
        capability: 'Dashboards, alerting & SLO burn rates',
        observableBehaviours: [
          'Explains dashboards, alerting & slo burn rates accurately under assessment conditions',
          'Applies dashboards, alerting & slo burn rates to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates dashboards, alerting & slo burn rates in timed assessment items',
        ],
        prerequisites: [ '014964e9-65ff-4ce2-abfd-3dce2a5477c2' ],
        role: 'supporting',
      },
      {
        competencyId: 'c88d8912-077d-4417-a600-3f9418c8f960',
        skillCode: 'OBSERVABILITY_MONITORING',
        capability: 'Distributed tracing & correlation IDs',
        observableBehaviours: [
          'Explains distributed tracing & correlation ids accurately under assessment conditions',
          'Applies distributed tracing & correlation ids to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates distributed tracing & correlation ids in timed assessment items',
        ],
        prerequisites: [ 'fd681316-5926-4a65-acc2-9bb966a9a52d' ],
        role: 'critical',
      },
      {
        competencyId: 'ec3c5b55-f195-432e-a323-4912facdc253',
        skillCode: 'OBSERVABILITY_MONITORING',
        capability: 'Log aggregation & anomaly detection',
        observableBehaviours: [
          'Explains log aggregation & anomaly detection accurately under assessment conditions',
          'Applies log aggregation & anomaly detection to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates log aggregation & anomaly detection in timed assessment items',
        ],
        prerequisites: [ 'c88d8912-077d-4417-a600-3f9418c8f960' ],
        role: 'critical',
      },
      {
        competencyId: 'bb9d437a-cd6b-414b-a128-e5f88b083a24',
        skillCode: 'OBSERVABILITY_MONITORING',
        capability: 'Observability platform architecture',
        observableBehaviours: [
          'Explains observability platform architecture accurately under assessment conditions',
          'Applies observability platform architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates observability platform architecture in timed assessment items',
        ],
        prerequisites: [ 'ec3c5b55-f195-432e-a323-4912facdc253' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '3592afbb-eac0-4084-a3e4-865fcb238308' ], criticalCompetencyIds: [ '3592afbb-eac0-4084-a3e4-865fcb238308' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '3592afbb-eac0-4084-a3e4-865fcb238308', '014964e9-65ff-4ce2-abfd-3dce2a5477c2', 'fd681316-5926-4a65-acc2-9bb966a9a52d' ], criticalCompetencyIds: [ 'fd681316-5926-4a65-acc2-9bb966a9a52d' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '3592afbb-eac0-4084-a3e4-865fcb238308', '014964e9-65ff-4ce2-abfd-3dce2a5477c2', 'fd681316-5926-4a65-acc2-9bb966a9a52d', 'c88d8912-077d-4417-a600-3f9418c8f960', 'ec3c5b55-f195-432e-a323-4912facdc253' ], criticalCompetencyIds: [ 'c88d8912-077d-4417-a600-3f9418c8f960', 'ec3c5b55-f195-432e-a323-4912facdc253' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '3592afbb-eac0-4084-a3e4-865fcb238308', '014964e9-65ff-4ce2-abfd-3dce2a5477c2', 'fd681316-5926-4a65-acc2-9bb966a9a52d', 'c88d8912-077d-4417-a600-3f9418c8f960', 'ec3c5b55-f195-432e-a323-4912facdc253', 'bb9d437a-cd6b-414b-a128-e5f88b083a24' ], criticalCompetencyIds: [ 'ec3c5b55-f195-432e-a323-4912facdc253', 'bb9d437a-cd6b-414b-a128-e5f88b083a24' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Observability',
      INTERMEDIATE: 'Independent execution of bounded Observability tasks',
      ADVANCED: 'Owns Observability components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Observability at org scale',
    },
    assessmentBlueprint: 'SDE_DEPLOYMENT_CICD',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'GITOPS_CONTINUOUS_DELIVERY': {
    skillCode: 'GITOPS_CONTINUOUS_DELIVERY',
    name: 'GitOps',
    domain: 'SOFTWARE_IT',
    category: 'DevOps & Infrastructure',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'ea08b6c1-0ead-47a4-aae5-297d71c544d6',
        skillCode: 'GITOPS_CONTINUOUS_DELIVERY',
        capability: 'GitOps principles & Git as source of truth',
        observableBehaviours: [
          'Explains gitops principles & git as source of truth accurately under assessment conditions',
          'Applies gitops principles & git as source of truth to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates gitops principles & git as source of truth in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '3b5bf0ea-0f34-4eb8-a8f3-09171bc4ea9f',
        skillCode: 'GITOPS_CONTINUOUS_DELIVERY',
        capability: 'Argo CD/Flux reconciliation loops',
        observableBehaviours: [
          'Explains argo cd/flux reconciliation loops accurately under assessment conditions',
          'Applies argo cd/flux reconciliation loops to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates argo cd/flux reconciliation loops in timed assessment items',
        ],
        prerequisites: [ 'ea08b6c1-0ead-47a4-aae5-297d71c544d6' ],
        role: 'core',
      },
      {
        competencyId: '34f7d912-b26c-4164-ade6-9c355f90a754',
        skillCode: 'GITOPS_CONTINUOUS_DELIVERY',
        capability: 'Environment promotion via PR workflows',
        observableBehaviours: [
          'Explains environment promotion via pr workflows accurately under assessment conditions',
          'Applies environment promotion via pr workflows to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates environment promotion via pr workflows in timed assessment items',
        ],
        prerequisites: [ '3b5bf0ea-0f34-4eb8-a8f3-09171bc4ea9f' ],
        role: 'supporting',
      },
      {
        competencyId: 'f08bed64-ef4d-47f9-aade-3a019b06b5de',
        skillCode: 'GITOPS_CONTINUOUS_DELIVERY',
        capability: 'Drift detection & automated rollback',
        observableBehaviours: [
          'Explains drift detection & automated rollback accurately under assessment conditions',
          'Applies drift detection & automated rollback to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates drift detection & automated rollback in timed assessment items',
        ],
        prerequisites: [ '34f7d912-b26c-4164-ade6-9c355f90a754' ],
        role: 'critical',
      },
      {
        competencyId: '4a0af11a-63ee-4701-a273-ac9817c1ba64',
        skillCode: 'GITOPS_CONTINUOUS_DELIVERY',
        capability: 'Secrets management in GitOps pipelines',
        observableBehaviours: [
          'Explains secrets management in gitops pipelines accurately under assessment conditions',
          'Applies secrets management in gitops pipelines to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates secrets management in gitops pipelines in timed assessment items',
        ],
        prerequisites: [ 'f08bed64-ef4d-47f9-aade-3a019b06b5de' ],
        role: 'critical',
      },
      {
        competencyId: 'bc7b36dc-c7fc-4caf-a442-aa302b235575',
        skillCode: 'GITOPS_CONTINUOUS_DELIVERY',
        capability: 'GitOps platform architecture',
        observableBehaviours: [
          'Explains gitops platform architecture accurately under assessment conditions',
          'Applies gitops platform architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates gitops platform architecture in timed assessment items',
        ],
        prerequisites: [ '4a0af11a-63ee-4701-a273-ac9817c1ba64' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'ea08b6c1-0ead-47a4-aae5-297d71c544d6' ], criticalCompetencyIds: [ 'ea08b6c1-0ead-47a4-aae5-297d71c544d6' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'ea08b6c1-0ead-47a4-aae5-297d71c544d6', '3b5bf0ea-0f34-4eb8-a8f3-09171bc4ea9f', '34f7d912-b26c-4164-ade6-9c355f90a754' ], criticalCompetencyIds: [ '34f7d912-b26c-4164-ade6-9c355f90a754' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'ea08b6c1-0ead-47a4-aae5-297d71c544d6', '3b5bf0ea-0f34-4eb8-a8f3-09171bc4ea9f', '34f7d912-b26c-4164-ade6-9c355f90a754', 'f08bed64-ef4d-47f9-aade-3a019b06b5de', '4a0af11a-63ee-4701-a273-ac9817c1ba64' ], criticalCompetencyIds: [ 'f08bed64-ef4d-47f9-aade-3a019b06b5de', '4a0af11a-63ee-4701-a273-ac9817c1ba64' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'ea08b6c1-0ead-47a4-aae5-297d71c544d6', '3b5bf0ea-0f34-4eb8-a8f3-09171bc4ea9f', '34f7d912-b26c-4164-ade6-9c355f90a754', 'f08bed64-ef4d-47f9-aade-3a019b06b5de', '4a0af11a-63ee-4701-a273-ac9817c1ba64', 'bc7b36dc-c7fc-4caf-a442-aa302b235575' ], criticalCompetencyIds: [ '4a0af11a-63ee-4701-a273-ac9817c1ba64', 'bc7b36dc-c7fc-4caf-a442-aa302b235575' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of GitOps',
      INTERMEDIATE: 'Independent execution of bounded GitOps tasks',
      ADVANCED: 'Owns GitOps components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for GitOps at org scale',
    },
    assessmentBlueprint: 'SDE_DEPLOYMENT_CICD',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION': {
    skillCode: 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
    name: 'Relational Databases',
    domain: 'SOFTWARE_IT',
    category: 'Databases & Data Management',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'f21d04b3-482c-46d4-aa33-dba02adf956e',
        skillCode: 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
        capability: 'Relational modeling & normalization',
        observableBehaviours: [
          'Explains relational modeling & normalization accurately under assessment conditions',
          'Applies relational modeling & normalization to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates relational modeling & normalization in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '1a2e6480-e1a0-465b-a0e1-59a1ab0f71a3',
        skillCode: 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
        capability: 'DDL, constraints & referential integrity',
        observableBehaviours: [
          'Explains ddl, constraints & referential integrity accurately under assessment conditions',
          'Applies ddl, constraints & referential integrity to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates ddl, constraints & referential integrity in timed assessment items',
        ],
        prerequisites: [ 'f21d04b3-482c-46d4-aa33-dba02adf956e' ],
        role: 'core',
      },
      {
        competencyId: '4a499265-1e92-4cc9-ad05-b9c5f5d4368b',
        skillCode: 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
        capability: 'Indexing strategies & query tuning',
        observableBehaviours: [
          'Explains indexing strategies & query tuning accurately under assessment conditions',
          'Applies indexing strategies & query tuning to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates indexing strategies & query tuning in timed assessment items',
        ],
        prerequisites: [ '1a2e6480-e1a0-465b-a0e1-59a1ab0f71a3' ],
        role: 'supporting',
      },
      {
        competencyId: 'fabd5492-ec3a-41e7-ac0b-1d024ae64d85',
        skillCode: 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
        capability: 'Backup, recovery & replication',
        observableBehaviours: [
          'Explains backup, recovery & replication accurately under assessment conditions',
          'Applies backup, recovery & replication to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates backup, recovery & replication in timed assessment items',
        ],
        prerequisites: [ '4a499265-1e92-4cc9-ad05-b9c5f5d4368b' ],
        role: 'critical',
      },
      {
        competencyId: '73715340-dd7c-46bc-a562-eea795f27638',
        skillCode: 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
        capability: 'Security, roles & audit logging',
        observableBehaviours: [
          'Explains security, roles & audit logging accurately under assessment conditions',
          'Applies security, roles & audit logging to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates security, roles & audit logging in timed assessment items',
        ],
        prerequisites: [ 'fabd5492-ec3a-41e7-ac0b-1d024ae64d85' ],
        role: 'critical',
      },
      {
        competencyId: '9394f57d-6e16-4c97-ae3b-f04dc8c51be4',
        skillCode: 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
        capability: 'Enterprise RDBMS architecture',
        observableBehaviours: [
          'Explains enterprise rdbms architecture accurately under assessment conditions',
          'Applies enterprise rdbms architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates enterprise rdbms architecture in timed assessment items',
        ],
        prerequisites: [ '73715340-dd7c-46bc-a562-eea795f27638' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'f21d04b3-482c-46d4-aa33-dba02adf956e' ], criticalCompetencyIds: [ 'f21d04b3-482c-46d4-aa33-dba02adf956e' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'f21d04b3-482c-46d4-aa33-dba02adf956e', '1a2e6480-e1a0-465b-a0e1-59a1ab0f71a3', '4a499265-1e92-4cc9-ad05-b9c5f5d4368b' ], criticalCompetencyIds: [ '4a499265-1e92-4cc9-ad05-b9c5f5d4368b' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'f21d04b3-482c-46d4-aa33-dba02adf956e', '1a2e6480-e1a0-465b-a0e1-59a1ab0f71a3', '4a499265-1e92-4cc9-ad05-b9c5f5d4368b', 'fabd5492-ec3a-41e7-ac0b-1d024ae64d85', '73715340-dd7c-46bc-a562-eea795f27638' ], criticalCompetencyIds: [ 'fabd5492-ec3a-41e7-ac0b-1d024ae64d85', '73715340-dd7c-46bc-a562-eea795f27638' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'f21d04b3-482c-46d4-aa33-dba02adf956e', '1a2e6480-e1a0-465b-a0e1-59a1ab0f71a3', '4a499265-1e92-4cc9-ad05-b9c5f5d4368b', 'fabd5492-ec3a-41e7-ac0b-1d024ae64d85', '73715340-dd7c-46bc-a562-eea795f27638', '9394f57d-6e16-4c97-ae3b-f04dc8c51be4' ], criticalCompetencyIds: [ '73715340-dd7c-46bc-a562-eea795f27638', '9394f57d-6e16-4c97-ae3b-f04dc8c51be4' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Relational Databases',
      INTERMEDIATE: 'Independent execution of bounded Relational Databases tasks',
      ADVANCED: 'Owns Relational Databases components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Relational Databases at org scale',
    },
    assessmentBlueprint: 'SDE_DATABASE_SQL',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'NOSQL_DATABASE_ENGINEERING': {
    skillCode: 'NOSQL_DATABASE_ENGINEERING',
    name: 'NoSQL Databases',
    domain: 'SOFTWARE_IT',
    category: 'Databases & Data Management',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '26392b78-9797-4672-ad4d-a1ed9798c3c6',
        skillCode: 'NOSQL_DATABASE_ENGINEERING',
        capability: 'NoSQL data models & CAP trade-offs',
        observableBehaviours: [
          'Explains nosql data models & cap trade-offs accurately under assessment conditions',
          'Applies nosql data models & cap trade-offs to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates nosql data models & cap trade-offs in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '0c9330b8-4c84-46b2-a020-cda094233c28',
        skillCode: 'NOSQL_DATABASE_ENGINEERING',
        capability: 'Document, key-value & wide-column stores',
        observableBehaviours: [
          'Explains document, key-value & wide-column stores accurately under assessment conditions',
          'Applies document, key-value & wide-column stores to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates document, key-value & wide-column stores in timed assessment items',
        ],
        prerequisites: [ '26392b78-9797-4672-ad4d-a1ed9798c3c6' ],
        role: 'core',
      },
      {
        competencyId: 'ec3fe041-4ba7-43fc-a8cf-b60985cbb6f2',
        skillCode: 'NOSQL_DATABASE_ENGINEERING',
        capability: 'Schema design & access pattern modeling',
        observableBehaviours: [
          'Explains schema design & access pattern modeling accurately under assessment conditions',
          'Applies schema design & access pattern modeling to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates schema design & access pattern modeling in timed assessment items',
        ],
        prerequisites: [ '0c9330b8-4c84-46b2-a020-cda094233c28' ],
        role: 'supporting',
      },
      {
        competencyId: 'f925237b-777d-449d-a122-2e3a602191b9',
        skillCode: 'NOSQL_DATABASE_ENGINEERING',
        capability: 'Consistency, replication & sharding',
        observableBehaviours: [
          'Explains consistency, replication & sharding accurately under assessment conditions',
          'Applies consistency, replication & sharding to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates consistency, replication & sharding in timed assessment items',
        ],
        prerequisites: [ 'ec3fe041-4ba7-43fc-a8cf-b60985cbb6f2' ],
        role: 'critical',
      },
      {
        competencyId: '786284a6-8ba0-4eb3-a811-40614c7a5f69',
        skillCode: 'NOSQL_DATABASE_ENGINEERING',
        capability: 'Performance tuning & operational tooling',
        observableBehaviours: [
          'Explains performance tuning & operational tooling accurately under assessment conditions',
          'Applies performance tuning & operational tooling to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates performance tuning & operational tooling in timed assessment items',
        ],
        prerequisites: [ 'f925237b-777d-449d-a122-2e3a602191b9' ],
        role: 'critical',
      },
      {
        competencyId: '3dc0641b-1ef8-411f-a889-055fb5cd395f',
        skillCode: 'NOSQL_DATABASE_ENGINEERING',
        capability: 'Polyglot persistence architecture',
        observableBehaviours: [
          'Explains polyglot persistence architecture accurately under assessment conditions',
          'Applies polyglot persistence architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates polyglot persistence architecture in timed assessment items',
        ],
        prerequisites: [ '786284a6-8ba0-4eb3-a811-40614c7a5f69' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '26392b78-9797-4672-ad4d-a1ed9798c3c6' ], criticalCompetencyIds: [ '26392b78-9797-4672-ad4d-a1ed9798c3c6' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '26392b78-9797-4672-ad4d-a1ed9798c3c6', '0c9330b8-4c84-46b2-a020-cda094233c28', 'ec3fe041-4ba7-43fc-a8cf-b60985cbb6f2' ], criticalCompetencyIds: [ 'ec3fe041-4ba7-43fc-a8cf-b60985cbb6f2' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '26392b78-9797-4672-ad4d-a1ed9798c3c6', '0c9330b8-4c84-46b2-a020-cda094233c28', 'ec3fe041-4ba7-43fc-a8cf-b60985cbb6f2', 'f925237b-777d-449d-a122-2e3a602191b9', '786284a6-8ba0-4eb3-a811-40614c7a5f69' ], criticalCompetencyIds: [ 'f925237b-777d-449d-a122-2e3a602191b9', '786284a6-8ba0-4eb3-a811-40614c7a5f69' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '26392b78-9797-4672-ad4d-a1ed9798c3c6', '0c9330b8-4c84-46b2-a020-cda094233c28', 'ec3fe041-4ba7-43fc-a8cf-b60985cbb6f2', 'f925237b-777d-449d-a122-2e3a602191b9', '786284a6-8ba0-4eb3-a811-40614c7a5f69', '3dc0641b-1ef8-411f-a889-055fb5cd395f' ], criticalCompetencyIds: [ '786284a6-8ba0-4eb3-a811-40614c7a5f69', '3dc0641b-1ef8-411f-a889-055fb5cd395f' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of NoSQL Databases',
      INTERMEDIATE: 'Independent execution of bounded NoSQL Databases tasks',
      ADVANCED: 'Owns NoSQL Databases components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for NoSQL Databases at org scale',
    },
    assessmentBlueprint: 'SDE_DATABASE_SQL',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'DATA_MODELING_NORMALIZATION': {
    skillCode: 'DATA_MODELING_NORMALIZATION',
    name: 'Data Modeling',
    domain: 'SOFTWARE_IT',
    category: 'Databases & Data Management',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '3fc2315a-3e21-41ae-a2e7-884ccf3b6dd6',
        skillCode: 'DATA_MODELING_NORMALIZATION',
        capability: 'Conceptual & logical data modeling',
        observableBehaviours: [
          'Explains conceptual & logical data modeling accurately under assessment conditions',
          'Applies conceptual & logical data modeling to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates conceptual & logical data modeling in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'd293f932-5ea8-4fd5-aa52-3b46eceefac1',
        skillCode: 'DATA_MODELING_NORMALIZATION',
        capability: 'Normalization forms & denormalization trade-offs',
        observableBehaviours: [
          'Explains normalization forms & denormalization trade-offs accurately under assessment conditions',
          'Applies normalization forms & denormalization trade-offs to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates normalization forms & denormalization trade-offs in timed assessment items',
        ],
        prerequisites: [ '3fc2315a-3e21-41ae-a2e7-884ccf3b6dd6' ],
        role: 'core',
      },
      {
        competencyId: '18ea278b-63de-402c-aed7-32dd6474ed79',
        skillCode: 'DATA_MODELING_NORMALIZATION',
        capability: 'Dimensional modeling & star/snowflake schemas',
        observableBehaviours: [
          'Explains dimensional modeling & star/snowflake schemas accurately under assessment conditions',
          'Applies dimensional modeling & star/snowflake schemas to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates dimensional modeling & star/snowflake schemas in timed assessment items',
        ],
        prerequisites: [ 'd293f932-5ea8-4fd5-aa52-3b46eceefac1' ],
        role: 'supporting',
      },
      {
        competencyId: '080ea3ee-b76b-4042-a6ff-970af8e1cb1c',
        skillCode: 'DATA_MODELING_NORMALIZATION',
        capability: 'Slowly changing dimensions & historization',
        observableBehaviours: [
          'Explains slowly changing dimensions & historization accurately under assessment conditions',
          'Applies slowly changing dimensions & historization to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates slowly changing dimensions & historization in timed assessment items',
        ],
        prerequisites: [ '18ea278b-63de-402c-aed7-32dd6474ed79' ],
        role: 'critical',
      },
      {
        competencyId: 'e3f8b8a5-689a-4780-afe3-e369d4793837',
        skillCode: 'DATA_MODELING_NORMALIZATION',
        capability: 'Data dictionary & lineage documentation',
        observableBehaviours: [
          'Explains data dictionary & lineage documentation accurately under assessment conditions',
          'Applies data dictionary & lineage documentation to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates data dictionary & lineage documentation in timed assessment items',
        ],
        prerequisites: [ '080ea3ee-b76b-4042-a6ff-970af8e1cb1c' ],
        role: 'critical',
      },
      {
        competencyId: '59e411e5-9b42-4337-ad96-9af7e6ca054b',
        skillCode: 'DATA_MODELING_NORMALIZATION',
        capability: 'Enterprise data model governance',
        observableBehaviours: [
          'Explains enterprise data model governance accurately under assessment conditions',
          'Applies enterprise data model governance to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates enterprise data model governance in timed assessment items',
        ],
        prerequisites: [ 'e3f8b8a5-689a-4780-afe3-e369d4793837' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '3fc2315a-3e21-41ae-a2e7-884ccf3b6dd6' ], criticalCompetencyIds: [ '3fc2315a-3e21-41ae-a2e7-884ccf3b6dd6' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '3fc2315a-3e21-41ae-a2e7-884ccf3b6dd6', 'd293f932-5ea8-4fd5-aa52-3b46eceefac1', '18ea278b-63de-402c-aed7-32dd6474ed79' ], criticalCompetencyIds: [ '18ea278b-63de-402c-aed7-32dd6474ed79' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '3fc2315a-3e21-41ae-a2e7-884ccf3b6dd6', 'd293f932-5ea8-4fd5-aa52-3b46eceefac1', '18ea278b-63de-402c-aed7-32dd6474ed79', '080ea3ee-b76b-4042-a6ff-970af8e1cb1c', 'e3f8b8a5-689a-4780-afe3-e369d4793837' ], criticalCompetencyIds: [ '080ea3ee-b76b-4042-a6ff-970af8e1cb1c', 'e3f8b8a5-689a-4780-afe3-e369d4793837' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '3fc2315a-3e21-41ae-a2e7-884ccf3b6dd6', 'd293f932-5ea8-4fd5-aa52-3b46eceefac1', '18ea278b-63de-402c-aed7-32dd6474ed79', '080ea3ee-b76b-4042-a6ff-970af8e1cb1c', 'e3f8b8a5-689a-4780-afe3-e369d4793837', '59e411e5-9b42-4337-ad96-9af7e6ca054b' ], criticalCompetencyIds: [ 'e3f8b8a5-689a-4780-afe3-e369d4793837', '59e411e5-9b42-4337-ad96-9af7e6ca054b' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Data Modeling',
      INTERMEDIATE: 'Independent execution of bounded Data Modeling tasks',
      ADVANCED: 'Owns Data Modeling components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Data Modeling at org scale',
    },
    assessmentBlueprint: 'SDE_DATABASE_SQL',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'DATABASE_PERFORMANCE_TUNING_INDEXING': {
    skillCode: 'DATABASE_PERFORMANCE_TUNING_INDEXING',
    name: 'Database Performance Tuning',
    domain: 'SOFTWARE_IT',
    category: 'Databases & Data Management',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '06cc3911-b0b5-44c7-a8a5-fbf6a60bdee1',
        skillCode: 'DATABASE_PERFORMANCE_TUNING_INDEXING',
        capability: 'Query execution plans & statistics',
        observableBehaviours: [
          'Explains query execution plans & statistics accurately under assessment conditions',
          'Applies query execution plans & statistics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates query execution plans & statistics in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '0598f60f-052b-444c-a85f-5d405063a6fd',
        skillCode: 'DATABASE_PERFORMANCE_TUNING_INDEXING',
        capability: 'Index types, covering indexes & selectivity',
        observableBehaviours: [
          'Explains index types, covering indexes & selectivity accurately under assessment conditions',
          'Applies index types, covering indexes & selectivity to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates index types, covering indexes & selectivity in timed assessment items',
        ],
        prerequisites: [ '06cc3911-b0b5-44c7-a8a5-fbf6a60bdee1' ],
        role: 'core',
      },
      {
        competencyId: '8b7380dd-f7fd-4c91-a5e6-b987f658162c',
        skillCode: 'DATABASE_PERFORMANCE_TUNING_INDEXING',
        capability: 'Locking, blocking & deadlock analysis',
        observableBehaviours: [
          'Explains locking, blocking & deadlock analysis accurately under assessment conditions',
          'Applies locking, blocking & deadlock analysis to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates locking, blocking & deadlock analysis in timed assessment items',
        ],
        prerequisites: [ '0598f60f-052b-444c-a85f-5d405063a6fd' ],
        role: 'supporting',
      },
      {
        competencyId: '607bec2a-dd04-4376-ade0-37b649a91bb0',
        skillCode: 'DATABASE_PERFORMANCE_TUNING_INDEXING',
        capability: 'Partitioning & archival strategies',
        observableBehaviours: [
          'Explains partitioning & archival strategies accurately under assessment conditions',
          'Applies partitioning & archival strategies to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates partitioning & archival strategies in timed assessment items',
        ],
        prerequisites: [ '8b7380dd-f7fd-4c91-a5e6-b987f658162c' ],
        role: 'critical',
      },
      {
        competencyId: 'ab750df8-b49f-4c44-a9b0-24ada1de5ad9',
        skillCode: 'DATABASE_PERFORMANCE_TUNING_INDEXING',
        capability: 'Connection pooling & workload isolation',
        observableBehaviours: [
          'Explains connection pooling & workload isolation accurately under assessment conditions',
          'Applies connection pooling & workload isolation to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates connection pooling & workload isolation in timed assessment items',
        ],
        prerequisites: [ '607bec2a-dd04-4376-ade0-37b649a91bb0' ],
        role: 'critical',
      },
      {
        competencyId: '39607d51-686e-40cc-a552-44c3e255965e',
        skillCode: 'DATABASE_PERFORMANCE_TUNING_INDEXING',
        capability: 'Database performance architecture',
        observableBehaviours: [
          'Explains database performance architecture accurately under assessment conditions',
          'Applies database performance architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates database performance architecture in timed assessment items',
        ],
        prerequisites: [ 'ab750df8-b49f-4c44-a9b0-24ada1de5ad9' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '06cc3911-b0b5-44c7-a8a5-fbf6a60bdee1' ], criticalCompetencyIds: [ '06cc3911-b0b5-44c7-a8a5-fbf6a60bdee1' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '06cc3911-b0b5-44c7-a8a5-fbf6a60bdee1', '0598f60f-052b-444c-a85f-5d405063a6fd', '8b7380dd-f7fd-4c91-a5e6-b987f658162c' ], criticalCompetencyIds: [ '8b7380dd-f7fd-4c91-a5e6-b987f658162c' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '06cc3911-b0b5-44c7-a8a5-fbf6a60bdee1', '0598f60f-052b-444c-a85f-5d405063a6fd', '8b7380dd-f7fd-4c91-a5e6-b987f658162c', '607bec2a-dd04-4376-ade0-37b649a91bb0', 'ab750df8-b49f-4c44-a9b0-24ada1de5ad9' ], criticalCompetencyIds: [ '607bec2a-dd04-4376-ade0-37b649a91bb0', 'ab750df8-b49f-4c44-a9b0-24ada1de5ad9' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '06cc3911-b0b5-44c7-a8a5-fbf6a60bdee1', '0598f60f-052b-444c-a85f-5d405063a6fd', '8b7380dd-f7fd-4c91-a5e6-b987f658162c', '607bec2a-dd04-4376-ade0-37b649a91bb0', 'ab750df8-b49f-4c44-a9b0-24ada1de5ad9', '39607d51-686e-40cc-a552-44c3e255965e' ], criticalCompetencyIds: [ 'ab750df8-b49f-4c44-a9b0-24ada1de5ad9', '39607d51-686e-40cc-a552-44c3e255965e' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Database Performance Tuning',
      INTERMEDIATE: 'Independent execution of bounded Database Performance Tuning tasks',
      ADVANCED: 'Owns Database Performance Tuning components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Database Performance Tuning at org scale',
    },
    assessmentBlueprint: 'SDE_DATABASE_SQL',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'ETL_ELT_PIPELINE_DEVELOPMENT': {
    skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
    name: 'ETL / ELT',
    domain: 'SOFTWARE_IT',
    category: 'Data Engineering & Big Data',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '85e96613-9bf6-4e79-af56-c516f3a9b34d',
        skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
        capability: 'Batch pipeline design & orchestration',
        observableBehaviours: [
          'Explains batch pipeline design & orchestration accurately under assessment conditions',
          'Applies batch pipeline design & orchestration to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates batch pipeline design & orchestration in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'a558d9a0-6d57-4a77-adb3-6cbe2c25ec1d',
        skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
        capability: 'Extract, transform & load patterns',
        observableBehaviours: [
          'Explains extract, transform & load patterns accurately under assessment conditions',
          'Applies extract, transform & load patterns to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates extract, transform & load patterns in timed assessment items',
        ],
        prerequisites: [ '85e96613-9bf6-4e79-af56-c516f3a9b34d' ],
        role: 'core',
      },
      {
        competencyId: '80e2350d-8c73-4135-a04d-465597d26e94',
        skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
        capability: 'Data quality checks & schema evolution',
        observableBehaviours: [
          'Explains data quality checks & schema evolution accurately under assessment conditions',
          'Applies data quality checks & schema evolution to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates data quality checks & schema evolution in timed assessment items',
        ],
        prerequisites: [ 'a558d9a0-6d57-4a77-adb3-6cbe2c25ec1d' ],
        role: 'supporting',
      },
      {
        competencyId: '67de1155-013f-484c-aaa8-295a50830ba3',
        skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
        capability: 'Incremental processing & idempotent jobs',
        observableBehaviours: [
          'Explains incremental processing & idempotent jobs accurately under assessment conditions',
          'Applies incremental processing & idempotent jobs to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates incremental processing & idempotent jobs in timed assessment items',
        ],
        prerequisites: [ '80e2350d-8c73-4135-a04d-465597d26e94' ],
        role: 'critical',
      },
      {
        competencyId: 'c0d72a42-7915-488d-ae1f-d82dbd50f1ef',
        skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
        capability: 'Pipeline monitoring & failure recovery',
        observableBehaviours: [
          'Explains pipeline monitoring & failure recovery accurately under assessment conditions',
          'Applies pipeline monitoring & failure recovery to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates pipeline monitoring & failure recovery in timed assessment items',
        ],
        prerequisites: [ '67de1155-013f-484c-aaa8-295a50830ba3' ],
        role: 'critical',
      },
      {
        competencyId: 'de53778e-fcb4-4ed6-afee-8e3319738bce',
        skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
        capability: 'Production data pipeline architecture',
        observableBehaviours: [
          'Explains production data pipeline architecture accurately under assessment conditions',
          'Applies production data pipeline architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates production data pipeline architecture in timed assessment items',
        ],
        prerequisites: [ 'c0d72a42-7915-488d-ae1f-d82dbd50f1ef' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '85e96613-9bf6-4e79-af56-c516f3a9b34d' ], criticalCompetencyIds: [ '85e96613-9bf6-4e79-af56-c516f3a9b34d' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '85e96613-9bf6-4e79-af56-c516f3a9b34d', 'a558d9a0-6d57-4a77-adb3-6cbe2c25ec1d', '80e2350d-8c73-4135-a04d-465597d26e94' ], criticalCompetencyIds: [ '80e2350d-8c73-4135-a04d-465597d26e94' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '85e96613-9bf6-4e79-af56-c516f3a9b34d', 'a558d9a0-6d57-4a77-adb3-6cbe2c25ec1d', '80e2350d-8c73-4135-a04d-465597d26e94', '67de1155-013f-484c-aaa8-295a50830ba3', 'c0d72a42-7915-488d-ae1f-d82dbd50f1ef' ], criticalCompetencyIds: [ '67de1155-013f-484c-aaa8-295a50830ba3', 'c0d72a42-7915-488d-ae1f-d82dbd50f1ef' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '85e96613-9bf6-4e79-af56-c516f3a9b34d', 'a558d9a0-6d57-4a77-adb3-6cbe2c25ec1d', '80e2350d-8c73-4135-a04d-465597d26e94', '67de1155-013f-484c-aaa8-295a50830ba3', 'c0d72a42-7915-488d-ae1f-d82dbd50f1ef', 'de53778e-fcb4-4ed6-afee-8e3319738bce' ], criticalCompetencyIds: [ 'c0d72a42-7915-488d-ae1f-d82dbd50f1ef', 'de53778e-fcb4-4ed6-afee-8e3319738bce' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of ETL / ELT',
      INTERMEDIATE: 'Independent execution of bounded ETL / ELT tasks',
      ADVANCED: 'Owns ETL / ELT components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for ETL / ELT at org scale',
    },
    assessmentBlueprint: 'SDE_DATABASE_SQL',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'BIG_DATA_PROCESSING_FRAMEWORKS': {
    skillCode: 'BIG_DATA_PROCESSING_FRAMEWORKS',
    name: 'Big Data Processing',
    domain: 'SOFTWARE_IT',
    category: 'Data Engineering & Big Data',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'febd184c-a588-4eed-a1f5-462ba88afeda',
        skillCode: 'BIG_DATA_PROCESSING_FRAMEWORKS',
        capability: 'Distributed compute fundamentals (MapReduce lineage)',
        observableBehaviours: [
          'Explains distributed compute fundamentals (mapreduce lineage) accurately under assessment conditions',
          'Applies distributed compute fundamentals (mapreduce lineage) to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates distributed compute fundamentals (mapreduce lineage) in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'dfebf3ea-e653-4ce6-af9e-5bcbeb1e25c4',
        skillCode: 'BIG_DATA_PROCESSING_FRAMEWORKS',
        capability: 'Spark RDDs, DataFrames & Spark SQL',
        observableBehaviours: [
          'Explains spark rdds, dataframes & spark sql accurately under assessment conditions',
          'Applies spark rdds, dataframes & spark sql to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates spark rdds, dataframes & spark sql in timed assessment items',
        ],
        prerequisites: [ 'febd184c-a588-4eed-a1f5-462ba88afeda' ],
        role: 'core',
      },
      {
        competencyId: '0bf396fc-95ed-4fb0-aabe-ec036e3475ec',
        skillCode: 'BIG_DATA_PROCESSING_FRAMEWORKS',
        capability: 'Partitioning, shuffles & job optimization',
        observableBehaviours: [
          'Explains partitioning, shuffles & job optimization accurately under assessment conditions',
          'Applies partitioning, shuffles & job optimization to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates partitioning, shuffles & job optimization in timed assessment items',
        ],
        prerequisites: [ 'dfebf3ea-e653-4ce6-af9e-5bcbeb1e25c4' ],
        role: 'supporting',
      },
      {
        competencyId: '5b382661-4df2-4f4a-ab13-c95c565a6ed4',
        skillCode: 'BIG_DATA_PROCESSING_FRAMEWORKS',
        capability: 'Batch vs streaming on big data platforms',
        observableBehaviours: [
          'Explains batch vs streaming on big data platforms accurately under assessment conditions',
          'Applies batch vs streaming on big data platforms to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates batch vs streaming on big data platforms in timed assessment items',
        ],
        prerequisites: [ '0bf396fc-95ed-4fb0-aabe-ec036e3475ec' ],
        role: 'critical',
      },
      {
        competencyId: '991988eb-03cc-4b55-a34f-d631e8f9c191',
        skillCode: 'BIG_DATA_PROCESSING_FRAMEWORKS',
        capability: 'Cluster sizing, fault tolerance & debugging',
        observableBehaviours: [
          'Explains cluster sizing, fault tolerance & debugging accurately under assessment conditions',
          'Applies cluster sizing, fault tolerance & debugging to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates cluster sizing, fault tolerance & debugging in timed assessment items',
        ],
        prerequisites: [ '5b382661-4df2-4f4a-ab13-c95c565a6ed4' ],
        role: 'critical',
      },
      {
        competencyId: '96d8508d-2010-46b0-acd8-5896cf456417',
        skillCode: 'BIG_DATA_PROCESSING_FRAMEWORKS',
        capability: 'Big data platform architecture',
        observableBehaviours: [
          'Explains big data platform architecture accurately under assessment conditions',
          'Applies big data platform architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates big data platform architecture in timed assessment items',
        ],
        prerequisites: [ '991988eb-03cc-4b55-a34f-d631e8f9c191' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'febd184c-a588-4eed-a1f5-462ba88afeda' ], criticalCompetencyIds: [ 'febd184c-a588-4eed-a1f5-462ba88afeda' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'febd184c-a588-4eed-a1f5-462ba88afeda', 'dfebf3ea-e653-4ce6-af9e-5bcbeb1e25c4', '0bf396fc-95ed-4fb0-aabe-ec036e3475ec' ], criticalCompetencyIds: [ '0bf396fc-95ed-4fb0-aabe-ec036e3475ec' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'febd184c-a588-4eed-a1f5-462ba88afeda', 'dfebf3ea-e653-4ce6-af9e-5bcbeb1e25c4', '0bf396fc-95ed-4fb0-aabe-ec036e3475ec', '5b382661-4df2-4f4a-ab13-c95c565a6ed4', '991988eb-03cc-4b55-a34f-d631e8f9c191' ], criticalCompetencyIds: [ '5b382661-4df2-4f4a-ab13-c95c565a6ed4', '991988eb-03cc-4b55-a34f-d631e8f9c191' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'febd184c-a588-4eed-a1f5-462ba88afeda', 'dfebf3ea-e653-4ce6-af9e-5bcbeb1e25c4', '0bf396fc-95ed-4fb0-aabe-ec036e3475ec', '5b382661-4df2-4f4a-ab13-c95c565a6ed4', '991988eb-03cc-4b55-a34f-d631e8f9c191', '96d8508d-2010-46b0-acd8-5896cf456417' ], criticalCompetencyIds: [ '991988eb-03cc-4b55-a34f-d631e8f9c191', '96d8508d-2010-46b0-acd8-5896cf456417' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Big Data Processing',
      INTERMEDIATE: 'Independent execution of bounded Big Data Processing tasks',
      ADVANCED: 'Owns Big Data Processing components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Big Data Processing at org scale',
    },
    assessmentBlueprint: 'SDE_DSA',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT': {
    skillCode: 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
    name: 'Machine Learning',
    domain: 'SOFTWARE_IT',
    category: 'AI, ML & Data Science',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '7944a17b-d7e5-4459-a34b-f1e5040d8bdb',
        skillCode: 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
        capability: 'ML fundamentals & supervised learning workflow',
        observableBehaviours: [
          'Explains ml fundamentals & supervised learning workflow accurately under assessment conditions',
          'Applies ml fundamentals & supervised learning workflow to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates ml fundamentals & supervised learning workflow in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '9f34278c-3072-48b9-a7fe-0df558ff113a',
        skillCode: 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
        capability: 'Feature engineering & dataset splitting',
        observableBehaviours: [
          'Explains feature engineering & dataset splitting accurately under assessment conditions',
          'Applies feature engineering & dataset splitting to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates feature engineering & dataset splitting in timed assessment items',
        ],
        prerequisites: [ '7944a17b-d7e5-4459-a34b-f1e5040d8bdb' ],
        role: 'core',
      },
      {
        competencyId: 'd4f10f65-09f2-44e0-a184-84ae5d6d6c45',
        skillCode: 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
        capability: 'Model training, validation & bias checks',
        observableBehaviours: [
          'Explains model training, validation & bias checks accurately under assessment conditions',
          'Applies model training, validation & bias checks to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates model training, validation & bias checks in timed assessment items',
        ],
        prerequisites: [ '9f34278c-3072-48b9-a7fe-0df558ff113a' ],
        role: 'supporting',
      },
      {
        competencyId: '19187728-5d06-4ca3-a2e6-61442c80c53a',
        skillCode: 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
        capability: 'Model deployment & serving patterns',
        observableBehaviours: [
          'Explains model deployment & serving patterns accurately under assessment conditions',
          'Applies model deployment & serving patterns to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates model deployment & serving patterns in timed assessment items',
        ],
        prerequisites: [ 'd4f10f65-09f2-44e0-a184-84ae5d6d6c45' ],
        role: 'critical',
      },
      {
        competencyId: '48a48609-58c2-47bf-ae36-7f7e68a49cd5',
        skillCode: 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
        capability: 'Monitoring drift, retraining & A/B tests',
        observableBehaviours: [
          'Explains monitoring drift, retraining & a/b tests accurately under assessment conditions',
          'Applies monitoring drift, retraining & a/b tests to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates monitoring drift, retraining & a/b tests in timed assessment items',
        ],
        prerequisites: [ '19187728-5d06-4ca3-a2e6-61442c80c53a' ],
        role: 'critical',
      },
      {
        competencyId: 'a52a6009-3a52-42b9-afa7-96eb0556b3d6',
        skillCode: 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
        capability: 'Production ML system architecture',
        observableBehaviours: [
          'Explains production ml system architecture accurately under assessment conditions',
          'Applies production ml system architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates production ml system architecture in timed assessment items',
        ],
        prerequisites: [ '48a48609-58c2-47bf-ae36-7f7e68a49cd5' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '7944a17b-d7e5-4459-a34b-f1e5040d8bdb' ], criticalCompetencyIds: [ '7944a17b-d7e5-4459-a34b-f1e5040d8bdb' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '7944a17b-d7e5-4459-a34b-f1e5040d8bdb', '9f34278c-3072-48b9-a7fe-0df558ff113a', 'd4f10f65-09f2-44e0-a184-84ae5d6d6c45' ], criticalCompetencyIds: [ 'd4f10f65-09f2-44e0-a184-84ae5d6d6c45' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '7944a17b-d7e5-4459-a34b-f1e5040d8bdb', '9f34278c-3072-48b9-a7fe-0df558ff113a', 'd4f10f65-09f2-44e0-a184-84ae5d6d6c45', '19187728-5d06-4ca3-a2e6-61442c80c53a', '48a48609-58c2-47bf-ae36-7f7e68a49cd5' ], criticalCompetencyIds: [ '19187728-5d06-4ca3-a2e6-61442c80c53a', '48a48609-58c2-47bf-ae36-7f7e68a49cd5' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '7944a17b-d7e5-4459-a34b-f1e5040d8bdb', '9f34278c-3072-48b9-a7fe-0df558ff113a', 'd4f10f65-09f2-44e0-a184-84ae5d6d6c45', '19187728-5d06-4ca3-a2e6-61442c80c53a', '48a48609-58c2-47bf-ae36-7f7e68a49cd5', 'a52a6009-3a52-42b9-afa7-96eb0556b3d6' ], criticalCompetencyIds: [ '48a48609-58c2-47bf-ae36-7f7e68a49cd5', 'a52a6009-3a52-42b9-afa7-96eb0556b3d6' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Machine Learning',
      INTERMEDIATE: 'Independent execution of bounded Machine Learning tasks',
      ADVANCED: 'Owns Machine Learning components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Machine Learning at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING': {
    skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
    name: 'Deep Learning',
    domain: 'SOFTWARE_IT',
    category: 'AI, ML & Data Science',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '6293d1b6-385a-4bc2-a2d9-4089f922e31f',
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        capability: 'Neural network fundamentals & backpropagation',
        observableBehaviours: [
          'Explains neural network fundamentals & backpropagation accurately under assessment conditions',
          'Applies neural network fundamentals & backpropagation to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates neural network fundamentals & backpropagation in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'e75fc9b2-fba8-42c0-a336-7e9b7b0f425d',
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        capability: 'CNN/RNN/Transformer architecture basics',
        observableBehaviours: [
          'Explains cnn/rnn/transformer architecture basics accurately under assessment conditions',
          'Applies cnn/rnn/transformer architecture basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates cnn/rnn/transformer architecture basics in timed assessment items',
        ],
        prerequisites: [ '6293d1b6-385a-4bc2-a2d9-4089f922e31f' ],
        role: 'core',
      },
      {
        competencyId: '9db9c76b-3cd3-4f29-a47b-26c2e0bad5e8',
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        capability: 'Training loops, optimizers & regularization',
        observableBehaviours: [
          'Explains training loops, optimizers & regularization accurately under assessment conditions',
          'Applies training loops, optimizers & regularization to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates training loops, optimizers & regularization in timed assessment items',
        ],
        prerequisites: [ 'e75fc9b2-fba8-42c0-a336-7e9b7b0f425d' ],
        role: 'supporting',
      },
      {
        competencyId: 'f091950d-dc16-4ca2-a766-2584e14a1426',
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        capability: 'Transfer learning & fine-tuning workflows',
        observableBehaviours: [
          'Explains transfer learning & fine-tuning workflows accurately under assessment conditions',
          'Applies transfer learning & fine-tuning workflows to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates transfer learning & fine-tuning workflows in timed assessment items',
        ],
        prerequisites: [ '9db9c76b-3cd3-4f29-a47b-26c2e0bad5e8' ],
        role: 'critical',
      },
      {
        competencyId: '1ce2a779-f70e-4e6a-a409-5f1860a74228',
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        capability: 'GPU utilization, mixed precision & debugging',
        observableBehaviours: [
          'Explains gpu utilization, mixed precision & debugging accurately under assessment conditions',
          'Applies gpu utilization, mixed precision & debugging to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates gpu utilization, mixed precision & debugging in timed assessment items',
        ],
        prerequisites: [ 'f091950d-dc16-4ca2-a766-2584e14a1426' ],
        role: 'critical',
      },
      {
        competencyId: '1e0a9fd0-e41b-4e12-a70c-b12d6ca30a4d',
        skillCode: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING',
        capability: 'Deep learning production architecture',
        observableBehaviours: [
          'Explains deep learning production architecture accurately under assessment conditions',
          'Applies deep learning production architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates deep learning production architecture in timed assessment items',
        ],
        prerequisites: [ '1ce2a779-f70e-4e6a-a409-5f1860a74228' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '6293d1b6-385a-4bc2-a2d9-4089f922e31f' ], criticalCompetencyIds: [ '6293d1b6-385a-4bc2-a2d9-4089f922e31f' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '6293d1b6-385a-4bc2-a2d9-4089f922e31f', 'e75fc9b2-fba8-42c0-a336-7e9b7b0f425d', '9db9c76b-3cd3-4f29-a47b-26c2e0bad5e8' ], criticalCompetencyIds: [ '9db9c76b-3cd3-4f29-a47b-26c2e0bad5e8' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '6293d1b6-385a-4bc2-a2d9-4089f922e31f', 'e75fc9b2-fba8-42c0-a336-7e9b7b0f425d', '9db9c76b-3cd3-4f29-a47b-26c2e0bad5e8', 'f091950d-dc16-4ca2-a766-2584e14a1426', '1ce2a779-f70e-4e6a-a409-5f1860a74228' ], criticalCompetencyIds: [ 'f091950d-dc16-4ca2-a766-2584e14a1426', '1ce2a779-f70e-4e6a-a409-5f1860a74228' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '6293d1b6-385a-4bc2-a2d9-4089f922e31f', 'e75fc9b2-fba8-42c0-a336-7e9b7b0f425d', '9db9c76b-3cd3-4f29-a47b-26c2e0bad5e8', 'f091950d-dc16-4ca2-a766-2584e14a1426', '1ce2a779-f70e-4e6a-a409-5f1860a74228', '1e0a9fd0-e41b-4e12-a70c-b12d6ca30a4d' ], criticalCompetencyIds: [ '1ce2a779-f70e-4e6a-a409-5f1860a74228', '1e0a9fd0-e41b-4e12-a70c-b12d6ca30a4d' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Deep Learning',
      INTERMEDIATE: 'Independent execution of bounded Deep Learning tasks',
      ADVANCED: 'Owns Deep Learning components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Deep Learning at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'NATURAL_LANGUAGE_PROCESSING_NLP': {
    skillCode: 'NATURAL_LANGUAGE_PROCESSING_NLP',
    name: 'NLP',
    domain: 'SOFTWARE_IT',
    category: 'AI, ML & Data Science',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '29c6f7eb-0742-427d-ad4e-fd44c8df5181',
        skillCode: 'NATURAL_LANGUAGE_PROCESSING_NLP',
        capability: 'Text preprocessing & tokenization',
        observableBehaviours: [
          'Explains text preprocessing & tokenization accurately under assessment conditions',
          'Applies text preprocessing & tokenization to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates text preprocessing & tokenization in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'd3194ee5-7889-459d-a773-ed37d90e8c02',
        skillCode: 'NATURAL_LANGUAGE_PROCESSING_NLP',
        capability: 'Embeddings, classical NLP & evaluation metrics',
        observableBehaviours: [
          'Explains embeddings, classical nlp & evaluation metrics accurately under assessment conditions',
          'Applies embeddings, classical nlp & evaluation metrics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates embeddings, classical nlp & evaluation metrics in timed assessment items',
        ],
        prerequisites: [ '29c6f7eb-0742-427d-ad4e-fd44c8df5181' ],
        role: 'core',
      },
      {
        competencyId: '70e1a8ee-469e-4648-a57b-96ca4d30654b',
        skillCode: 'NATURAL_LANGUAGE_PROCESSING_NLP',
        capability: 'Sequence models & transformer architectures',
        observableBehaviours: [
          'Explains sequence models & transformer architectures accurately under assessment conditions',
          'Applies sequence models & transformer architectures to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates sequence models & transformer architectures in timed assessment items',
        ],
        prerequisites: [ 'd3194ee5-7889-459d-a773-ed37d90e8c02' ],
        role: 'supporting',
      },
      {
        competencyId: '3835522b-2d4c-44c5-a90e-9b942355e4c3',
        skillCode: 'NATURAL_LANGUAGE_PROCESSING_NLP',
        capability: 'Fine-tuning LLMs for NLP tasks',
        observableBehaviours: [
          'Explains fine-tuning llms for nlp tasks accurately under assessment conditions',
          'Applies fine-tuning llms for nlp tasks to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates fine-tuning llms for nlp tasks in timed assessment items',
        ],
        prerequisites: [ '70e1a8ee-469e-4648-a57b-96ca4d30654b' ],
        role: 'critical',
      },
      {
        competencyId: '3ddea190-abce-490c-a79a-c9f905c080f2',
        skillCode: 'NATURAL_LANGUAGE_PROCESSING_NLP',
        capability: 'RAG, prompt engineering & guardrails',
        observableBehaviours: [
          'Explains rag, prompt engineering & guardrails accurately under assessment conditions',
          'Applies rag, prompt engineering & guardrails to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates rag, prompt engineering & guardrails in timed assessment items',
        ],
        prerequisites: [ '3835522b-2d4c-44c5-a90e-9b942355e4c3' ],
        role: 'critical',
      },
      {
        competencyId: '430efde4-e291-4077-ade4-3fcf0b707b4e',
        skillCode: 'NATURAL_LANGUAGE_PROCESSING_NLP',
        capability: 'NLP application architecture in production',
        observableBehaviours: [
          'Explains nlp application architecture in production accurately under assessment conditions',
          'Applies nlp application architecture in production to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates nlp application architecture in production in timed assessment items',
        ],
        prerequisites: [ '3ddea190-abce-490c-a79a-c9f905c080f2' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '29c6f7eb-0742-427d-ad4e-fd44c8df5181' ], criticalCompetencyIds: [ '29c6f7eb-0742-427d-ad4e-fd44c8df5181' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '29c6f7eb-0742-427d-ad4e-fd44c8df5181', 'd3194ee5-7889-459d-a773-ed37d90e8c02', '70e1a8ee-469e-4648-a57b-96ca4d30654b' ], criticalCompetencyIds: [ '70e1a8ee-469e-4648-a57b-96ca4d30654b' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '29c6f7eb-0742-427d-ad4e-fd44c8df5181', 'd3194ee5-7889-459d-a773-ed37d90e8c02', '70e1a8ee-469e-4648-a57b-96ca4d30654b', '3835522b-2d4c-44c5-a90e-9b942355e4c3', '3ddea190-abce-490c-a79a-c9f905c080f2' ], criticalCompetencyIds: [ '3835522b-2d4c-44c5-a90e-9b942355e4c3', '3ddea190-abce-490c-a79a-c9f905c080f2' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '29c6f7eb-0742-427d-ad4e-fd44c8df5181', 'd3194ee5-7889-459d-a773-ed37d90e8c02', '70e1a8ee-469e-4648-a57b-96ca4d30654b', '3835522b-2d4c-44c5-a90e-9b942355e4c3', '3ddea190-abce-490c-a79a-c9f905c080f2', '430efde4-e291-4077-ade4-3fcf0b707b4e' ], criticalCompetencyIds: [ '3ddea190-abce-490c-a79a-c9f905c080f2', '430efde4-e291-4077-ade4-3fcf0b707b4e' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of NLP',
      INTERMEDIATE: 'Independent execution of bounded NLP tasks',
      ADVANCED: 'Owns NLP components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for NLP at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING': {
    skillCode: 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
    name: 'LLM Engineering',
    domain: 'SOFTWARE_IT',
    category: 'AI, ML & Data Science',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'fea5a5d9-2971-429a-a62b-f630ca5d4d99',
        skillCode: 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
        capability: 'LLM capabilities, limits & safety basics',
        observableBehaviours: [
          'Explains llm capabilities, limits & safety basics accurately under assessment conditions',
          'Applies llm capabilities, limits & safety basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates llm capabilities, limits & safety basics in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'dcd55a20-e027-4bfa-a040-62596fb059f9',
        skillCode: 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
        capability: 'Prompt design, chaining & tool use',
        observableBehaviours: [
          'Explains prompt design, chaining & tool use accurately under assessment conditions',
          'Applies prompt design, chaining & tool use to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates prompt design, chaining & tool use in timed assessment items',
        ],
        prerequisites: [ 'fea5a5d9-2971-429a-a62b-f630ca5d4d99' ],
        role: 'core',
      },
      {
        competencyId: '550da4be-333c-469b-a37f-2ab42b0676d6',
        skillCode: 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
        capability: 'RAG pipelines, vector stores & retrieval',
        observableBehaviours: [
          'Explains rag pipelines, vector stores & retrieval accurately under assessment conditions',
          'Applies rag pipelines, vector stores & retrieval to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates rag pipelines, vector stores & retrieval in timed assessment items',
        ],
        prerequisites: [ 'dcd55a20-e027-4bfa-a040-62596fb059f9' ],
        role: 'supporting',
      },
      {
        competencyId: '573f57eb-d22d-4012-a764-ecd4f2a70f1c',
        skillCode: 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
        capability: 'Fine-tuning, adapters & evaluation harnesses',
        observableBehaviours: [
          'Explains fine-tuning, adapters & evaluation harnesses accurately under assessment conditions',
          'Applies fine-tuning, adapters & evaluation harnesses to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates fine-tuning, adapters & evaluation harnesses in timed assessment items',
        ],
        prerequisites: [ '550da4be-333c-469b-a37f-2ab42b0676d6' ],
        role: 'critical',
      },
      {
        competencyId: '2779d61d-0783-4197-ac50-d24a667a0fb0',
        skillCode: 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
        capability: 'Latency, cost & caching strategies',
        observableBehaviours: [
          'Explains latency, cost & caching strategies accurately under assessment conditions',
          'Applies latency, cost & caching strategies to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates latency, cost & caching strategies in timed assessment items',
        ],
        prerequisites: [ '573f57eb-d22d-4012-a764-ecd4f2a70f1c' ],
        role: 'critical',
      },
      {
        competencyId: '39fa9d9d-9422-4a16-aff5-63d2e86e6fdf',
        skillCode: 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING',
        capability: 'LLM application architecture at scale',
        observableBehaviours: [
          'Explains llm application architecture at scale accurately under assessment conditions',
          'Applies llm application architecture at scale to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates llm application architecture at scale in timed assessment items',
        ],
        prerequisites: [ '2779d61d-0783-4197-ac50-d24a667a0fb0' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'fea5a5d9-2971-429a-a62b-f630ca5d4d99' ], criticalCompetencyIds: [ 'fea5a5d9-2971-429a-a62b-f630ca5d4d99' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'fea5a5d9-2971-429a-a62b-f630ca5d4d99', 'dcd55a20-e027-4bfa-a040-62596fb059f9', '550da4be-333c-469b-a37f-2ab42b0676d6' ], criticalCompetencyIds: [ '550da4be-333c-469b-a37f-2ab42b0676d6' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'fea5a5d9-2971-429a-a62b-f630ca5d4d99', 'dcd55a20-e027-4bfa-a040-62596fb059f9', '550da4be-333c-469b-a37f-2ab42b0676d6', '573f57eb-d22d-4012-a764-ecd4f2a70f1c', '2779d61d-0783-4197-ac50-d24a667a0fb0' ], criticalCompetencyIds: [ '573f57eb-d22d-4012-a764-ecd4f2a70f1c', '2779d61d-0783-4197-ac50-d24a667a0fb0' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'fea5a5d9-2971-429a-a62b-f630ca5d4d99', 'dcd55a20-e027-4bfa-a040-62596fb059f9', '550da4be-333c-469b-a37f-2ab42b0676d6', '573f57eb-d22d-4012-a764-ecd4f2a70f1c', '2779d61d-0783-4197-ac50-d24a667a0fb0', '39fa9d9d-9422-4a16-aff5-63d2e86e6fdf' ], criticalCompetencyIds: [ '2779d61d-0783-4197-ac50-d24a667a0fb0', '39fa9d9d-9422-4a16-aff5-63d2e86e6fdf' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of LLM Engineering',
      INTERMEDIATE: 'Independent execution of bounded LLM Engineering tasks',
      ADVANCED: 'Owns LLM Engineering components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for LLM Engineering at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'MLOPS_MODEL_LIFECYCLE_MANAGEMENT': {
    skillCode: 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
    name: 'MLOps',
    domain: 'SOFTWARE_IT',
    category: 'AI, ML & Data Science',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'd2ec2c06-df20-471c-a37e-12df1a7bf261',
        skillCode: 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
        capability: 'MLOps principles & experiment tracking',
        observableBehaviours: [
          'Explains mlops principles & experiment tracking accurately under assessment conditions',
          'Applies mlops principles & experiment tracking to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates mlops principles & experiment tracking in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '04f9c438-709b-40ec-a490-450a2f18574b',
        skillCode: 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
        capability: 'Feature stores & reproducible pipelines',
        observableBehaviours: [
          'Explains feature stores & reproducible pipelines accurately under assessment conditions',
          'Applies feature stores & reproducible pipelines to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates feature stores & reproducible pipelines in timed assessment items',
        ],
        prerequisites: [ 'd2ec2c06-df20-471c-a37e-12df1a7bf261' ],
        role: 'core',
      },
      {
        competencyId: '5b099c9b-9cc3-4f4f-ae9c-317a5e4d2a27',
        skillCode: 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
        capability: 'CI/CD for models & automated validation',
        observableBehaviours: [
          'Explains ci/cd for models & automated validation accurately under assessment conditions',
          'Applies ci/cd for models & automated validation to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates ci/cd for models & automated validation in timed assessment items',
        ],
        prerequisites: [ '04f9c438-709b-40ec-a490-450a2f18574b' ],
        role: 'supporting',
      },
      {
        competencyId: '9d1204ad-a9cb-464f-a8ed-47faa33b452f',
        skillCode: 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
        capability: 'Model registry, promotion & rollback',
        observableBehaviours: [
          'Explains model registry, promotion & rollback accurately under assessment conditions',
          'Applies model registry, promotion & rollback to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates model registry, promotion & rollback in timed assessment items',
        ],
        prerequisites: [ '5b099c9b-9cc3-4f4f-ae9c-317a5e4d2a27' ],
        role: 'critical',
      },
      {
        competencyId: 'b10c3723-136a-4c94-a49d-662e0ff06383',
        skillCode: 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
        capability: 'Production monitoring & drift detection',
        observableBehaviours: [
          'Explains production monitoring & drift detection accurately under assessment conditions',
          'Applies production monitoring & drift detection to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates production monitoring & drift detection in timed assessment items',
        ],
        prerequisites: [ '9d1204ad-a9cb-464f-a8ed-47faa33b452f' ],
        role: 'critical',
      },
      {
        competencyId: '031b377e-7d41-45f3-adae-fa053dfd605d',
        skillCode: 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
        capability: 'MLOps platform architecture',
        observableBehaviours: [
          'Explains mlops platform architecture accurately under assessment conditions',
          'Applies mlops platform architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates mlops platform architecture in timed assessment items',
        ],
        prerequisites: [ 'b10c3723-136a-4c94-a49d-662e0ff06383' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'd2ec2c06-df20-471c-a37e-12df1a7bf261' ], criticalCompetencyIds: [ 'd2ec2c06-df20-471c-a37e-12df1a7bf261' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'd2ec2c06-df20-471c-a37e-12df1a7bf261', '04f9c438-709b-40ec-a490-450a2f18574b', '5b099c9b-9cc3-4f4f-ae9c-317a5e4d2a27' ], criticalCompetencyIds: [ '5b099c9b-9cc3-4f4f-ae9c-317a5e4d2a27' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'd2ec2c06-df20-471c-a37e-12df1a7bf261', '04f9c438-709b-40ec-a490-450a2f18574b', '5b099c9b-9cc3-4f4f-ae9c-317a5e4d2a27', '9d1204ad-a9cb-464f-a8ed-47faa33b452f', 'b10c3723-136a-4c94-a49d-662e0ff06383' ], criticalCompetencyIds: [ '9d1204ad-a9cb-464f-a8ed-47faa33b452f', 'b10c3723-136a-4c94-a49d-662e0ff06383' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'd2ec2c06-df20-471c-a37e-12df1a7bf261', '04f9c438-709b-40ec-a490-450a2f18574b', '5b099c9b-9cc3-4f4f-ae9c-317a5e4d2a27', '9d1204ad-a9cb-464f-a8ed-47faa33b452f', 'b10c3723-136a-4c94-a49d-662e0ff06383', '031b377e-7d41-45f3-adae-fa053dfd605d' ], criticalCompetencyIds: [ 'b10c3723-136a-4c94-a49d-662e0ff06383', '031b377e-7d41-45f3-adae-fa053dfd605d' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of MLOps',
      INTERMEDIATE: 'Independent execution of bounded MLOps tasks',
      ADVANCED: 'Owns MLOps components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for MLOps at org scale',
    },
    assessmentBlueprint: 'SDE_DEPLOYMENT_CICD',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'COMPUTER_VISION_ENGINEERING': {
    skillCode: 'COMPUTER_VISION_ENGINEERING',
    name: 'Computer Vision',
    domain: 'SOFTWARE_IT',
    category: 'AI, ML & Data Science',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'b8df58c7-2b7d-48df-aa2b-220d302fbbf6',
        skillCode: 'COMPUTER_VISION_ENGINEERING',
        capability: 'Image representation, preprocessing & augmentation',
        observableBehaviours: [
          'Explains image representation, preprocessing & augmentation accurately under assessment conditions',
          'Applies image representation, preprocessing & augmentation to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates image representation, preprocessing & augmentation in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'ef0e51e9-26d7-408e-acbb-cfe096f9a880',
        skillCode: 'COMPUTER_VISION_ENGINEERING',
        capability: 'Classical CV: filters, features & edge detection',
        observableBehaviours: [
          'Explains classical cv: filters, features & edge detection accurately under assessment conditions',
          'Applies classical cv: filters, features & edge detection to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates classical cv: filters, features & edge detection in timed assessment items',
        ],
        prerequisites: [ 'b8df58c7-2b7d-48df-aa2b-220d302fbbf6' ],
        role: 'core',
      },
      {
        competencyId: 'ac81206d-9a3b-4efd-a7f0-8d4562c8f585',
        skillCode: 'COMPUTER_VISION_ENGINEERING',
        capability: 'CNN architectures, transfer learning & fine-tuning',
        observableBehaviours: [
          'Explains cnn architectures, transfer learning & fine-tuning accurately under assessment conditions',
          'Applies cnn architectures, transfer learning & fine-tuning to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates cnn architectures, transfer learning & fine-tuning in timed assessment items',
        ],
        prerequisites: [ 'ef0e51e9-26d7-408e-acbb-cfe096f9a880' ],
        role: 'supporting',
      },
      {
        competencyId: '55ab40ac-b992-4e74-a89e-944173e41c30',
        skillCode: 'COMPUTER_VISION_ENGINEERING',
        capability: 'Object detection, segmentation & tracking',
        observableBehaviours: [
          'Explains object detection, segmentation & tracking accurately under assessment conditions',
          'Applies object detection, segmentation & tracking to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates object detection, segmentation & tracking in timed assessment items',
        ],
        prerequisites: [ 'ac81206d-9a3b-4efd-a7f0-8d4562c8f585' ],
        role: 'critical',
      },
      {
        competencyId: '1e240bc3-4134-4179-a793-d3362a2ac3be',
        skillCode: 'COMPUTER_VISION_ENGINEERING',
        capability: 'Model evaluation metrics & deployment pipelines',
        observableBehaviours: [
          'Explains model evaluation metrics & deployment pipelines accurately under assessment conditions',
          'Applies model evaluation metrics & deployment pipelines to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates model evaluation metrics & deployment pipelines in timed assessment items',
        ],
        prerequisites: [ '55ab40ac-b992-4e74-a89e-944173e41c30' ],
        role: 'critical',
      },
      {
        competencyId: 'da5b0aaa-1150-4b79-a52f-40b59a38a890',
        skillCode: 'COMPUTER_VISION_ENGINEERING',
        capability: 'End-to-end computer vision system design',
        observableBehaviours: [
          'Explains end-to-end computer vision system design accurately under assessment conditions',
          'Applies end-to-end computer vision system design to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates end-to-end computer vision system design in timed assessment items',
        ],
        prerequisites: [ '1e240bc3-4134-4179-a793-d3362a2ac3be' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'b8df58c7-2b7d-48df-aa2b-220d302fbbf6' ], criticalCompetencyIds: [ 'b8df58c7-2b7d-48df-aa2b-220d302fbbf6' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'b8df58c7-2b7d-48df-aa2b-220d302fbbf6', 'ef0e51e9-26d7-408e-acbb-cfe096f9a880', 'ac81206d-9a3b-4efd-a7f0-8d4562c8f585' ], criticalCompetencyIds: [ 'ac81206d-9a3b-4efd-a7f0-8d4562c8f585' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'b8df58c7-2b7d-48df-aa2b-220d302fbbf6', 'ef0e51e9-26d7-408e-acbb-cfe096f9a880', 'ac81206d-9a3b-4efd-a7f0-8d4562c8f585', '55ab40ac-b992-4e74-a89e-944173e41c30', '1e240bc3-4134-4179-a793-d3362a2ac3be' ], criticalCompetencyIds: [ '55ab40ac-b992-4e74-a89e-944173e41c30', '1e240bc3-4134-4179-a793-d3362a2ac3be' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'b8df58c7-2b7d-48df-aa2b-220d302fbbf6', 'ef0e51e9-26d7-408e-acbb-cfe096f9a880', 'ac81206d-9a3b-4efd-a7f0-8d4562c8f585', '55ab40ac-b992-4e74-a89e-944173e41c30', '1e240bc3-4134-4179-a793-d3362a2ac3be', 'da5b0aaa-1150-4b79-a52f-40b59a38a890' ], criticalCompetencyIds: [ '1e240bc3-4134-4179-a793-d3362a2ac3be', 'da5b0aaa-1150-4b79-a52f-40b59a38a890' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Computer Vision',
      INTERMEDIATE: 'Independent execution of bounded Computer Vision tasks',
      ADVANCED: 'Owns Computer Vision components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Computer Vision at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'STATISTICAL_ANALYSIS_EXPERIMENTATION': {
    skillCode: 'STATISTICAL_ANALYSIS_EXPERIMENTATION',
    name: 'Statistics & A/B Testing',
    domain: 'SOFTWARE_IT',
    category: 'AI, ML & Data Science',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'e80b2287-25e6-45bd-af37-a296b1bad6ed',
        skillCode: 'STATISTICAL_ANALYSIS_EXPERIMENTATION',
        capability: 'Descriptive stats & probability distributions',
        observableBehaviours: [
          'Explains descriptive stats & probability distributions accurately under assessment conditions',
          'Applies descriptive stats & probability distributions to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates descriptive stats & probability distributions in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '36ca22e9-c1a7-4669-acf1-72006357d4c7',
        skillCode: 'STATISTICAL_ANALYSIS_EXPERIMENTATION',
        capability: 'Hypothesis testing & confidence intervals',
        observableBehaviours: [
          'Explains hypothesis testing & confidence intervals accurately under assessment conditions',
          'Applies hypothesis testing & confidence intervals to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates hypothesis testing & confidence intervals in timed assessment items',
        ],
        prerequisites: [ 'e80b2287-25e6-45bd-af37-a296b1bad6ed' ],
        role: 'core',
      },
      {
        competencyId: 'c7cbe89b-6496-4bc0-aa47-f69514fa0bc2',
        skillCode: 'STATISTICAL_ANALYSIS_EXPERIMENTATION',
        capability: 'Regression, ANOVA & experimental design',
        observableBehaviours: [
          'Explains regression, anova & experimental design accurately under assessment conditions',
          'Applies regression, anova & experimental design to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates regression, anova & experimental design in timed assessment items',
        ],
        prerequisites: [ '36ca22e9-c1a7-4669-acf1-72006357d4c7' ],
        role: 'supporting',
      },
      {
        competencyId: 'e40e8542-6b4a-47c3-aebc-7fb54c08c5b5',
        skillCode: 'STATISTICAL_ANALYSIS_EXPERIMENTATION',
        capability: 'A/B testing, power analysis & sample size',
        observableBehaviours: [
          'Explains a/b testing, power analysis & sample size accurately under assessment conditions',
          'Applies a/b testing, power analysis & sample size to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates a/b testing, power analysis & sample size in timed assessment items',
        ],
        prerequisites: [ 'c7cbe89b-6496-4bc0-aa47-f69514fa0bc2' ],
        role: 'critical',
      },
      {
        competencyId: 'b9203bab-2916-4911-ad6f-71c0a4a80263',
        skillCode: 'STATISTICAL_ANALYSIS_EXPERIMENTATION',
        capability: 'Causal inference & confounding control',
        observableBehaviours: [
          'Explains causal inference & confounding control accurately under assessment conditions',
          'Applies causal inference & confounding control to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates causal inference & confounding control in timed assessment items',
        ],
        prerequisites: [ 'e40e8542-6b4a-47c3-aebc-7fb54c08c5b5' ],
        role: 'critical',
      },
      {
        competencyId: '81af7e4f-c8fd-4fa1-acc2-47f5f84e32b0',
        skillCode: 'STATISTICAL_ANALYSIS_EXPERIMENTATION',
        capability: 'Experimentation platform & analytics governance',
        observableBehaviours: [
          'Explains experimentation platform & analytics governance accurately under assessment conditions',
          'Applies experimentation platform & analytics governance to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates experimentation platform & analytics governance in timed assessment items',
        ],
        prerequisites: [ 'b9203bab-2916-4911-ad6f-71c0a4a80263' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'e80b2287-25e6-45bd-af37-a296b1bad6ed' ], criticalCompetencyIds: [ 'e80b2287-25e6-45bd-af37-a296b1bad6ed' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'e80b2287-25e6-45bd-af37-a296b1bad6ed', '36ca22e9-c1a7-4669-acf1-72006357d4c7', 'c7cbe89b-6496-4bc0-aa47-f69514fa0bc2' ], criticalCompetencyIds: [ 'c7cbe89b-6496-4bc0-aa47-f69514fa0bc2' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'e80b2287-25e6-45bd-af37-a296b1bad6ed', '36ca22e9-c1a7-4669-acf1-72006357d4c7', 'c7cbe89b-6496-4bc0-aa47-f69514fa0bc2', 'e40e8542-6b4a-47c3-aebc-7fb54c08c5b5', 'b9203bab-2916-4911-ad6f-71c0a4a80263' ], criticalCompetencyIds: [ 'e40e8542-6b4a-47c3-aebc-7fb54c08c5b5', 'b9203bab-2916-4911-ad6f-71c0a4a80263' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'e80b2287-25e6-45bd-af37-a296b1bad6ed', '36ca22e9-c1a7-4669-acf1-72006357d4c7', 'c7cbe89b-6496-4bc0-aa47-f69514fa0bc2', 'e40e8542-6b4a-47c3-aebc-7fb54c08c5b5', 'b9203bab-2916-4911-ad6f-71c0a4a80263', '81af7e4f-c8fd-4fa1-acc2-47f5f84e32b0' ], criticalCompetencyIds: [ 'b9203bab-2916-4911-ad6f-71c0a4a80263', '81af7e4f-c8fd-4fa1-acc2-47f5f84e32b0' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Statistics & A/B Testing',
      INTERMEDIATE: 'Independent execution of bounded Statistics & A/B Testing tasks',
      ADVANCED: 'Owns Statistics & A/B Testing components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Statistics & A/B Testing at org scale',
    },
    assessmentBlueprint: 'SDE_PROGRAMMING_FUNDAMENTALS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'APPLICATION_SECURITY_APPSEC': {
    skillCode: 'APPLICATION_SECURITY_APPSEC',
    name: 'Application Security',
    domain: 'SOFTWARE_IT',
    category: 'Cybersecurity',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '6e8c8a9a-be32-4111-a516-4a43d4ffa649',
        skillCode: 'APPLICATION_SECURITY_APPSEC',
        capability: 'OWASP Top 10 & secure SDLC basics',
        observableBehaviours: [
          'Explains owasp top 10 & secure sdlc basics accurately under assessment conditions',
          'Applies owasp top 10 & secure sdlc basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates owasp top 10 & secure sdlc basics in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'd9a187a5-1f52-4d8b-af81-f99fb44d8c97',
        skillCode: 'APPLICATION_SECURITY_APPSEC',
        capability: 'Input validation, XSS & injection prevention',
        observableBehaviours: [
          'Explains input validation, xss & injection prevention accurately under assessment conditions',
          'Applies input validation, xss & injection prevention to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates input validation, xss & injection prevention in timed assessment items',
        ],
        prerequisites: [ '6e8c8a9a-be32-4111-a516-4a43d4ffa649' ],
        role: 'core',
      },
      {
        competencyId: '2ac4f708-c493-4d7e-a3f3-fdccfd4139c5',
        skillCode: 'APPLICATION_SECURITY_APPSEC',
        capability: 'Authentication, session & CSRF defenses',
        observableBehaviours: [
          'Explains authentication, session & csrf defenses accurately under assessment conditions',
          'Applies authentication, session & csrf defenses to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates authentication, session & csrf defenses in timed assessment items',
        ],
        prerequisites: [ 'd9a187a5-1f52-4d8b-af81-f99fb44d8c97' ],
        role: 'supporting',
      },
      {
        competencyId: 'f866f404-7b32-4886-a6d9-9c9720220af5',
        skillCode: 'APPLICATION_SECURITY_APPSEC',
        capability: 'Secure coding reviews & SAST/DAST tooling',
        observableBehaviours: [
          'Explains secure coding reviews & sast/dast tooling accurately under assessment conditions',
          'Applies secure coding reviews & sast/dast tooling to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates secure coding reviews & sast/dast tooling in timed assessment items',
        ],
        prerequisites: [ '2ac4f708-c493-4d7e-a3f3-fdccfd4139c5' ],
        role: 'critical',
      },
      {
        competencyId: '91661917-0146-4fd3-addf-6a2322275a6f',
        skillCode: 'APPLICATION_SECURITY_APPSEC',
        capability: 'Secrets management & dependency scanning',
        observableBehaviours: [
          'Explains secrets management & dependency scanning accurately under assessment conditions',
          'Applies secrets management & dependency scanning to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates secrets management & dependency scanning in timed assessment items',
        ],
        prerequisites: [ 'f866f404-7b32-4886-a6d9-9c9720220af5' ],
        role: 'critical',
      },
      {
        competencyId: '374bbe65-6916-45fc-a9a7-a0e2f4b7ac52',
        skillCode: 'APPLICATION_SECURITY_APPSEC',
        capability: 'Application security architecture & threat modeling',
        observableBehaviours: [
          'Explains application security architecture & threat modeling accurately under assessment conditions',
          'Applies application security architecture & threat modeling to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates application security architecture & threat modeling in timed assessment items',
        ],
        prerequisites: [ '91661917-0146-4fd3-addf-6a2322275a6f' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '6e8c8a9a-be32-4111-a516-4a43d4ffa649' ], criticalCompetencyIds: [ '6e8c8a9a-be32-4111-a516-4a43d4ffa649' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '6e8c8a9a-be32-4111-a516-4a43d4ffa649', 'd9a187a5-1f52-4d8b-af81-f99fb44d8c97', '2ac4f708-c493-4d7e-a3f3-fdccfd4139c5' ], criticalCompetencyIds: [ '2ac4f708-c493-4d7e-a3f3-fdccfd4139c5' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '6e8c8a9a-be32-4111-a516-4a43d4ffa649', 'd9a187a5-1f52-4d8b-af81-f99fb44d8c97', '2ac4f708-c493-4d7e-a3f3-fdccfd4139c5', 'f866f404-7b32-4886-a6d9-9c9720220af5', '91661917-0146-4fd3-addf-6a2322275a6f' ], criticalCompetencyIds: [ 'f866f404-7b32-4886-a6d9-9c9720220af5', '91661917-0146-4fd3-addf-6a2322275a6f' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '6e8c8a9a-be32-4111-a516-4a43d4ffa649', 'd9a187a5-1f52-4d8b-af81-f99fb44d8c97', '2ac4f708-c493-4d7e-a3f3-fdccfd4139c5', 'f866f404-7b32-4886-a6d9-9c9720220af5', '91661917-0146-4fd3-addf-6a2322275a6f', '374bbe65-6916-45fc-a9a7-a0e2f4b7ac52' ], criticalCompetencyIds: [ '91661917-0146-4fd3-addf-6a2322275a6f', '374bbe65-6916-45fc-a9a7-a0e2f4b7ac52' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Application Security',
      INTERMEDIATE: 'Independent execution of bounded Application Security tasks',
      ADVANCED: 'Owns Application Security components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Application Security at org scale',
    },
    assessmentBlueprint: 'SDE_TESTING',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'CLOUD_SECURITY_ENGINEERING': {
    skillCode: 'CLOUD_SECURITY_ENGINEERING',
    name: 'Cloud Security',
    domain: 'SOFTWARE_IT',
    category: 'Cybersecurity',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'a1a9f1de-a69f-4bfb-acee-2bd9438d2fef',
        skillCode: 'CLOUD_SECURITY_ENGINEERING',
        capability: 'Shared responsibility model & cloud threats',
        observableBehaviours: [
          'Explains shared responsibility model & cloud threats accurately under assessment conditions',
          'Applies shared responsibility model & cloud threats to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates shared responsibility model & cloud threats in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'f3ac6e30-2128-478d-a38c-a068b60c85f9',
        skillCode: 'CLOUD_SECURITY_ENGINEERING',
        capability: 'IAM, least privilege & federation',
        observableBehaviours: [
          'Explains iam, least privilege & federation accurately under assessment conditions',
          'Applies iam, least privilege & federation to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates iam, least privilege & federation in timed assessment items',
        ],
        prerequisites: [ 'a1a9f1de-a69f-4bfb-acee-2bd9438d2fef' ],
        role: 'core',
      },
      {
        competencyId: '0c0bff0f-339d-4536-a287-a52002a0fa6b',
        skillCode: 'CLOUD_SECURITY_ENGINEERING',
        capability: 'Network segmentation & WAF/cloud armor',
        observableBehaviours: [
          'Explains network segmentation & waf/cloud armor accurately under assessment conditions',
          'Applies network segmentation & waf/cloud armor to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates network segmentation & waf/cloud armor in timed assessment items',
        ],
        prerequisites: [ 'f3ac6e30-2128-478d-a38c-a068b60c85f9' ],
        role: 'supporting',
      },
      {
        competencyId: 'd441c829-9780-4f42-a8f2-33f4dab6e509',
        skillCode: 'CLOUD_SECURITY_ENGINEERING',
        capability: 'Encryption at rest/in transit & KMS',
        observableBehaviours: [
          'Explains encryption at rest/in transit & kms accurately under assessment conditions',
          'Applies encryption at rest/in transit & kms to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates encryption at rest/in transit & kms in timed assessment items',
        ],
        prerequisites: [ '0c0bff0f-339d-4536-a287-a52002a0fa6b' ],
        role: 'critical',
      },
      {
        competencyId: '3eee9333-8912-4732-a566-2fd728a481e6',
        skillCode: 'CLOUD_SECURITY_ENGINEERING',
        capability: 'CSPM, misconfiguration detection & auditing',
        observableBehaviours: [
          'Explains cspm, misconfiguration detection & auditing accurately under assessment conditions',
          'Applies cspm, misconfiguration detection & auditing to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates cspm, misconfiguration detection & auditing in timed assessment items',
        ],
        prerequisites: [ 'd441c829-9780-4f42-a8f2-33f4dab6e509' ],
        role: 'critical',
      },
      {
        competencyId: '31988b85-20ca-4238-a41e-471eb67da82f',
        skillCode: 'CLOUD_SECURITY_ENGINEERING',
        capability: 'Cloud security reference architecture',
        observableBehaviours: [
          'Explains cloud security reference architecture accurately under assessment conditions',
          'Applies cloud security reference architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates cloud security reference architecture in timed assessment items',
        ],
        prerequisites: [ '3eee9333-8912-4732-a566-2fd728a481e6' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'a1a9f1de-a69f-4bfb-acee-2bd9438d2fef' ], criticalCompetencyIds: [ 'a1a9f1de-a69f-4bfb-acee-2bd9438d2fef' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'a1a9f1de-a69f-4bfb-acee-2bd9438d2fef', 'f3ac6e30-2128-478d-a38c-a068b60c85f9', '0c0bff0f-339d-4536-a287-a52002a0fa6b' ], criticalCompetencyIds: [ '0c0bff0f-339d-4536-a287-a52002a0fa6b' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'a1a9f1de-a69f-4bfb-acee-2bd9438d2fef', 'f3ac6e30-2128-478d-a38c-a068b60c85f9', '0c0bff0f-339d-4536-a287-a52002a0fa6b', 'd441c829-9780-4f42-a8f2-33f4dab6e509', '3eee9333-8912-4732-a566-2fd728a481e6' ], criticalCompetencyIds: [ 'd441c829-9780-4f42-a8f2-33f4dab6e509', '3eee9333-8912-4732-a566-2fd728a481e6' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'a1a9f1de-a69f-4bfb-acee-2bd9438d2fef', 'f3ac6e30-2128-478d-a38c-a068b60c85f9', '0c0bff0f-339d-4536-a287-a52002a0fa6b', 'd441c829-9780-4f42-a8f2-33f4dab6e509', '3eee9333-8912-4732-a566-2fd728a481e6', '31988b85-20ca-4238-a41e-471eb67da82f' ], criticalCompetencyIds: [ '3eee9333-8912-4732-a566-2fd728a481e6', '31988b85-20ca-4238-a41e-471eb67da82f' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Cloud Security',
      INTERMEDIATE: 'Independent execution of bounded Cloud Security tasks',
      ADVANCED: 'Owns Cloud Security components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Cloud Security at org scale',
    },
    assessmentBlueprint: 'SDE_TESTING',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT': {
    skillCode: 'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
    name: 'Penetration Testing',
    domain: 'SOFTWARE_IT',
    category: 'Cybersecurity',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'f96403b6-9ec4-46ae-abb2-f0447da2cba0',
        skillCode: 'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
        capability: 'Reconnaissance & vulnerability scanning',
        observableBehaviours: [
          'Explains reconnaissance & vulnerability scanning accurately under assessment conditions',
          'Applies reconnaissance & vulnerability scanning to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates reconnaissance & vulnerability scanning in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '48665b91-f9c2-43e2-afb4-8662851ab517',
        skillCode: 'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
        capability: 'Web app pentest methodology (OWASP WSTG)',
        observableBehaviours: [
          'Explains web app pentest methodology (owasp wstg) accurately under assessment conditions',
          'Applies web app pentest methodology (owasp wstg) to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates web app pentest methodology (owasp wstg) in timed assessment items',
        ],
        prerequisites: [ 'f96403b6-9ec4-46ae-abb2-f0447da2cba0' ],
        role: 'core',
      },
      {
        competencyId: 'f62a26f8-55ce-41d9-a589-47b487d506d8',
        skillCode: 'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
        capability: 'Network exploitation & privilege escalation',
        observableBehaviours: [
          'Explains network exploitation & privilege escalation accurately under assessment conditions',
          'Applies network exploitation & privilege escalation to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates network exploitation & privilege escalation in timed assessment items',
        ],
        prerequisites: [ '48665b91-f9c2-43e2-afb4-8662851ab517' ],
        role: 'supporting',
      },
      {
        competencyId: '1c6b676d-1189-47bc-a744-5c6f440f6c6a',
        skillCode: 'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
        capability: 'Reporting, CVSS scoring & remediation guidance',
        observableBehaviours: [
          'Explains reporting, cvss scoring & remediation guidance accurately under assessment conditions',
          'Applies reporting, cvss scoring & remediation guidance to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates reporting, cvss scoring & remediation guidance in timed assessment items',
        ],
        prerequisites: [ 'f62a26f8-55ce-41d9-a589-47b487d506d8' ],
        role: 'critical',
      },
      {
        competencyId: 'f58e8cb8-7c94-455e-acee-904ed9ebf063',
        skillCode: 'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
        capability: 'Red team tactics & social engineering awareness',
        observableBehaviours: [
          'Explains red team tactics & social engineering awareness accurately under assessment conditions',
          'Applies red team tactics & social engineering awareness to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates red team tactics & social engineering awareness in timed assessment items',
        ],
        prerequisites: [ '1c6b676d-1189-47bc-a744-5c6f440f6c6a' ],
        role: 'critical',
      },
      {
        competencyId: '6635d459-a4f3-4838-abe2-4b02d4026c44',
        skillCode: 'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
        capability: 'Offensive security program architecture',
        observableBehaviours: [
          'Explains offensive security program architecture accurately under assessment conditions',
          'Applies offensive security program architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates offensive security program architecture in timed assessment items',
        ],
        prerequisites: [ 'f58e8cb8-7c94-455e-acee-904ed9ebf063' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'f96403b6-9ec4-46ae-abb2-f0447da2cba0' ], criticalCompetencyIds: [ 'f96403b6-9ec4-46ae-abb2-f0447da2cba0' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'f96403b6-9ec4-46ae-abb2-f0447da2cba0', '48665b91-f9c2-43e2-afb4-8662851ab517', 'f62a26f8-55ce-41d9-a589-47b487d506d8' ], criticalCompetencyIds: [ 'f62a26f8-55ce-41d9-a589-47b487d506d8' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'f96403b6-9ec4-46ae-abb2-f0447da2cba0', '48665b91-f9c2-43e2-afb4-8662851ab517', 'f62a26f8-55ce-41d9-a589-47b487d506d8', '1c6b676d-1189-47bc-a744-5c6f440f6c6a', 'f58e8cb8-7c94-455e-acee-904ed9ebf063' ], criticalCompetencyIds: [ '1c6b676d-1189-47bc-a744-5c6f440f6c6a', 'f58e8cb8-7c94-455e-acee-904ed9ebf063' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'f96403b6-9ec4-46ae-abb2-f0447da2cba0', '48665b91-f9c2-43e2-afb4-8662851ab517', 'f62a26f8-55ce-41d9-a589-47b487d506d8', '1c6b676d-1189-47bc-a744-5c6f440f6c6a', 'f58e8cb8-7c94-455e-acee-904ed9ebf063', '6635d459-a4f3-4838-abe2-4b02d4026c44' ], criticalCompetencyIds: [ 'f58e8cb8-7c94-455e-acee-904ed9ebf063', '6635d459-a4f3-4838-abe2-4b02d4026c44' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Penetration Testing',
      INTERMEDIATE: 'Independent execution of bounded Penetration Testing tasks',
      ADVANCED: 'Owns Penetration Testing components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Penetration Testing at org scale',
    },
    assessmentBlueprint: 'SDE_TESTING',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'PERFORMANCE_LOAD_TESTING': {
    skillCode: 'PERFORMANCE_LOAD_TESTING',
    name: 'Performance Testing',
    domain: 'SOFTWARE_IT',
    category: 'Testing, QA & Reliability',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '2c67f934-b3ee-4a9c-a482-60dd75b7e086',
        skillCode: 'PERFORMANCE_LOAD_TESTING',
        capability: 'Performance testing types & objectives',
        observableBehaviours: [
          'Explains performance testing types & objectives accurately under assessment conditions',
          'Applies performance testing types & objectives to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates performance testing types & objectives in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'd47729ab-55c1-4c67-a297-8b993c1589d3',
        skillCode: 'PERFORMANCE_LOAD_TESTING',
        capability: 'Workload modeling & scenario design',
        observableBehaviours: [
          'Explains workload modeling & scenario design accurately under assessment conditions',
          'Applies workload modeling & scenario design to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates workload modeling & scenario design in timed assessment items',
        ],
        prerequisites: [ '2c67f934-b3ee-4a9c-a482-60dd75b7e086' ],
        role: 'core',
      },
      {
        competencyId: '127658bd-56c3-4df9-a9d2-19ddfc00d140',
        skillCode: 'PERFORMANCE_LOAD_TESTING',
        capability: 'Load/stress/soak test execution',
        observableBehaviours: [
          'Explains load/stress/soak test execution accurately under assessment conditions',
          'Applies load/stress/soak test execution to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates load/stress/soak test execution in timed assessment items',
        ],
        prerequisites: [ 'd47729ab-55c1-4c67-a297-8b993c1589d3' ],
        role: 'supporting',
      },
      {
        competencyId: '6abc6339-4d19-4995-a593-2cf71c18adff',
        skillCode: 'PERFORMANCE_LOAD_TESTING',
        capability: 'Metrics analysis & bottleneck identification',
        observableBehaviours: [
          'Explains metrics analysis & bottleneck identification accurately under assessment conditions',
          'Applies metrics analysis & bottleneck identification to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates metrics analysis & bottleneck identification in timed assessment items',
        ],
        prerequisites: [ '127658bd-56c3-4df9-a9d2-19ddfc00d140' ],
        role: 'critical',
      },
      {
        competencyId: '338e2b35-92de-49c1-a7ee-bf5068b12ee8',
        skillCode: 'PERFORMANCE_LOAD_TESTING',
        capability: 'Capacity planning from test results',
        observableBehaviours: [
          'Explains capacity planning from test results accurately under assessment conditions',
          'Applies capacity planning from test results to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates capacity planning from test results in timed assessment items',
        ],
        prerequisites: [ '6abc6339-4d19-4995-a593-2cf71c18adff' ],
        role: 'critical',
      },
      {
        competencyId: 'a0e9aff9-320a-4a60-a0d8-53b0c137a997',
        skillCode: 'PERFORMANCE_LOAD_TESTING',
        capability: 'Performance engineering program design',
        observableBehaviours: [
          'Explains performance engineering program design accurately under assessment conditions',
          'Applies performance engineering program design to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates performance engineering program design in timed assessment items',
        ],
        prerequisites: [ '338e2b35-92de-49c1-a7ee-bf5068b12ee8' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '2c67f934-b3ee-4a9c-a482-60dd75b7e086' ], criticalCompetencyIds: [ '2c67f934-b3ee-4a9c-a482-60dd75b7e086' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '2c67f934-b3ee-4a9c-a482-60dd75b7e086', 'd47729ab-55c1-4c67-a297-8b993c1589d3', '127658bd-56c3-4df9-a9d2-19ddfc00d140' ], criticalCompetencyIds: [ '127658bd-56c3-4df9-a9d2-19ddfc00d140' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '2c67f934-b3ee-4a9c-a482-60dd75b7e086', 'd47729ab-55c1-4c67-a297-8b993c1589d3', '127658bd-56c3-4df9-a9d2-19ddfc00d140', '6abc6339-4d19-4995-a593-2cf71c18adff', '338e2b35-92de-49c1-a7ee-bf5068b12ee8' ], criticalCompetencyIds: [ '6abc6339-4d19-4995-a593-2cf71c18adff', '338e2b35-92de-49c1-a7ee-bf5068b12ee8' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '2c67f934-b3ee-4a9c-a482-60dd75b7e086', 'd47729ab-55c1-4c67-a297-8b993c1589d3', '127658bd-56c3-4df9-a9d2-19ddfc00d140', '6abc6339-4d19-4995-a593-2cf71c18adff', '338e2b35-92de-49c1-a7ee-bf5068b12ee8', 'a0e9aff9-320a-4a60-a0d8-53b0c137a997' ], criticalCompetencyIds: [ '338e2b35-92de-49c1-a7ee-bf5068b12ee8', 'a0e9aff9-320a-4a60-a0d8-53b0c137a997' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Performance Testing',
      INTERMEDIATE: 'Independent execution of bounded Performance Testing tasks',
      ADVANCED: 'Owns Performance Testing components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Performance Testing at org scale',
    },
    assessmentBlueprint: 'SDE_TESTING',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'CONTINUOUS_TESTING_QUALITY_ENGINEERING': {
    skillCode: 'CONTINUOUS_TESTING_QUALITY_ENGINEERING',
    name: 'Quality Engineering',
    domain: 'SOFTWARE_IT',
    category: 'Testing, QA & Reliability',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '5906b9fd-6068-4a14-a344-7a4862ce2dc4',
        skillCode: 'CONTINUOUS_TESTING_QUALITY_ENGINEERING',
        capability: 'Shift-left testing & quality gates',
        observableBehaviours: [
          'Explains shift-left testing & quality gates accurately under assessment conditions',
          'Applies shift-left testing & quality gates to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates shift-left testing & quality gates in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '24cb47ae-92da-43f7-a9bd-2dda8da776dc',
        skillCode: 'CONTINUOUS_TESTING_QUALITY_ENGINEERING',
        capability: 'Test orchestration in CI/CD pipelines',
        observableBehaviours: [
          'Explains test orchestration in ci/cd pipelines accurately under assessment conditions',
          'Applies test orchestration in ci/cd pipelines to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates test orchestration in ci/cd pipelines in timed assessment items',
        ],
        prerequisites: [ '5906b9fd-6068-4a14-a344-7a4862ce2dc4' ],
        role: 'core',
      },
      {
        competencyId: '622ed24b-aae8-47f2-a0e5-68aa6618d8d9',
        skillCode: 'CONTINUOUS_TESTING_QUALITY_ENGINEERING',
        capability: 'Quality metrics & defect escape analysis',
        observableBehaviours: [
          'Explains quality metrics & defect escape analysis accurately under assessment conditions',
          'Applies quality metrics & defect escape analysis to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates quality metrics & defect escape analysis in timed assessment items',
        ],
        prerequisites: [ '24cb47ae-92da-43f7-a9bd-2dda8da776dc' ],
        role: 'supporting',
      },
      {
        competencyId: 'c7c65db9-a41f-4bf5-a7b1-7aeb792c6dd1',
        skillCode: 'CONTINUOUS_TESTING_QUALITY_ENGINEERING',
        capability: 'Test environment provisioning & service virtualization',
        observableBehaviours: [
          'Explains test environment provisioning & service virtualization accurately under assessment conditions',
          'Applies test environment provisioning & service virtualization to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates test environment provisioning & service virtualization in timed assessment items',
        ],
        prerequisites: [ '622ed24b-aae8-47f2-a0e5-68aa6618d8d9' ],
        role: 'critical',
      },
      {
        competencyId: '6cac7101-0d6f-44cd-a376-8e531397321b',
        skillCode: 'CONTINUOUS_TESTING_QUALITY_ENGINEERING',
        capability: 'Quality engineering coaching & standards',
        observableBehaviours: [
          'Explains quality engineering coaching & standards accurately under assessment conditions',
          'Applies quality engineering coaching & standards to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates quality engineering coaching & standards in timed assessment items',
        ],
        prerequisites: [ 'c7c65db9-a41f-4bf5-a7b1-7aeb792c6dd1' ],
        role: 'critical',
      },
      {
        competencyId: '9d59519b-f98e-4320-a73a-b104fae0b3c6',
        skillCode: 'CONTINUOUS_TESTING_QUALITY_ENGINEERING',
        capability: 'Continuous quality platform architecture',
        observableBehaviours: [
          'Explains continuous quality platform architecture accurately under assessment conditions',
          'Applies continuous quality platform architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates continuous quality platform architecture in timed assessment items',
        ],
        prerequisites: [ '6cac7101-0d6f-44cd-a376-8e531397321b' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '5906b9fd-6068-4a14-a344-7a4862ce2dc4' ], criticalCompetencyIds: [ '5906b9fd-6068-4a14-a344-7a4862ce2dc4' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '5906b9fd-6068-4a14-a344-7a4862ce2dc4', '24cb47ae-92da-43f7-a9bd-2dda8da776dc', '622ed24b-aae8-47f2-a0e5-68aa6618d8d9' ], criticalCompetencyIds: [ '622ed24b-aae8-47f2-a0e5-68aa6618d8d9' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '5906b9fd-6068-4a14-a344-7a4862ce2dc4', '24cb47ae-92da-43f7-a9bd-2dda8da776dc', '622ed24b-aae8-47f2-a0e5-68aa6618d8d9', 'c7c65db9-a41f-4bf5-a7b1-7aeb792c6dd1', '6cac7101-0d6f-44cd-a376-8e531397321b' ], criticalCompetencyIds: [ 'c7c65db9-a41f-4bf5-a7b1-7aeb792c6dd1', '6cac7101-0d6f-44cd-a376-8e531397321b' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '5906b9fd-6068-4a14-a344-7a4862ce2dc4', '24cb47ae-92da-43f7-a9bd-2dda8da776dc', '622ed24b-aae8-47f2-a0e5-68aa6618d8d9', 'c7c65db9-a41f-4bf5-a7b1-7aeb792c6dd1', '6cac7101-0d6f-44cd-a376-8e531397321b', '9d59519b-f98e-4320-a73a-b104fae0b3c6' ], criticalCompetencyIds: [ '6cac7101-0d6f-44cd-a376-8e531397321b', '9d59519b-f98e-4320-a73a-b104fae0b3c6' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Quality Engineering',
      INTERMEDIATE: 'Independent execution of bounded Quality Engineering tasks',
      ADVANCED: 'Owns Quality Engineering components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Quality Engineering at org scale',
    },
    assessmentBlueprint: 'SDE_TESTING',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'API_CONTRACT_TESTING': {
    skillCode: 'API_CONTRACT_TESTING',
    name: 'API Testing',
    domain: 'SOFTWARE_IT',
    category: 'Testing, QA & Reliability',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '937f3085-8690-41bf-a81d-f8b40da1834d',
        skillCode: 'API_CONTRACT_TESTING',
        capability: 'Contract testing principles & consumer-driven contracts',
        observableBehaviours: [
          'Explains contract testing principles & consumer-driven contracts accurately under assessment conditions',
          'Applies contract testing principles & consumer-driven contracts to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates contract testing principles & consumer-driven contracts in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '5b26d97b-6985-4a05-a7ca-0db8e30d7772',
        skillCode: 'API_CONTRACT_TESTING',
        capability: 'OpenAPI/AsyncAPI schema validation',
        observableBehaviours: [
          'Explains openapi/asyncapi schema validation accurately under assessment conditions',
          'Applies openapi/asyncapi schema validation to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates openapi/asyncapi schema validation in timed assessment items',
        ],
        prerequisites: [ '937f3085-8690-41bf-a81d-f8b40da1834d' ],
        role: 'core',
      },
      {
        competencyId: 'bf405e31-148c-47ed-a49c-8c224ef6f058',
        skillCode: 'API_CONTRACT_TESTING',
        capability: 'Pact/provider verification workflows',
        observableBehaviours: [
          'Explains pact/provider verification workflows accurately under assessment conditions',
          'Applies pact/provider verification workflows to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates pact/provider verification workflows in timed assessment items',
        ],
        prerequisites: [ '5b26d97b-6985-4a05-a7ca-0db8e30d7772' ],
        role: 'supporting',
      },
      {
        competencyId: 'bab5b70e-f43c-45c4-a7a1-052f0f0b35c4',
        skillCode: 'API_CONTRACT_TESTING',
        capability: 'Breaking change detection & versioning',
        observableBehaviours: [
          'Explains breaking change detection & versioning accurately under assessment conditions',
          'Applies breaking change detection & versioning to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates breaking change detection & versioning in timed assessment items',
        ],
        prerequisites: [ 'bf405e31-148c-47ed-a49c-8c224ef6f058' ],
        role: 'critical',
      },
      {
        competencyId: '9c90c509-8ad8-4685-ade0-a6451edfb1b2',
        skillCode: 'API_CONTRACT_TESTING',
        capability: 'Mock servers & contract CI integration',
        observableBehaviours: [
          'Explains mock servers & contract ci integration accurately under assessment conditions',
          'Applies mock servers & contract ci integration to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates mock servers & contract ci integration in timed assessment items',
        ],
        prerequisites: [ 'bab5b70e-f43c-45c4-a7a1-052f0f0b35c4' ],
        role: 'critical',
      },
      {
        competencyId: 'f1890350-b7b1-4580-addf-30aad92a7716',
        skillCode: 'API_CONTRACT_TESTING',
        capability: 'API contract testing platform design',
        observableBehaviours: [
          'Explains api contract testing platform design accurately under assessment conditions',
          'Applies api contract testing platform design to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates api contract testing platform design in timed assessment items',
        ],
        prerequisites: [ '9c90c509-8ad8-4685-ade0-a6451edfb1b2' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '937f3085-8690-41bf-a81d-f8b40da1834d' ], criticalCompetencyIds: [ '937f3085-8690-41bf-a81d-f8b40da1834d' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '937f3085-8690-41bf-a81d-f8b40da1834d', '5b26d97b-6985-4a05-a7ca-0db8e30d7772', 'bf405e31-148c-47ed-a49c-8c224ef6f058' ], criticalCompetencyIds: [ 'bf405e31-148c-47ed-a49c-8c224ef6f058' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '937f3085-8690-41bf-a81d-f8b40da1834d', '5b26d97b-6985-4a05-a7ca-0db8e30d7772', 'bf405e31-148c-47ed-a49c-8c224ef6f058', 'bab5b70e-f43c-45c4-a7a1-052f0f0b35c4', '9c90c509-8ad8-4685-ade0-a6451edfb1b2' ], criticalCompetencyIds: [ 'bab5b70e-f43c-45c4-a7a1-052f0f0b35c4', '9c90c509-8ad8-4685-ade0-a6451edfb1b2' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '937f3085-8690-41bf-a81d-f8b40da1834d', '5b26d97b-6985-4a05-a7ca-0db8e30d7772', 'bf405e31-148c-47ed-a49c-8c224ef6f058', 'bab5b70e-f43c-45c4-a7a1-052f0f0b35c4', '9c90c509-8ad8-4685-ade0-a6451edfb1b2', 'f1890350-b7b1-4580-addf-30aad92a7716' ], criticalCompetencyIds: [ '9c90c509-8ad8-4685-ade0-a6451edfb1b2', 'f1890350-b7b1-4580-addf-30aad92a7716' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of API Testing',
      INTERMEDIATE: 'Independent execution of bounded API Testing tasks',
      ADVANCED: 'Owns API Testing components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for API Testing at org scale',
    },
    assessmentBlueprint: 'SDE_TESTING',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'NATIVE_ANDROID_DEVELOPMENT': {
    skillCode: 'NATIVE_ANDROID_DEVELOPMENT',
    name: 'Android Development',
    domain: 'SOFTWARE_IT',
    category: 'Mobile Development',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '8bf5dafa-ae3d-4dea-a54c-88a748dd1825',
        skillCode: 'NATIVE_ANDROID_DEVELOPMENT',
        capability: 'Android fundamentals & activity/fragment lifecycle',
        observableBehaviours: [
          'Explains android fundamentals & activity/fragment lifecycle accurately under assessment conditions',
          'Applies android fundamentals & activity/fragment lifecycle to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates android fundamentals & activity/fragment lifecycle in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '34ca8370-6e25-4b8c-ad5b-4b93b765856e',
        skillCode: 'NATIVE_ANDROID_DEVELOPMENT',
        capability: 'Jetpack Compose/UI layout patterns',
        observableBehaviours: [
          'Explains jetpack compose/ui layout patterns accurately under assessment conditions',
          'Applies jetpack compose/ui layout patterns to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates jetpack compose/ui layout patterns in timed assessment items',
        ],
        prerequisites: [ '8bf5dafa-ae3d-4dea-a54c-88a748dd1825' ],
        role: 'core',
      },
      {
        competencyId: 'aff91065-52d5-4cd8-aa9c-14e9e8943a7b',
        skillCode: 'NATIVE_ANDROID_DEVELOPMENT',
        capability: 'Navigation, ViewModel & state management',
        observableBehaviours: [
          'Explains navigation, viewmodel & state management accurately under assessment conditions',
          'Applies navigation, viewmodel & state management to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates navigation, viewmodel & state management in timed assessment items',
        ],
        prerequisites: [ '34ca8370-6e25-4b8c-ad5b-4b93b765856e' ],
        role: 'supporting',
      },
      {
        competencyId: '558d5481-7e77-4f26-afae-e839237d942c',
        skillCode: 'NATIVE_ANDROID_DEVELOPMENT',
        capability: 'Networking, Room & background work',
        observableBehaviours: [
          'Explains networking, room & background work accurately under assessment conditions',
          'Applies networking, room & background work to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates networking, room & background work in timed assessment items',
        ],
        prerequisites: [ 'aff91065-52d5-4cd8-aa9c-14e9e8943a7b' ],
        role: 'critical',
      },
      {
        competencyId: '9a37c9c9-065a-451a-a03f-3438945a97db',
        skillCode: 'NATIVE_ANDROID_DEVELOPMENT',
        capability: 'Testing, profiling & Play Store requirements',
        observableBehaviours: [
          'Explains testing, profiling & play store requirements accurately under assessment conditions',
          'Applies testing, profiling & play store requirements to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates testing, profiling & play store requirements in timed assessment items',
        ],
        prerequisites: [ '558d5481-7e77-4f26-afae-e839237d942c' ],
        role: 'critical',
      },
      {
        competencyId: '228c3ffb-aee0-4748-a9c6-da271c000d9b',
        skillCode: 'NATIVE_ANDROID_DEVELOPMENT',
        capability: 'Android app architecture (Clean/MVI)',
        observableBehaviours: [
          'Explains android app architecture (clean/mvi) accurately under assessment conditions',
          'Applies android app architecture (clean/mvi) to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates android app architecture (clean/mvi) in timed assessment items',
        ],
        prerequisites: [ '9a37c9c9-065a-451a-a03f-3438945a97db' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '8bf5dafa-ae3d-4dea-a54c-88a748dd1825' ], criticalCompetencyIds: [ '8bf5dafa-ae3d-4dea-a54c-88a748dd1825' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '8bf5dafa-ae3d-4dea-a54c-88a748dd1825', '34ca8370-6e25-4b8c-ad5b-4b93b765856e', 'aff91065-52d5-4cd8-aa9c-14e9e8943a7b' ], criticalCompetencyIds: [ 'aff91065-52d5-4cd8-aa9c-14e9e8943a7b' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '8bf5dafa-ae3d-4dea-a54c-88a748dd1825', '34ca8370-6e25-4b8c-ad5b-4b93b765856e', 'aff91065-52d5-4cd8-aa9c-14e9e8943a7b', '558d5481-7e77-4f26-afae-e839237d942c', '9a37c9c9-065a-451a-a03f-3438945a97db' ], criticalCompetencyIds: [ '558d5481-7e77-4f26-afae-e839237d942c', '9a37c9c9-065a-451a-a03f-3438945a97db' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '8bf5dafa-ae3d-4dea-a54c-88a748dd1825', '34ca8370-6e25-4b8c-ad5b-4b93b765856e', 'aff91065-52d5-4cd8-aa9c-14e9e8943a7b', '558d5481-7e77-4f26-afae-e839237d942c', '9a37c9c9-065a-451a-a03f-3438945a97db', '228c3ffb-aee0-4748-a9c6-da271c000d9b' ], criticalCompetencyIds: [ '9a37c9c9-065a-451a-a03f-3438945a97db', '228c3ffb-aee0-4748-a9c6-da271c000d9b' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Android Development',
      INTERMEDIATE: 'Independent execution of bounded Android Development tasks',
      ADVANCED: 'Owns Android Development components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Android Development at org scale',
    },
    assessmentBlueprint: 'SDE_WEB_FRAMEWORKS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'NATIVE_IOS_DEVELOPMENT': {
    skillCode: 'NATIVE_IOS_DEVELOPMENT',
    name: 'iOS Development',
    domain: 'SOFTWARE_IT',
    category: 'Mobile Development',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'b5a39439-49f7-46db-a055-36c0d4114ac8',
        skillCode: 'NATIVE_IOS_DEVELOPMENT',
        capability: 'iOS app lifecycle & SwiftUI/UIKit',
        observableBehaviours: [
          'Explains ios app lifecycle & swiftui/uikit accurately under assessment conditions',
          'Applies ios app lifecycle & swiftui/uikit to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates ios app lifecycle & swiftui/uikit in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '298d9508-e368-426b-a33e-645a56700d84',
        skillCode: 'NATIVE_IOS_DEVELOPMENT',
        capability: 'Navigation, state & dependency injection',
        observableBehaviours: [
          'Explains navigation, state & dependency injection accurately under assessment conditions',
          'Applies navigation, state & dependency injection to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates navigation, state & dependency injection in timed assessment items',
        ],
        prerequisites: [ 'b5a39439-49f7-46db-a055-36c0d4114ac8' ],
        role: 'core',
      },
      {
        competencyId: 'a9236013-1d1c-4198-aeae-d3661cf320af',
        skillCode: 'NATIVE_IOS_DEVELOPMENT',
        capability: 'Networking, Core Data & background tasks',
        observableBehaviours: [
          'Explains networking, core data & background tasks accurately under assessment conditions',
          'Applies networking, core data & background tasks to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates networking, core data & background tasks in timed assessment items',
        ],
        prerequisites: [ '298d9508-e368-426b-a33e-645a56700d84' ],
        role: 'supporting',
      },
      {
        competencyId: '941908ec-8b23-45e9-a67f-ef6284af372e',
        skillCode: 'NATIVE_IOS_DEVELOPMENT',
        capability: 'Accessibility, localization & HIG compliance',
        observableBehaviours: [
          'Explains accessibility, localization & hig compliance accurately under assessment conditions',
          'Applies accessibility, localization & hig compliance to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates accessibility, localization & hig compliance in timed assessment items',
        ],
        prerequisites: [ 'a9236013-1d1c-4198-aeae-d3661cf320af' ],
        role: 'critical',
      },
      {
        competencyId: 'd45b8b07-fdf2-47bd-ae79-1f0559f1ff2d',
        skillCode: 'NATIVE_IOS_DEVELOPMENT',
        capability: 'XCTest, TestFlight & release management',
        observableBehaviours: [
          'Explains xctest, testflight & release management accurately under assessment conditions',
          'Applies xctest, testflight & release management to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates xctest, testflight & release management in timed assessment items',
        ],
        prerequisites: [ '941908ec-8b23-45e9-a67f-ef6284af372e' ],
        role: 'critical',
      },
      {
        competencyId: 'cb7067aa-cb5f-49f5-a196-48af6b834c69',
        skillCode: 'NATIVE_IOS_DEVELOPMENT',
        capability: 'iOS application architecture patterns',
        observableBehaviours: [
          'Explains ios application architecture patterns accurately under assessment conditions',
          'Applies ios application architecture patterns to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates ios application architecture patterns in timed assessment items',
        ],
        prerequisites: [ 'd45b8b07-fdf2-47bd-ae79-1f0559f1ff2d' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'b5a39439-49f7-46db-a055-36c0d4114ac8' ], criticalCompetencyIds: [ 'b5a39439-49f7-46db-a055-36c0d4114ac8' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'b5a39439-49f7-46db-a055-36c0d4114ac8', '298d9508-e368-426b-a33e-645a56700d84', 'a9236013-1d1c-4198-aeae-d3661cf320af' ], criticalCompetencyIds: [ 'a9236013-1d1c-4198-aeae-d3661cf320af' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'b5a39439-49f7-46db-a055-36c0d4114ac8', '298d9508-e368-426b-a33e-645a56700d84', 'a9236013-1d1c-4198-aeae-d3661cf320af', '941908ec-8b23-45e9-a67f-ef6284af372e', 'd45b8b07-fdf2-47bd-ae79-1f0559f1ff2d' ], criticalCompetencyIds: [ '941908ec-8b23-45e9-a67f-ef6284af372e', 'd45b8b07-fdf2-47bd-ae79-1f0559f1ff2d' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'b5a39439-49f7-46db-a055-36c0d4114ac8', '298d9508-e368-426b-a33e-645a56700d84', 'a9236013-1d1c-4198-aeae-d3661cf320af', '941908ec-8b23-45e9-a67f-ef6284af372e', 'd45b8b07-fdf2-47bd-ae79-1f0559f1ff2d', 'cb7067aa-cb5f-49f5-a196-48af6b834c69' ], criticalCompetencyIds: [ 'd45b8b07-fdf2-47bd-ae79-1f0559f1ff2d', 'cb7067aa-cb5f-49f5-a196-48af6b834c69' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of iOS Development',
      INTERMEDIATE: 'Independent execution of bounded iOS Development tasks',
      ADVANCED: 'Owns iOS Development components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for iOS Development at org scale',
    },
    assessmentBlueprint: 'SDE_WEB_FRAMEWORKS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'MODERN_FRONTEND_FRAMEWORKS': {
    skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
    name: 'Frontend Frameworks',
    domain: 'SOFTWARE_IT',
    category: 'Frontend & Web Development',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '56bc8c8a-4de7-46fc-a38a-5d7074ecc083',
        skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
        capability: 'HTML/CSS/JS fundamentals & accessibility basics',
        observableBehaviours: [
          'Explains html/css/js fundamentals & accessibility basics accurately under assessment conditions',
          'Applies html/css/js fundamentals & accessibility basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates html/css/js fundamentals & accessibility basics in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'd622fc73-8b07-4b1e-abc7-be5f838d3457',
        skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
        capability: 'React/Vue/Angular component models',
        observableBehaviours: [
          'Explains react/vue/angular component models accurately under assessment conditions',
          'Applies react/vue/angular component models to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates react/vue/angular component models in timed assessment items',
        ],
        prerequisites: [ '56bc8c8a-4de7-46fc-a38a-5d7074ecc083' ],
        role: 'core',
      },
      {
        competencyId: '56e38307-f46b-43ba-a84f-fe367ba6f420',
        skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
        capability: 'Routing, forms & client-side state',
        observableBehaviours: [
          'Explains routing, forms & client-side state accurately under assessment conditions',
          'Applies routing, forms & client-side state to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates routing, forms & client-side state in timed assessment items',
        ],
        prerequisites: [ 'd622fc73-8b07-4b1e-abc7-be5f838d3457' ],
        role: 'supporting',
      },
      {
        competencyId: 'a712895f-5d09-4896-aae0-c08b6dcfc98c',
        skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
        capability: 'API integration, auth & error boundaries',
        observableBehaviours: [
          'Explains api integration, auth & error boundaries accurately under assessment conditions',
          'Applies api integration, auth & error boundaries to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates api integration, auth & error boundaries in timed assessment items',
        ],
        prerequisites: [ '56e38307-f46b-43ba-a84f-fe367ba6f420' ],
        role: 'critical',
      },
      {
        competencyId: '0c2df9ba-8b33-4a19-ad55-f68e4836f402',
        skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
        capability: 'Testing, bundling & Core Web Vitals',
        observableBehaviours: [
          'Explains testing, bundling & core web vitals accurately under assessment conditions',
          'Applies testing, bundling & core web vitals to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates testing, bundling & core web vitals in timed assessment items',
        ],
        prerequisites: [ 'a712895f-5d09-4896-aae0-c08b6dcfc98c' ],
        role: 'critical',
      },
      {
        competencyId: 'c4b6d9f7-b6ee-45d1-aab4-db22b393b424',
        skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
        capability: 'Frontend application architecture',
        observableBehaviours: [
          'Explains frontend application architecture accurately under assessment conditions',
          'Applies frontend application architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates frontend application architecture in timed assessment items',
        ],
        prerequisites: [ '0c2df9ba-8b33-4a19-ad55-f68e4836f402' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '56bc8c8a-4de7-46fc-a38a-5d7074ecc083' ], criticalCompetencyIds: [ '56bc8c8a-4de7-46fc-a38a-5d7074ecc083' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '56bc8c8a-4de7-46fc-a38a-5d7074ecc083', 'd622fc73-8b07-4b1e-abc7-be5f838d3457', '56e38307-f46b-43ba-a84f-fe367ba6f420' ], criticalCompetencyIds: [ '56e38307-f46b-43ba-a84f-fe367ba6f420' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '56bc8c8a-4de7-46fc-a38a-5d7074ecc083', 'd622fc73-8b07-4b1e-abc7-be5f838d3457', '56e38307-f46b-43ba-a84f-fe367ba6f420', 'a712895f-5d09-4896-aae0-c08b6dcfc98c', '0c2df9ba-8b33-4a19-ad55-f68e4836f402' ], criticalCompetencyIds: [ 'a712895f-5d09-4896-aae0-c08b6dcfc98c', '0c2df9ba-8b33-4a19-ad55-f68e4836f402' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '56bc8c8a-4de7-46fc-a38a-5d7074ecc083', 'd622fc73-8b07-4b1e-abc7-be5f838d3457', '56e38307-f46b-43ba-a84f-fe367ba6f420', 'a712895f-5d09-4896-aae0-c08b6dcfc98c', '0c2df9ba-8b33-4a19-ad55-f68e4836f402', 'c4b6d9f7-b6ee-45d1-aab4-db22b393b424' ], criticalCompetencyIds: [ '0c2df9ba-8b33-4a19-ad55-f68e4836f402', 'c4b6d9f7-b6ee-45d1-aab4-db22b393b424' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Frontend Frameworks',
      INTERMEDIATE: 'Independent execution of bounded Frontend Frameworks tasks',
      ADVANCED: 'Owns Frontend Frameworks components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Frontend Frameworks at org scale',
    },
    assessmentBlueprint: 'SDE_WEB_FRAMEWORKS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'FRONTEND_PERFORMANCE_ENGINEERING': {
    skillCode: 'FRONTEND_PERFORMANCE_ENGINEERING',
    name: 'Frontend Performance',
    domain: 'SOFTWARE_IT',
    category: 'Frontend & Web Development',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'cf955839-15c3-4412-a471-78285c1f18f8',
        skillCode: 'FRONTEND_PERFORMANCE_ENGINEERING',
        capability: 'Core Web Vitals & performance budgets',
        observableBehaviours: [
          'Explains core web vitals & performance budgets accurately under assessment conditions',
          'Applies core web vitals & performance budgets to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates core web vitals & performance budgets in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '2155138c-e65d-4323-ab70-85d02b1664f9',
        skillCode: 'FRONTEND_PERFORMANCE_ENGINEERING',
        capability: 'Bundle analysis, code splitting & lazy loading',
        observableBehaviours: [
          'Explains bundle analysis, code splitting & lazy loading accurately under assessment conditions',
          'Applies bundle analysis, code splitting & lazy loading to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates bundle analysis, code splitting & lazy loading in timed assessment items',
        ],
        prerequisites: [ 'cf955839-15c3-4412-a471-78285c1f18f8' ],
        role: 'core',
      },
      {
        competencyId: 'ced200a8-e6be-4d38-a05c-dd7aad7d3ea0',
        skillCode: 'FRONTEND_PERFORMANCE_ENGINEERING',
        capability: 'Rendering optimization & memoization',
        observableBehaviours: [
          'Explains rendering optimization & memoization accurately under assessment conditions',
          'Applies rendering optimization & memoization to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates rendering optimization & memoization in timed assessment items',
        ],
        prerequisites: [ '2155138c-e65d-4323-ab70-85d02b1664f9' ],
        role: 'supporting',
      },
      {
        competencyId: '4a3fd88d-091a-4cb1-a8da-458ab41411e8',
        skillCode: 'FRONTEND_PERFORMANCE_ENGINEERING',
        capability: 'Network waterfall, caching & CDN usage',
        observableBehaviours: [
          'Explains network waterfall, caching & cdn usage accurately under assessment conditions',
          'Applies network waterfall, caching & cdn usage to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates network waterfall, caching & cdn usage in timed assessment items',
        ],
        prerequisites: [ 'ced200a8-e6be-4d38-a05c-dd7aad7d3ea0' ],
        role: 'critical',
      },
      {
        competencyId: 'bf1ff996-edf7-4ae9-a188-e878444fe8b3',
        skillCode: 'FRONTEND_PERFORMANCE_ENGINEERING',
        capability: 'Profiling with Lighthouse & browser devtools',
        observableBehaviours: [
          'Explains profiling with lighthouse & browser devtools accurately under assessment conditions',
          'Applies profiling with lighthouse & browser devtools to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates profiling with lighthouse & browser devtools in timed assessment items',
        ],
        prerequisites: [ '4a3fd88d-091a-4cb1-a8da-458ab41411e8' ],
        role: 'critical',
      },
      {
        competencyId: '09c6ff7a-1ea0-4df0-a411-c2a9895db7d8',
        skillCode: 'FRONTEND_PERFORMANCE_ENGINEERING',
        capability: 'Frontend performance architecture',
        observableBehaviours: [
          'Explains frontend performance architecture accurately under assessment conditions',
          'Applies frontend performance architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates frontend performance architecture in timed assessment items',
        ],
        prerequisites: [ 'bf1ff996-edf7-4ae9-a188-e878444fe8b3' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'cf955839-15c3-4412-a471-78285c1f18f8' ], criticalCompetencyIds: [ 'cf955839-15c3-4412-a471-78285c1f18f8' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'cf955839-15c3-4412-a471-78285c1f18f8', '2155138c-e65d-4323-ab70-85d02b1664f9', 'ced200a8-e6be-4d38-a05c-dd7aad7d3ea0' ], criticalCompetencyIds: [ 'ced200a8-e6be-4d38-a05c-dd7aad7d3ea0' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'cf955839-15c3-4412-a471-78285c1f18f8', '2155138c-e65d-4323-ab70-85d02b1664f9', 'ced200a8-e6be-4d38-a05c-dd7aad7d3ea0', '4a3fd88d-091a-4cb1-a8da-458ab41411e8', 'bf1ff996-edf7-4ae9-a188-e878444fe8b3' ], criticalCompetencyIds: [ '4a3fd88d-091a-4cb1-a8da-458ab41411e8', 'bf1ff996-edf7-4ae9-a188-e878444fe8b3' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'cf955839-15c3-4412-a471-78285c1f18f8', '2155138c-e65d-4323-ab70-85d02b1664f9', 'ced200a8-e6be-4d38-a05c-dd7aad7d3ea0', '4a3fd88d-091a-4cb1-a8da-458ab41411e8', 'bf1ff996-edf7-4ae9-a188-e878444fe8b3', '09c6ff7a-1ea0-4df0-a411-c2a9895db7d8' ], criticalCompetencyIds: [ 'bf1ff996-edf7-4ae9-a188-e878444fe8b3', '09c6ff7a-1ea0-4df0-a411-c2a9895db7d8' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Frontend Performance',
      INTERMEDIATE: 'Independent execution of bounded Frontend Performance tasks',
      ADVANCED: 'Owns Frontend Performance components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Frontend Performance at org scale',
    },
    assessmentBlueprint: 'SDE_WEB_FRAMEWORKS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE': {
    skillCode: 'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
    name: 'State Management',
    domain: 'SOFTWARE_IT',
    category: 'Frontend & Web Development',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '5f5db762-438a-49c3-a0f3-2c57a16516b5',
        skillCode: 'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
        capability: 'Component composition & design systems',
        observableBehaviours: [
          'Explains component composition & design systems accurately under assessment conditions',
          'Applies component composition & design systems to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates component composition & design systems in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '022a06ed-00ba-4d08-acae-4b90890e7865',
        skillCode: 'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
        capability: 'Local vs global state patterns',
        observableBehaviours: [
          'Explains local vs global state patterns accurately under assessment conditions',
          'Applies local vs global state patterns to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates local vs global state patterns in timed assessment items',
        ],
        prerequisites: [ '5f5db762-438a-49c3-a0f3-2c57a16516b5' ],
        role: 'core',
      },
      {
        competencyId: 'cb6cf2fe-d5f1-4776-aa6a-ec49195db62f',
        skillCode: 'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
        capability: 'Redux/Zustand/Context state libraries',
        observableBehaviours: [
          'Explains redux/zustand/context state libraries accurately under assessment conditions',
          'Applies redux/zustand/context state libraries to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates redux/zustand/context state libraries in timed assessment items',
        ],
        prerequisites: [ '022a06ed-00ba-4d08-acae-4b90890e7865' ],
        role: 'supporting',
      },
      {
        competencyId: 'b20726d5-c3a8-433c-afaf-eb1b346fa089',
        skillCode: 'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
        capability: 'Side effects, async data & caching layers',
        observableBehaviours: [
          'Explains side effects, async data & caching layers accurately under assessment conditions',
          'Applies side effects, async data & caching layers to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates side effects, async data & caching layers in timed assessment items',
        ],
        prerequisites: [ 'cb6cf2fe-d5f1-4776-aa6a-ec49195db62f' ],
        role: 'critical',
      },
      {
        competencyId: '410bee6e-c1ac-4e54-adad-33ca3ae15589',
        skillCode: 'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
        capability: 'Testing components & state transitions',
        observableBehaviours: [
          'Explains testing components & state transitions accurately under assessment conditions',
          'Applies testing components & state transitions to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates testing components & state transitions in timed assessment items',
        ],
        prerequisites: [ 'b20726d5-c3a8-433c-afaf-eb1b346fa089' ],
        role: 'critical',
      },
      {
        competencyId: '7d4f64c0-fabd-41e1-a7f5-4ae4178eb519',
        skillCode: 'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE',
        capability: 'Scalable frontend component architecture',
        observableBehaviours: [
          'Explains scalable frontend component architecture accurately under assessment conditions',
          'Applies scalable frontend component architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates scalable frontend component architecture in timed assessment items',
        ],
        prerequisites: [ '410bee6e-c1ac-4e54-adad-33ca3ae15589' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '5f5db762-438a-49c3-a0f3-2c57a16516b5' ], criticalCompetencyIds: [ '5f5db762-438a-49c3-a0f3-2c57a16516b5' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '5f5db762-438a-49c3-a0f3-2c57a16516b5', '022a06ed-00ba-4d08-acae-4b90890e7865', 'cb6cf2fe-d5f1-4776-aa6a-ec49195db62f' ], criticalCompetencyIds: [ 'cb6cf2fe-d5f1-4776-aa6a-ec49195db62f' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '5f5db762-438a-49c3-a0f3-2c57a16516b5', '022a06ed-00ba-4d08-acae-4b90890e7865', 'cb6cf2fe-d5f1-4776-aa6a-ec49195db62f', 'b20726d5-c3a8-433c-afaf-eb1b346fa089', '410bee6e-c1ac-4e54-adad-33ca3ae15589' ], criticalCompetencyIds: [ 'b20726d5-c3a8-433c-afaf-eb1b346fa089', '410bee6e-c1ac-4e54-adad-33ca3ae15589' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '5f5db762-438a-49c3-a0f3-2c57a16516b5', '022a06ed-00ba-4d08-acae-4b90890e7865', 'cb6cf2fe-d5f1-4776-aa6a-ec49195db62f', 'b20726d5-c3a8-433c-afaf-eb1b346fa089', '410bee6e-c1ac-4e54-adad-33ca3ae15589', '7d4f64c0-fabd-41e1-a7f5-4ae4178eb519' ], criticalCompetencyIds: [ '410bee6e-c1ac-4e54-adad-33ca3ae15589', '7d4f64c0-fabd-41e1-a7f5-4ae4178eb519' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of State Management',
      INTERMEDIATE: 'Independent execution of bounded State Management tasks',
      ADVANCED: 'Owns State Management components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for State Management at org scale',
    },
    assessmentBlueprint: 'SDE_WEB_FRAMEWORKS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'NETWORK_ARCHITECTURE_PROTOCOLS': {
    skillCode: 'NETWORK_ARCHITECTURE_PROTOCOLS',
    name: 'Networking',
    domain: 'SOFTWARE_IT',
    category: 'Networking & Systems Administration',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'f4941daa-15a7-47bd-aa69-c25b7559c4d3',
        skillCode: 'NETWORK_ARCHITECTURE_PROTOCOLS',
        capability: 'OSI/TCP-IP & common protocol behavior',
        observableBehaviours: [
          'Explains osi/tcp-ip & common protocol behavior accurately under assessment conditions',
          'Applies osi/tcp-ip & common protocol behavior to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates osi/tcp-ip & common protocol behavior in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'b677998d-e93b-4dd6-a825-c2438e0c8cec',
        skillCode: 'NETWORK_ARCHITECTURE_PROTOCOLS',
        capability: 'IP addressing, routing & switching',
        observableBehaviours: [
          'Explains ip addressing, routing & switching accurately under assessment conditions',
          'Applies ip addressing, routing & switching to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates ip addressing, routing & switching in timed assessment items',
        ],
        prerequisites: [ 'f4941daa-15a7-47bd-aa69-c25b7559c4d3' ],
        role: 'core',
      },
      {
        competencyId: '05b01edc-5930-4bab-abf2-d4af7e4f989c',
        skillCode: 'NETWORK_ARCHITECTURE_PROTOCOLS',
        capability: 'DNS, DHCP & load balancing fundamentals',
        observableBehaviours: [
          'Explains dns, dhcp & load balancing fundamentals accurately under assessment conditions',
          'Applies dns, dhcp & load balancing fundamentals to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates dns, dhcp & load balancing fundamentals in timed assessment items',
        ],
        prerequisites: [ 'b677998d-e93b-4dd6-a825-c2438e0c8cec' ],
        role: 'supporting',
      },
      {
        competencyId: '25aee8d9-0fe0-4034-ab61-2b4056979083',
        skillCode: 'NETWORK_ARCHITECTURE_PROTOCOLS',
        capability: 'Firewalls, VPNs & network security basics',
        observableBehaviours: [
          'Explains firewalls, vpns & network security basics accurately under assessment conditions',
          'Applies firewalls, vpns & network security basics to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates firewalls, vpns & network security basics in timed assessment items',
        ],
        prerequisites: [ '05b01edc-5930-4bab-abf2-d4af7e4f989c' ],
        role: 'critical',
      },
      {
        competencyId: 'f8f90021-7fc9-4d76-aec9-16421a1d13b1',
        skillCode: 'NETWORK_ARCHITECTURE_PROTOCOLS',
        capability: 'Troubleshooting connectivity & packet analysis',
        observableBehaviours: [
          'Explains troubleshooting connectivity & packet analysis accurately under assessment conditions',
          'Applies troubleshooting connectivity & packet analysis to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates troubleshooting connectivity & packet analysis in timed assessment items',
        ],
        prerequisites: [ '25aee8d9-0fe0-4034-ab61-2b4056979083' ],
        role: 'critical',
      },
      {
        competencyId: '3536939e-ce0d-4238-a207-d7880306e433',
        skillCode: 'NETWORK_ARCHITECTURE_PROTOCOLS',
        capability: 'Enterprise network architecture design',
        observableBehaviours: [
          'Explains enterprise network architecture design accurately under assessment conditions',
          'Applies enterprise network architecture design to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates enterprise network architecture design in timed assessment items',
        ],
        prerequisites: [ 'f8f90021-7fc9-4d76-aec9-16421a1d13b1' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'f4941daa-15a7-47bd-aa69-c25b7559c4d3' ], criticalCompetencyIds: [ 'f4941daa-15a7-47bd-aa69-c25b7559c4d3' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'f4941daa-15a7-47bd-aa69-c25b7559c4d3', 'b677998d-e93b-4dd6-a825-c2438e0c8cec', '05b01edc-5930-4bab-abf2-d4af7e4f989c' ], criticalCompetencyIds: [ '05b01edc-5930-4bab-abf2-d4af7e4f989c' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'f4941daa-15a7-47bd-aa69-c25b7559c4d3', 'b677998d-e93b-4dd6-a825-c2438e0c8cec', '05b01edc-5930-4bab-abf2-d4af7e4f989c', '25aee8d9-0fe0-4034-ab61-2b4056979083', 'f8f90021-7fc9-4d76-aec9-16421a1d13b1' ], criticalCompetencyIds: [ '25aee8d9-0fe0-4034-ab61-2b4056979083', 'f8f90021-7fc9-4d76-aec9-16421a1d13b1' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'f4941daa-15a7-47bd-aa69-c25b7559c4d3', 'b677998d-e93b-4dd6-a825-c2438e0c8cec', '05b01edc-5930-4bab-abf2-d4af7e4f989c', '25aee8d9-0fe0-4034-ab61-2b4056979083', 'f8f90021-7fc9-4d76-aec9-16421a1d13b1', '3536939e-ce0d-4238-a207-d7880306e433' ], criticalCompetencyIds: [ 'f8f90021-7fc9-4d76-aec9-16421a1d13b1', '3536939e-ce0d-4238-a207-d7880306e433' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Networking',
      INTERMEDIATE: 'Independent execution of bounded Networking tasks',
      ADVANCED: 'Owns Networking components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Networking at org scale',
    },
    assessmentBlueprint: 'SDE_COMPUTER_NETWORKS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'LINUX_SYSTEMS_ADMINISTRATION': {
    skillCode: 'LINUX_SYSTEMS_ADMINISTRATION',
    name: 'Linux Administration',
    domain: 'SOFTWARE_IT',
    category: 'Networking & Systems Administration',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: 'efe6366e-cfd1-4c95-a7db-46b6459b0166',
        skillCode: 'LINUX_SYSTEMS_ADMINISTRATION',
        capability: 'Linux filesystem, users & permissions',
        observableBehaviours: [
          'Explains linux filesystem, users & permissions accurately under assessment conditions',
          'Applies linux filesystem, users & permissions to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates linux filesystem, users & permissions in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'dfa8bbd1-62d6-43e0-a863-ab4f5057a06e',
        skillCode: 'LINUX_SYSTEMS_ADMINISTRATION',
        capability: 'Process management & systemd services',
        observableBehaviours: [
          'Explains process management & systemd services accurately under assessment conditions',
          'Applies process management & systemd services to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates process management & systemd services in timed assessment items',
        ],
        prerequisites: [ 'efe6366e-cfd1-4c95-a7db-46b6459b0166' ],
        role: 'core',
      },
      {
        competencyId: '02e86911-21e1-4a86-a6c2-9c81ed840b0a',
        skillCode: 'LINUX_SYSTEMS_ADMINISTRATION',
        capability: 'Package management & configuration files',
        observableBehaviours: [
          'Explains package management & configuration files accurately under assessment conditions',
          'Applies package management & configuration files to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates package management & configuration files in timed assessment items',
        ],
        prerequisites: [ 'dfa8bbd1-62d6-43e0-a863-ab4f5057a06e' ],
        role: 'supporting',
      },
      {
        competencyId: '04b24364-0898-4c1c-aae8-5d8033ceb792',
        skillCode: 'LINUX_SYSTEMS_ADMINISTRATION',
        capability: 'Shell scripting & automation',
        observableBehaviours: [
          'Explains shell scripting & automation accurately under assessment conditions',
          'Applies shell scripting & automation to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates shell scripting & automation in timed assessment items',
        ],
        prerequisites: [ '02e86911-21e1-4a86-a6c2-9c81ed840b0a' ],
        role: 'critical',
      },
      {
        competencyId: '42f35839-d362-4fd0-a4db-3dff09e72804',
        skillCode: 'LINUX_SYSTEMS_ADMINISTRATION',
        capability: 'Monitoring, logs & performance tuning',
        observableBehaviours: [
          'Explains monitoring, logs & performance tuning accurately under assessment conditions',
          'Applies monitoring, logs & performance tuning to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates monitoring, logs & performance tuning in timed assessment items',
        ],
        prerequisites: [ '04b24364-0898-4c1c-aae8-5d8033ceb792' ],
        role: 'critical',
      },
      {
        competencyId: '177101d2-a11d-4859-af0c-afd77511062b',
        skillCode: 'LINUX_SYSTEMS_ADMINISTRATION',
        capability: 'Linux server fleet architecture',
        observableBehaviours: [
          'Explains linux server fleet architecture accurately under assessment conditions',
          'Applies linux server fleet architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates linux server fleet architecture in timed assessment items',
        ],
        prerequisites: [ '42f35839-d362-4fd0-a4db-3dff09e72804' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ 'efe6366e-cfd1-4c95-a7db-46b6459b0166' ], criticalCompetencyIds: [ 'efe6366e-cfd1-4c95-a7db-46b6459b0166' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ 'efe6366e-cfd1-4c95-a7db-46b6459b0166', 'dfa8bbd1-62d6-43e0-a863-ab4f5057a06e', '02e86911-21e1-4a86-a6c2-9c81ed840b0a' ], criticalCompetencyIds: [ '02e86911-21e1-4a86-a6c2-9c81ed840b0a' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ 'efe6366e-cfd1-4c95-a7db-46b6459b0166', 'dfa8bbd1-62d6-43e0-a863-ab4f5057a06e', '02e86911-21e1-4a86-a6c2-9c81ed840b0a', '04b24364-0898-4c1c-aae8-5d8033ceb792', '42f35839-d362-4fd0-a4db-3dff09e72804' ], criticalCompetencyIds: [ '04b24364-0898-4c1c-aae8-5d8033ceb792', '42f35839-d362-4fd0-a4db-3dff09e72804' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ 'efe6366e-cfd1-4c95-a7db-46b6459b0166', 'dfa8bbd1-62d6-43e0-a863-ab4f5057a06e', '02e86911-21e1-4a86-a6c2-9c81ed840b0a', '04b24364-0898-4c1c-aae8-5d8033ceb792', '42f35839-d362-4fd0-a4db-3dff09e72804', '177101d2-a11d-4859-af0c-afd77511062b' ], criticalCompetencyIds: [ '42f35839-d362-4fd0-a4db-3dff09e72804', '177101d2-a11d-4859-af0c-afd77511062b' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Linux Administration',
      INTERMEDIATE: 'Independent execution of bounded Linux Administration tasks',
      ADVANCED: 'Owns Linux Administration components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Linux Administration at org scale',
    },
    assessmentBlueprint: 'SDE_OPERATING_SYSTEMS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT': {
    skillCode: 'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT',
    name: 'Blockchain Development',
    domain: 'SOFTWARE_IT',
    category: 'Emerging Technology',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '562468a2-710a-4be3-a6fc-bf3fd9e87d2f',
        skillCode: 'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT',
        capability: 'Blockchain fundamentals & consensus models',
        observableBehaviours: [
          'Explains blockchain fundamentals & consensus models accurately under assessment conditions',
          'Applies blockchain fundamentals & consensus models to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates blockchain fundamentals & consensus models in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '3a8af3d1-5416-403f-ade3-8a9747fe2cd2',
        skillCode: 'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT',
        capability: 'Smart contract languages (Solidity/Rust)',
        observableBehaviours: [
          'Explains smart contract languages (solidity/rust) accurately under assessment conditions',
          'Applies smart contract languages (solidity/rust) to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates smart contract languages (solidity/rust) in timed assessment items',
        ],
        prerequisites: [ '562468a2-710a-4be3-a6fc-bf3fd9e87d2f' ],
        role: 'core',
      },
      {
        competencyId: 'a8967bde-76db-42be-ac0f-627f0a3d7eda',
        skillCode: 'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT',
        capability: 'Token standards, wallets & transactions',
        observableBehaviours: [
          'Explains token standards, wallets & transactions accurately under assessment conditions',
          'Applies token standards, wallets & transactions to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates token standards, wallets & transactions in timed assessment items',
        ],
        prerequisites: [ '3a8af3d1-5416-403f-ade3-8a9747fe2cd2' ],
        role: 'supporting',
      },
      {
        competencyId: 'b8ce245a-62c3-4261-abb3-d913baf248d8',
        skillCode: 'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT',
        capability: 'Security vulnerabilities & audit practices',
        observableBehaviours: [
          'Explains security vulnerabilities & audit practices accurately under assessment conditions',
          'Applies security vulnerabilities & audit practices to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates security vulnerabilities & audit practices in timed assessment items',
        ],
        prerequisites: [ 'a8967bde-76db-42be-ac0f-627f0a3d7eda' ],
        role: 'critical',
      },
      {
        competencyId: '4f5deb16-237e-4f4d-a438-454aed18c2d1',
        skillCode: 'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT',
        capability: 'dApp frontends & oracle integration',
        observableBehaviours: [
          'Explains dapp frontends & oracle integration accurately under assessment conditions',
          'Applies dapp frontends & oracle integration to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates dapp frontends & oracle integration in timed assessment items',
        ],
        prerequisites: [ 'b8ce245a-62c3-4261-abb3-d913baf248d8' ],
        role: 'critical',
      },
      {
        competencyId: 'cb02f918-46be-4829-a088-21791d1aee06',
        skillCode: 'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT',
        capability: 'Blockchain application architecture',
        observableBehaviours: [
          'Explains blockchain application architecture accurately under assessment conditions',
          'Applies blockchain application architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates blockchain application architecture in timed assessment items',
        ],
        prerequisites: [ '4f5deb16-237e-4f4d-a438-454aed18c2d1' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '562468a2-710a-4be3-a6fc-bf3fd9e87d2f' ], criticalCompetencyIds: [ '562468a2-710a-4be3-a6fc-bf3fd9e87d2f' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '562468a2-710a-4be3-a6fc-bf3fd9e87d2f', '3a8af3d1-5416-403f-ade3-8a9747fe2cd2', 'a8967bde-76db-42be-ac0f-627f0a3d7eda' ], criticalCompetencyIds: [ 'a8967bde-76db-42be-ac0f-627f0a3d7eda' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '562468a2-710a-4be3-a6fc-bf3fd9e87d2f', '3a8af3d1-5416-403f-ade3-8a9747fe2cd2', 'a8967bde-76db-42be-ac0f-627f0a3d7eda', 'b8ce245a-62c3-4261-abb3-d913baf248d8', '4f5deb16-237e-4f4d-a438-454aed18c2d1' ], criticalCompetencyIds: [ 'b8ce245a-62c3-4261-abb3-d913baf248d8', '4f5deb16-237e-4f4d-a438-454aed18c2d1' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '562468a2-710a-4be3-a6fc-bf3fd9e87d2f', '3a8af3d1-5416-403f-ade3-8a9747fe2cd2', 'a8967bde-76db-42be-ac0f-627f0a3d7eda', 'b8ce245a-62c3-4261-abb3-d913baf248d8', '4f5deb16-237e-4f4d-a438-454aed18c2d1', 'cb02f918-46be-4829-a088-21791d1aee06' ], criticalCompetencyIds: [ '4f5deb16-237e-4f4d-a438-454aed18c2d1', 'cb02f918-46be-4829-a088-21791d1aee06' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Blockchain Development',
      INTERMEDIATE: 'Independent execution of bounded Blockchain Development tasks',
      ADVANCED: 'Owns Blockchain Development components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Blockchain Development at org scale',
    },
    assessmentBlueprint: 'SDE_SYSTEM_DESIGN',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'INTERNET_OF_THINGS_IOT_ENGINEERING': {
    skillCode: 'INTERNET_OF_THINGS_IOT_ENGINEERING',
    name: 'IoT Development',
    domain: 'SOFTWARE_IT',
    category: 'Emerging Technology',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '4a123e81-6071-45fc-ae08-1043334e7c5b',
        skillCode: 'INTERNET_OF_THINGS_IOT_ENGINEERING',
        capability: 'IoT architecture & device connectivity',
        observableBehaviours: [
          'Explains iot architecture & device connectivity accurately under assessment conditions',
          'Applies iot architecture & device connectivity to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates iot architecture & device connectivity in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'e0954ffe-8e12-4710-a0ae-583b477c03a8',
        skillCode: 'INTERNET_OF_THINGS_IOT_ENGINEERING',
        capability: 'Embedded protocols (MQTT, CoAP, BLE)',
        observableBehaviours: [
          'Explains embedded protocols (mqtt, coap, ble) accurately under assessment conditions',
          'Applies embedded protocols (mqtt, coap, ble) to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates embedded protocols (mqtt, coap, ble) in timed assessment items',
        ],
        prerequisites: [ '4a123e81-6071-45fc-ae08-1043334e7c5b' ],
        role: 'core',
      },
      {
        competencyId: 'de1d0591-7cf5-44d9-a588-ed2c2182f4cc',
        skillCode: 'INTERNET_OF_THINGS_IOT_ENGINEERING',
        capability: 'Edge processing & firmware OTA updates',
        observableBehaviours: [
          'Explains edge processing & firmware ota updates accurately under assessment conditions',
          'Applies edge processing & firmware ota updates to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates edge processing & firmware ota updates in timed assessment items',
        ],
        prerequisites: [ 'e0954ffe-8e12-4710-a0ae-583b477c03a8' ],
        role: 'supporting',
      },
      {
        competencyId: '32f84915-7734-4616-a3cf-e358b5c688b1',
        skillCode: 'INTERNET_OF_THINGS_IOT_ENGINEERING',
        capability: 'IoT security, provisioning & PKI',
        observableBehaviours: [
          'Explains iot security, provisioning & pki accurately under assessment conditions',
          'Applies iot security, provisioning & pki to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates iot security, provisioning & pki in timed assessment items',
        ],
        prerequisites: [ 'de1d0591-7cf5-44d9-a588-ed2c2182f4cc' ],
        role: 'critical',
      },
      {
        competencyId: '8aea9d04-8af3-4f01-a937-8788d86a737a',
        skillCode: 'INTERNET_OF_THINGS_IOT_ENGINEERING',
        capability: 'Telemetry pipelines & digital twins',
        observableBehaviours: [
          'Explains telemetry pipelines & digital twins accurately under assessment conditions',
          'Applies telemetry pipelines & digital twins to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates telemetry pipelines & digital twins in timed assessment items',
        ],
        prerequisites: [ '32f84915-7734-4616-a3cf-e358b5c688b1' ],
        role: 'critical',
      },
      {
        competencyId: 'ec007ee2-e8bc-4d95-a4e6-de54bcdf3507',
        skillCode: 'INTERNET_OF_THINGS_IOT_ENGINEERING',
        capability: 'Industrial IoT platform design',
        observableBehaviours: [
          'Explains industrial iot platform design accurately under assessment conditions',
          'Applies industrial iot platform design to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates industrial iot platform design in timed assessment items',
        ],
        prerequisites: [ '8aea9d04-8af3-4f01-a937-8788d86a737a' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '4a123e81-6071-45fc-ae08-1043334e7c5b' ], criticalCompetencyIds: [ '4a123e81-6071-45fc-ae08-1043334e7c5b' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '4a123e81-6071-45fc-ae08-1043334e7c5b', 'e0954ffe-8e12-4710-a0ae-583b477c03a8', 'de1d0591-7cf5-44d9-a588-ed2c2182f4cc' ], criticalCompetencyIds: [ 'de1d0591-7cf5-44d9-a588-ed2c2182f4cc' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '4a123e81-6071-45fc-ae08-1043334e7c5b', 'e0954ffe-8e12-4710-a0ae-583b477c03a8', 'de1d0591-7cf5-44d9-a588-ed2c2182f4cc', '32f84915-7734-4616-a3cf-e358b5c688b1', '8aea9d04-8af3-4f01-a937-8788d86a737a' ], criticalCompetencyIds: [ '32f84915-7734-4616-a3cf-e358b5c688b1', '8aea9d04-8af3-4f01-a937-8788d86a737a' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '4a123e81-6071-45fc-ae08-1043334e7c5b', 'e0954ffe-8e12-4710-a0ae-583b477c03a8', 'de1d0591-7cf5-44d9-a588-ed2c2182f4cc', '32f84915-7734-4616-a3cf-e358b5c688b1', '8aea9d04-8af3-4f01-a937-8788d86a737a', 'ec007ee2-e8bc-4d95-a4e6-de54bcdf3507' ], criticalCompetencyIds: [ '8aea9d04-8af3-4f01-a937-8788d86a737a', 'ec007ee2-e8bc-4d95-a4e6-de54bcdf3507' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of IoT Development',
      INTERMEDIATE: 'Independent execution of bounded IoT Development tasks',
      ADVANCED: 'Owns IoT Development components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for IoT Development at org scale',
    },
    assessmentBlueprint: 'SDE_SYSTEM_DESIGN',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT': {
    skillCode: 'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT',
    name: 'AR / VR Development',
    domain: 'SOFTWARE_IT',
    category: 'Emerging Technology',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '7f7ec038-b09d-45f0-a10e-1da4cf9f8704',
        skillCode: 'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT',
        capability: 'XR fundamentals & hardware tracking',
        observableBehaviours: [
          'Explains xr fundamentals & hardware tracking accurately under assessment conditions',
          'Applies xr fundamentals & hardware tracking to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates xr fundamentals & hardware tracking in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: '51c0ee1a-a92d-433e-a3cf-c6d7c81313c0',
        skillCode: 'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT',
        capability: '3D math, rendering & scene graph basics',
        observableBehaviours: [
          'Explains 3d math, rendering & scene graph basics accurately under assessment conditions',
          'Applies 3d math, rendering & scene graph basics to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates 3d math, rendering & scene graph basics in timed assessment items',
        ],
        prerequisites: [ '7f7ec038-b09d-45f0-a10e-1da4cf9f8704' ],
        role: 'core',
      },
      {
        competencyId: 'fb9b8f8d-9aae-42a9-aa2a-79c6c5dea338',
        skillCode: 'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT',
        capability: 'Unity/Unreal XR development workflows',
        observableBehaviours: [
          'Explains unity/unreal xr development workflows accurately under assessment conditions',
          'Applies unity/unreal xr development workflows to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates unity/unreal xr development workflows in timed assessment items',
        ],
        prerequisites: [ '51c0ee1a-a92d-433e-a3cf-c6d7c81313c0' ],
        role: 'supporting',
      },
      {
        competencyId: '24b43bd4-db2a-4cf8-afdb-69d061f3126c',
        skillCode: 'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT',
        capability: 'Interaction design & spatial UX',
        observableBehaviours: [
          'Explains interaction design & spatial ux accurately under assessment conditions',
          'Applies interaction design & spatial ux to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates interaction design & spatial ux in timed assessment items',
        ],
        prerequisites: [ 'fb9b8f8d-9aae-42a9-aa2a-79c6c5dea338' ],
        role: 'critical',
      },
      {
        competencyId: '53b35de6-e7de-45a7-a29d-3816af75de84',
        skillCode: 'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT',
        capability: 'Performance optimization for headsets',
        observableBehaviours: [
          'Explains performance optimization for headsets accurately under assessment conditions',
          'Applies performance optimization for headsets to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates performance optimization for headsets in timed assessment items',
        ],
        prerequisites: [ '24b43bd4-db2a-4cf8-afdb-69d061f3126c' ],
        role: 'critical',
      },
      {
        competencyId: '67a88ae6-8923-4755-a415-cfc6354c46b6',
        skillCode: 'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT',
        capability: 'Immersive application architecture',
        observableBehaviours: [
          'Explains immersive application architecture accurately under assessment conditions',
          'Applies immersive application architecture to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates immersive application architecture in timed assessment items',
        ],
        prerequisites: [ '53b35de6-e7de-45a7-a29d-3816af75de84' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '7f7ec038-b09d-45f0-a10e-1da4cf9f8704' ], criticalCompetencyIds: [ '7f7ec038-b09d-45f0-a10e-1da4cf9f8704' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '7f7ec038-b09d-45f0-a10e-1da4cf9f8704', '51c0ee1a-a92d-433e-a3cf-c6d7c81313c0', 'fb9b8f8d-9aae-42a9-aa2a-79c6c5dea338' ], criticalCompetencyIds: [ 'fb9b8f8d-9aae-42a9-aa2a-79c6c5dea338' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '7f7ec038-b09d-45f0-a10e-1da4cf9f8704', '51c0ee1a-a92d-433e-a3cf-c6d7c81313c0', 'fb9b8f8d-9aae-42a9-aa2a-79c6c5dea338', '24b43bd4-db2a-4cf8-afdb-69d061f3126c', '53b35de6-e7de-45a7-a29d-3816af75de84' ], criticalCompetencyIds: [ '24b43bd4-db2a-4cf8-afdb-69d061f3126c', '53b35de6-e7de-45a7-a29d-3816af75de84' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '7f7ec038-b09d-45f0-a10e-1da4cf9f8704', '51c0ee1a-a92d-433e-a3cf-c6d7c81313c0', 'fb9b8f8d-9aae-42a9-aa2a-79c6c5dea338', '24b43bd4-db2a-4cf8-afdb-69d061f3126c', '53b35de6-e7de-45a7-a29d-3816af75de84', '67a88ae6-8923-4755-a415-cfc6354c46b6' ], criticalCompetencyIds: [ '53b35de6-e7de-45a7-a29d-3816af75de84', '67a88ae6-8923-4755-a415-cfc6354c46b6' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of AR / VR Development',
      INTERMEDIATE: 'Independent execution of bounded AR / VR Development tasks',
      ADVANCED: 'Owns AR / VR Development components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for AR / VR Development at org scale',
    },
    assessmentBlueprint: 'SDE_WEB_FRAMEWORKS',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  },
  'VERSION_CONTROL_CODE_COLLABORATION': {
    skillCode: 'VERSION_CONTROL_CODE_COLLABORATION',
    name: 'Git & Version Control',
    domain: 'SOFTWARE_IT',
    category: 'Delivery, Process & Tooling',
    prerequisites: [],
    competencyModel: [
      {
        competencyId: '88c8c87a-a17c-4f05-a9b4-c7deb86fd86d',
        skillCode: 'VERSION_CONTROL_CODE_COLLABORATION',
        capability: 'Git fundamentals & branching strategies',
        observableBehaviours: [
          'Explains git fundamentals & branching strategies accurately under assessment conditions',
          'Applies git fundamentals & branching strategies to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates git fundamentals & branching strategies in timed assessment items',
        ],
        prerequisites: [],
        role: 'core',
      },
      {
        competencyId: 'c66f5149-7600-4f00-adfa-64c80eda79c4',
        skillCode: 'VERSION_CONTROL_CODE_COLLABORATION',
        capability: 'Pull requests, code review & merge policies',
        observableBehaviours: [
          'Explains pull requests, code review & merge policies accurately under assessment conditions',
          'Applies pull requests, code review & merge policies to bounded practical problems',
        ],
        difficulty: 'BEGINNER',
        assessmentCriteria: [
          'Demonstrates pull requests, code review & merge policies in timed assessment items',
        ],
        prerequisites: [ '88c8c87a-a17c-4f05-a9b4-c7deb86fd86d' ],
        role: 'core',
      },
      {
        competencyId: '3881361d-f02b-4394-ae53-f116f3a75f0e',
        skillCode: 'VERSION_CONTROL_CODE_COLLABORATION',
        capability: 'Rebase, cherry-pick & conflict resolution',
        observableBehaviours: [
          'Explains rebase, cherry-pick & conflict resolution accurately under assessment conditions',
          'Applies rebase, cherry-pick & conflict resolution to bounded practical problems',
        ],
        difficulty: 'INTERMEDIATE',
        assessmentCriteria: [
          'Demonstrates rebase, cherry-pick & conflict resolution in timed assessment items',
        ],
        prerequisites: [ 'c66f5149-7600-4f00-adfa-64c80eda79c4' ],
        role: 'supporting',
      },
      {
        competencyId: '36bb440b-6de2-49ae-a52a-3018b7749129',
        skillCode: 'VERSION_CONTROL_CODE_COLLABORATION',
        capability: 'Hooks, signed commits & repo hygiene',
        observableBehaviours: [
          'Explains hooks, signed commits & repo hygiene accurately under assessment conditions',
          'Applies hooks, signed commits & repo hygiene to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates hooks, signed commits & repo hygiene in timed assessment items',
        ],
        prerequisites: [ '3881361d-f02b-4394-ae53-f116f3a75f0e' ],
        role: 'critical',
      },
      {
        competencyId: '914698df-ad0a-4d68-af51-757f2e5e37f1',
        skillCode: 'VERSION_CONTROL_CODE_COLLABORATION',
        capability: 'Monorepo vs polyrepo collaboration patterns',
        observableBehaviours: [
          'Explains monorepo vs polyrepo collaboration patterns accurately under assessment conditions',
          'Applies monorepo vs polyrepo collaboration patterns to bounded practical problems',
        ],
        difficulty: 'ADVANCED',
        assessmentCriteria: [
          'Demonstrates monorepo vs polyrepo collaboration patterns in timed assessment items',
        ],
        prerequisites: [ '36bb440b-6de2-49ae-a52a-3018b7749129' ],
        role: 'critical',
      },
      {
        competencyId: '9898d4a7-7dfe-4202-af42-f8c7b4e8312b',
        skillCode: 'VERSION_CONTROL_CODE_COLLABORATION',
        capability: 'Engineering collaboration platform design',
        observableBehaviours: [
          'Explains engineering collaboration platform design accurately under assessment conditions',
          'Applies engineering collaboration platform design to bounded practical problems',
        ],
        difficulty: 'PROFESSIONAL',
        assessmentCriteria: [
          'Demonstrates engineering collaboration platform design in timed assessment items',
        ],
        prerequisites: [ '914698df-ad0a-4d68-af51-757f2e5e37f1' ],
        role: 'critical',
      }
    ],
    proficiencyRequirements: [
      { level: 'BEGINNER', requiredCompetencyIds: [ '88c8c87a-a17c-4f05-a9b4-c7deb86fd86d' ], criticalCompetencyIds: [ '88c8c87a-a17c-4f05-a9b4-c7deb86fd86d' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'INTERMEDIATE', requiredCompetencyIds: [ '88c8c87a-a17c-4f05-a9b4-c7deb86fd86d', 'c66f5149-7600-4f00-adfa-64c80eda79c4', '3881361d-f02b-4394-ae53-f116f3a75f0e' ], criticalCompetencyIds: [ '3881361d-f02b-4394-ae53-f116f3a75f0e' ], realWorldApplicationRequired: false, substantialApplicationRequired: false, interviewRequired: false },
      { level: 'ADVANCED', requiredCompetencyIds: [ '88c8c87a-a17c-4f05-a9b4-c7deb86fd86d', 'c66f5149-7600-4f00-adfa-64c80eda79c4', '3881361d-f02b-4394-ae53-f116f3a75f0e', '36bb440b-6de2-49ae-a52a-3018b7749129', '914698df-ad0a-4d68-af51-757f2e5e37f1' ], criticalCompetencyIds: [ '36bb440b-6de2-49ae-a52a-3018b7749129', '914698df-ad0a-4d68-af51-757f2e5e37f1' ], realWorldApplicationRequired: true, substantialApplicationRequired: false, interviewRequired: true },
      { level: 'PROFESSIONAL', requiredCompetencyIds: [ '88c8c87a-a17c-4f05-a9b4-c7deb86fd86d', 'c66f5149-7600-4f00-adfa-64c80eda79c4', '3881361d-f02b-4394-ae53-f116f3a75f0e', '36bb440b-6de2-49ae-a52a-3018b7749129', '914698df-ad0a-4d68-af51-757f2e5e37f1', '9898d4a7-7dfe-4202-af42-f8c7b4e8312b' ], criticalCompetencyIds: [ '914698df-ad0a-4d68-af51-757f2e5e37f1', '9898d4a7-7dfe-4202-af42-f8c7b4e8312b' ], realWorldApplicationRequired: true, substantialApplicationRequired: true, interviewRequired: true },
    ],
    proficiencyDefinitions: {
      BEGINNER: 'Conceptual understanding with supervised application of Git & Version Control',
      INTERMEDIATE: 'Independent execution of bounded Git & Version Control tasks',
      ADVANCED: 'Owns Git & Version Control components end-to-end with trade-off reasoning',
      PROFESSIONAL: 'Sets standards and architecture for Git & Version Control at org scale',
    },
    assessmentBlueprint: 'SDE_GIT',
    evidenceRequirements: [
      { evidenceType: 'WORK_EXPERIENCE', minimumCount: 1, description: 'Demonstrated on-the-job use' },
      { evidenceType: 'PROJECT', minimumCount: 1, description: 'Personal contribution in a project' },
    ],
    freshnessPolicy: { maxAgeDays: 730, staleClass: 'STALE', refreshRequired: true },
    roleMappings: [],
  }
} as const;

export const SKILL_COMPETENCY_CODES = Object.keys(SKILL_COMPETENCY_INDEX);
