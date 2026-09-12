import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CAREER_DOMAINS,
  TARGET_ROLES,
  buildSkillBlueprintForCategory,
  getSkillDefinition,
  type CareerDomainDto,
  type RecommendedSkillsResponse,
  type SkillBlueprintDto,
  type TargetRoleDto,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class EvidenceCatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCareerDomains(): Promise<CareerDomainDto[]> {
    try {
      const rows = await this.prisma.careerDomain.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
      if (rows.length > 0) {
        return rows.map((row) => ({
          domainId: row.code,
          name: row.name,
          description: row.description ?? undefined,
          skillIds: row.skillCodes,
          roleIds: row.roleCodes,
        }));
      }
    } catch {
      // fall through to contract seed
    }
    return [...CAREER_DOMAINS];
  }

  async listTargetRoles(domainId?: string): Promise<TargetRoleDto[]> {
    try {
      const rows = await this.prisma.targetRole.findMany({
        where: {
          active: true,
          ...(domainId ? { careerDomain: { code: domainId } } : {}),
        },
        include: { careerDomain: true },
        orderBy: { name: 'asc' },
      });
      if (rows.length > 0) {
        return rows.map((row) => ({
          roleId: row.code,
          name: row.name,
          domainId: row.careerDomain.code,
          recommendedSkillIds: row.recommendedSkillCodes,
          optionalSkillIds: row.optionalSkillCodes,
        }));
      }
    } catch {
      // fall through
    }
    return TARGET_ROLES.filter((role) => !domainId || role.domainId === domainId);
  }

  getRecommendedSkills(roleId: string): RecommendedSkillsResponse {
    const role = TARGET_ROLES.find((entry) => entry.roleId === roleId);
    if (!role) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Unknown target role ${roleId}.`,
        statusCode: 404,
      });
    }
    return {
      targetRoleId: role.roleId,
      recommendedSkillIds: [...role.recommendedSkillIds],
      optionalSkillIds: [...role.optionalSkillIds],
    };
  }

  getSkillBlueprint(skillCode: string): SkillBlueprintDto {
    const definition = getSkillDefinition(skillCode);
    if (!definition) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Unknown skill code ${skillCode}.`,
        statusCode: 404,
      });
    }
    return buildSkillBlueprintForCategory(
      definition.code,
      definition.name,
      definition.domain,
      definition.categoryName,
      definition.categoryId,
    );
  }
}
