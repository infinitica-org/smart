import { describe, expect, it, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CatalogService } from '../catalog.service.js';

describe('CatalogService - Skill Management (Th6-I297)', () => {
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
});
