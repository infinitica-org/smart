import { describe, expect, it, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CatalogService } from '../catalog.service.js';

describe('CatalogService - Skill Management (Th6-I297 & Th6-I298)', () => {
  let service: CatalogService;

  beforeEach(() => {
    service = new CatalogService({} as any);
  });

  it('creates a new custom skill successfully', () => {
    const created = service.createSkill({
      code: 'GRAPHQL_ADVANCED_API_DESIGN',
      name: 'GraphQL Advanced API Design',
      categoryId: 'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
      description: 'Advanced schema stitching and federation in GraphQL',
      corroborationEligible: true,
      assessmentRequiredForClaim: true,
      status: 'ACTIVE',
    });

    expect(created.code).toBe('GRAPHQL_ADVANCED_API_DESIGN');
    expect(created.name).toBe('GraphQL Advanced API Design');
    expect(created.categoryId).toBe('SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN');
    expect(created.status).toBe('ACTIVE');
  });

  it('rejects duplicate skill code', () => {
    service.createSkill({
      code: 'ELIXIR_BEAM_ENGINEERING',
      name: 'Elixir BEAM Engineering',
      categoryId: 'PROGRAMMING_LANGUAGES',
    });

    expect(() =>
      service.createSkill({
        code: 'ELIXIR_BEAM_ENGINEERING',
        name: 'Elixir BEAM Systems',
        categoryId: 'PROGRAMMING_LANGUAGES',
      }),
    ).toThrow(ConflictException);
  });

  it('rejects duplicate skill name', () => {
    service.createSkill({
      code: 'HASKELL_FUNCTIONAL_PROGRAMMING',
      name: 'Haskell Programming',
      categoryId: 'PROGRAMMING_LANGUAGES',
    });

    expect(() =>
      service.createSkill({
        code: 'HASKELL_ADVANCED',
        name: 'Haskell Programming',
        categoryId: 'PROGRAMMING_LANGUAGES',
      }),
    ).toThrow(ConflictException);
  });

  it('updates an existing custom skill status to DRAFT or ARCHIVED', () => {
    service.createSkill({
      code: 'SOLIDITY_SMART_CONTRACTS',
      name: 'Solidity Smart Contracts',
      categoryId: 'EMERGING_TECHNOLOGY',
      status: 'ACTIVE',
    });

    const updated = service.updateSkill('SOLIDITY_SMART_CONTRACTS', {
      status: 'ARCHIVED',
      description: 'Phased out in favor of Rust contracts',
    });

    expect(updated.status).toBe('ARCHIVED');
    expect(updated.description).toBe('Phased out in favor of Rust contracts');
  });

  it('throws NotFoundException when updating non-existent skill', () => {
    expect(() =>
      service.updateSkill('NON_EXISTENT_SKILL_99', {
        status: 'ARCHIVED',
      }),
    ).toThrow(NotFoundException);
  });

  it('lists managed skills with filtering', () => {
    service.createSkill({
      code: 'NATIVE_VISIONOS_DEV',
      name: 'visionOS Spatial Development',
      categoryId: 'EMERGING_TECHNOLOGY',
      status: 'DRAFT',
    });

    const draftSkills = service.listManagedSkills({ status: 'DRAFT' });
    expect(draftSkills.some((s) => s.code === 'NATIVE_VISIONOS_DEV')).toBe(true);

    const searchResult = service.listManagedSkills({ search: 'visionOS' });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0]?.name).toBe('visionOS Spatial Development');
  });

  it('merges duplicate skills and registers aliases successfully (Th6-I298)', () => {
    service.createSkill({
      code: 'JS_LEGACY',
      name: 'JS',
      categoryId: 'PROGRAMMING_LANGUAGES',
      status: 'ACTIVE',
    });

    service.createSkill({
      code: 'ECMASCRIPT_6',
      name: 'ECMAScript',
      categoryId: 'PROGRAMMING_LANGUAGES',
      status: 'ACTIVE',
    });

    const mergeResult = service.mergeSkills({
      targetSkillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
      sourceSkillCodes: ['JS_LEGACY', 'ECMASCRIPT_6'],
      addAsAliases: true,
    });

    expect(mergeResult.targetSkillCode).toBe('JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT');
    expect(mergeResult.mergedSkillCodes).toEqual(['JS_LEGACY', 'ECMASCRIPT_6']);
    expect(mergeResult.aliasesAdded).toContain('JS');
    expect(mergeResult.aliasesAdded).toContain('ECMAScript');

    // Searching by newly added alias should return target skill
    const searchByAlias = service.listManagedSkills({ search: 'ECMAScript' });
    expect(
      searchByAlias.some((s) => s.code === 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT'),
    ).toBe(true);

    // Source skills should be archived
    const archivedList = service.listManagedSkills({ status: 'ARCHIVED' });
    expect(archivedList.some((s) => s.code === 'JS_LEGACY')).toBe(true);
  });

  it('throws BadRequestException if source skill equals target skill during merge', () => {
    expect(() =>
      service.mergeSkills({
        targetSkillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
        sourceSkillCodes: ['JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT'],
      }),
    ).toThrow(BadRequestException);
  });

  it('throws NotFoundException if target skill code is unknown', () => {
    expect(() =>
      service.mergeSkills({
        targetSkillCode: 'UNKNOWN_TARGET_CODE',
        sourceSkillCodes: ['JS_LEGACY'],
      }),
    ).toThrow(NotFoundException);
  });

  it('maps recommended and optional skills to a target job role successfully (Th6-I299)', () => {
    const result = service.mapSkillsToRole({
      roleId: 'BACKEND_DEVELOPER',
      recommendedSkillCodes: [
        'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
      ],
      optionalSkillCodes: ['CONTAINERIZATION_ORCHESTRATION'],
    });

    expect(result.roleId).toBe('BACKEND_DEVELOPER');
    expect(result.recommendedSkillCodes).toEqual([
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
    ]);
    expect(result.optionalSkillCodes).toEqual(['CONTAINERIZATION_ORCHESTRATION']);
  });

  it('throws NotFoundException when mapping skills to an invalid roleId', () => {
    expect(() =>
      service.mapSkillsToRole({
        roleId: 'INVALID_ROLE_99',
        recommendedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      }),
    ).toThrow(NotFoundException);
  });

  it('throws NotFoundException when mapping an unrecognised skill code', () => {
    expect(() =>
      service.mapSkillsToRole({
        roleId: 'BACKEND_DEVELOPER',
        recommendedSkillCodes: ['UNKNOWN_SKILL_CODE_XYZ'],
      }),
    ).toThrow(NotFoundException);
  });

  it('defines nested sub-competencies under a skill successfully (Th6-I300)', () => {
    const result = service.defineCompetencies('PYTHON_APPLICATION_BACKEND_DEVELOPMENT', {
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      competencies: [
        {
          name: 'Async I/O and asyncio Event Loops',
          subDomain: 'Concurrency',
          realWorldWeight: 0.25,
        },
        {
          name: 'FastAPI and Pydantic Request Validation',
          subDomain: 'API Design',
          realWorldWeight: 0.25,
        },
        {
          name: 'SQLAlchemy ORM and Migration Safety',
          subDomain: 'Persistence',
          realWorldWeight: 0.25,
        },
      ],
    });

    expect(result.skillCode).toBe('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    expect(result.competencies.length).toBe(3);
    expect(result.competencies[0]?.competencyId).toBe(
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT_COMP_1',
    );
    expect(result.competencies[0]?.name).toBe('Async I/O and asyncio Event Loops');
  });

  it('throws NotFoundException if parent skill code does not exist when defining competencies', () => {
    expect(() =>
      service.defineCompetencies('NON_EXISTENT_SKILL_CODE', {
        skillCode: 'NON_EXISTENT_SKILL_CODE',
        competencies: [{ name: 'Topic 1' }],
      }),
    ).toThrow(NotFoundException);
  });

  it('throws BadRequestException if duplicate competency topic names are provided for the same skill', () => {
    expect(() =>
      service.defineCompetencies('PYTHON_APPLICATION_BACKEND_DEVELOPMENT', {
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        competencies: [{ name: 'Async I/O' }, { name: 'Async I/O' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('defines 5-tier (L1 to L5) proficiency criteria for a skill successfully (Th6-I301)', () => {
    const result = service.defineProficiencyCriteria('PYTHON_APPLICATION_BACKEND_DEVELOPMENT', {
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      tiers: [
        {
          tier: 'L1',
          name: 'Beginner',
          minScore: 0,
          description: 'Basic understanding of Python syntax and control flow.',
        },
        {
          tier: 'L2',
          name: 'Intermediate',
          minScore: 25,
          description: 'Proficient with standard libraries and simple web APIs.',
        },
        {
          tier: 'L3',
          name: 'Proficient',
          minScore: 50,
          description: 'Designs structured services with async and ORMs.',
        },
        {
          tier: 'L4',
          name: 'Advanced',
          minScore: 75,
          description: 'Optimizes high-concurrency systems and architecture.',
        },
        {
          tier: 'L5',
          name: 'Professional',
          minScore: 90,
          description: 'Mastery over core internals, ecosystem, and scaling.',
        },
      ],
    });

    expect(result.skillCode).toBe('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    expect(result.tiers.length).toBe(5);
    expect(result.tiers.map((t) => t.tier)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    expect(result.tiers[0]?.name).toBe('Beginner');
    expect(result.tiers[4]?.name).toBe('Professional');
  });

  it('throws NotFoundException if parent skill code does not exist when defining proficiency criteria', () => {
    expect(() =>
      service.defineProficiencyCriteria('NON_EXISTENT_SKILL_CODE', {
        skillCode: 'NON_EXISTENT_SKILL_CODE',
        tiers: [
          { tier: 'L1', name: 'Beginner', minScore: 0, description: 'L1 desc' },
          { tier: 'L2', name: 'Intermediate', minScore: 20, description: 'L2 desc' },
          { tier: 'L3', name: 'Proficient', minScore: 40, description: 'L3 desc' },
          { tier: 'L4', name: 'Advanced', minScore: 60, description: 'L4 desc' },
          { tier: 'L5', name: 'Professional', minScore: 80, description: 'L5 desc' },
        ],
      }),
    ).toThrow(NotFoundException);
  });

  it('throws BadRequestException if any of the 5 tiers (L1 to L5) are missing', () => {
    expect(() =>
      service.defineProficiencyCriteria('PYTHON_APPLICATION_BACKEND_DEVELOPMENT', {
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        tiers: [
          { tier: 'L1', name: 'Beginner', minScore: 0, description: 'L1 desc' },
          { tier: 'L2', name: 'Intermediate', minScore: 20, description: 'L2 desc' },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
