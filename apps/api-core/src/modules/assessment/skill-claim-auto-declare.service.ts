import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SKILL_DEFINITIONS,
  mergeLinkedProjectIds,
  mergeProjectTaggedMetadata,
  projectTaggedSkillClaimMetadata,
  resolveSkillFocus,
  skillClaimDeclareOrigin,
  type SkillProficiency,
} from '@smart/contracts';
import { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const ENTRY_PROFICIENCY: SkillProficiency = 'BEGINNER';

/**
 * Ensures SkillClaim rows exist when students tag skills on projects (CN-T04 extension).
 * Keeps assessment hub in sync without a separate Profile → Skills step.
 */
@Injectable()
export class SkillClaimAutoDeclareService {
  private readonly logger = new Logger(SkillClaimAutoDeclareService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureClaimsForProjectTags(
    studentId: string,
    projectId: string,
    skillCodes: readonly string[],
  ): Promise<void> {
    const unique = [...new Set(skillCodes.map((code) => code.trim()).filter(Boolean))];
    for (const skillCode of unique) {
      try {
        await this.ensureClaimForProjectTag(studentId, skillCode, projectId);
      } catch (err) {
        this.logger.warn(
          `Skipped auto-declare for ${skillCode} on project ${projectId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  private async ensureClaimForProjectTag(
    studentId: string,
    skillCode: string,
    projectId: string,
  ): Promise<void> {
    const def = SKILL_DEFINITIONS.find((skill) => skill.code === skillCode);
    if (!def || def.domain !== 'SOFTWARE_IT') return;

    const skill =
      (await this.prisma.skill.findUnique({ where: { code: def.code } })) ??
      (await this.prisma.skill.create({
        data: { code: def.code, name: def.name, domain: def.domain },
      }));

    const existing = await this.prisma.skillClaim.findUnique({
      where: { studentId_skillId: { studentId, skillId: skill.id } },
    });

    if (!existing) {
      const skillFocus = resolveSkillFocus(def.code, undefined);
      const metadata = {
        ...projectTaggedSkillClaimMetadata(projectId),
        ...(skillFocus ? { skillFocus } : {}),
      };
      await this.prisma.skillClaim.create({
        data: {
          studentId,
          skillId: skill.id,
          proficiency: ENTRY_PROFICIENCY,
          status: 'DECLARED',
          source: 'MANUAL',
          sourceMetadata: metadata as Prisma.InputJsonValue,
        },
      });
      return;
    }

    if (existing.status === 'VERIFIED' || existing.status === 'LOCKED') {
      return;
    }

    if (existing.status !== 'DECLARED' && existing.status !== 'BEGINNER_REATTEMPT') {
      return;
    }

    const origin = skillClaimDeclareOrigin({
      source: existing.source,
      sourceMetadata: existing.sourceMetadata,
    });
    const merged =
      origin === 'MANUAL'
        ? mergeLinkedProjectIds(existing.sourceMetadata, projectId)
        : mergeProjectTaggedMetadata(existing.sourceMetadata, projectId);
    const skillFocus = resolveSkillFocus(def.code, undefined);
    const nextMetadata = {
      ...merged,
      ...(skillFocus && !merged.skillFocus ? { skillFocus } : {}),
    };

    await this.prisma.skillClaim.update({
      where: { id: existing.id },
      data: {
        sourceMetadata: nextMetadata as Prisma.InputJsonValue,
      },
    });
  }
}
