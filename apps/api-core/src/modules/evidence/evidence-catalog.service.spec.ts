import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EvidenceCatalogService } from './evidence-catalog.service.js';

describe('EvidenceCatalogService', () => {
  it('falls back to contract seed for career domains when db is empty', async () => {
    const prisma = {
      careerDomain: { findMany: vi.fn().mockResolvedValue([]) },
      targetRole: { findMany: vi.fn() },
    };
    const service = new EvidenceCatalogService(prisma as never);
    const domains = await service.listCareerDomains();
    expect(domains.some((d) => d.domainId === 'SOFTWARE_IT')).toBe(true);
  });

  it('returns recommended skills for a known target role', () => {
    const service = new EvidenceCatalogService({} as never);
    const skills = service.getRecommendedSkills('FULL_STACK_DEVELOPER');
    expect(skills.recommendedSkillIds.length).toBeGreaterThan(0);
  });

  it('throws for unknown target role', () => {
    const service = new EvidenceCatalogService({} as never);
    expect(() => service.getRecommendedSkills('UNKNOWN_ROLE')).toThrow(NotFoundException);
  });

  it('returns skill blueprint for taxonomy code', () => {
    const service = new EvidenceCatalogService({} as never);
    const blueprint = service.getSkillBlueprint('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    expect(blueprint.skillCode).toBe('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    expect(blueprint.evidenceRequirements.length).toBeGreaterThan(0);
  });
});
