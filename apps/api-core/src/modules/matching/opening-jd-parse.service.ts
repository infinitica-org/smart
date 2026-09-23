import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  JdSkillExtractVectorSchema,
  SKILL_CODE_SET,
  SKILL_DEFINITIONS,
  SkillProficiencySchema,
  getSkillBlueprint,
  type JdSkillExtractVector,
  type SkillRequirement,
} from '@smart/contracts';
import { JD_SKILL_EXTRACT_PROMPT_REF } from '@smart/prompts';
import { z } from 'zod';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const RawJdSkillExtractSchema = z.object({
  requiredSkills: z
    .array(
      z.object({
        skillCode: z.string(),
        minProficiency: SkillProficiencySchema,
      }),
    )
    .max(20),
  emphasisedCapabilities: z
    .array(
      z.object({
        competencyId: z.string().uuid(),
        capability: z.string(),
        skillCode: z.string(),
        role: z.enum(['critical', 'core', 'supporting']).default('core'),
      }),
    )
    .max(30),
  parseConfidence: z.number().min(0).max(1),
});

@Injectable()
export class OpeningJdParseService {
  private readonly logger = new Logger(OpeningJdParseService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AiGatewayService) private readonly gateway: AiGatewayService,
  ) {}

  async parseOpening(openingId: string): Promise<void> {
    const opening = await this.prisma.jobOpening.findUnique({
      where: { id: openingId },
      select: {
        id: true,
        companyName: true,
        roleTitle: true,
        rawText: true,
        requiredSkills: { include: { skill: { select: { code: true } } } },
      },
    });
    if (!opening?.rawText?.trim()) {
      return;
    }

    try {
      const extracted = await this.extractFromText(
        opening.companyName,
        opening.roleTitle,
        opening.rawText.trim(),
      );
      await this.persistExtract(openingId, extracted);
    } catch (error) {
      this.logger.warn(
        `JD parse failed for opening ${openingId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      await this.prisma.jobOpening.update({
        where: { id: openingId },
        data: { jdParseStatus: 'FAILED' },
      });
    }
  }

  async extractFromText(
    companyName: string,
    roleTitle: string,
    rawText: string,
  ): Promise<JdSkillExtractVector> {
    const competencyCatalog = SKILL_DEFINITIONS.flatMap((skill) => {
      const blueprint = getSkillBlueprint(skill.code);
      return (blueprint?.competencyModel ?? []).map((row) => ({
        competencyId: row.competencyId,
        skillCode: row.skillCode,
        capability: row.capability,
        role: row.role,
      }));
    });

    const output = await this.gateway.complete({
      promptRef: JD_SKILL_EXTRACT_PROMPT_REF,
      modelRole: 'PRIMARY_REASONING',
      priority: 'P3_BATCH',
      variables: {
        companyName,
        roleTitle,
        rawText,
        skillCatalog: SKILL_DEFINITIONS.map((skill) => ({
          code: skill.code,
          name: skill.name,
          categoryName: skill.categoryName,
        })),
        competencyCatalog,
      },
      correlation: {},
      maxOutputTokens: 2_048,
      temperature: 0,
    });

    return this.sanitizeExtract(RawJdSkillExtractSchema.parse(output.output));
  }

  sanitizeExtract(raw: z.infer<typeof RawJdSkillExtractSchema>): JdSkillExtractVector {
    const competencyIds = new Set(
      SKILL_DEFINITIONS.flatMap((skill) => {
        const blueprint = getSkillBlueprint(skill.code);
        return (blueprint?.competencyModel ?? []).map((row) => row.competencyId);
      }),
    );

    const requiredSkills: SkillRequirement[] = [];
    for (const skill of raw.requiredSkills) {
      if (!SKILL_CODE_SET.has(skill.skillCode)) continue;
      requiredSkills.push({
        skillCode: skill.skillCode as SkillRequirement['skillCode'],
        minProficiency: skill.minProficiency,
      });
    }

    const emphasisedCapabilities = raw.emphasisedCapabilities.filter(
      (row) => SKILL_CODE_SET.has(row.skillCode) && competencyIds.has(row.competencyId),
    );

    return JdSkillExtractVectorSchema.parse({
      requiredSkills,
      emphasisedCapabilities,
      parseConfidence: raw.parseConfidence,
    });
  }

  private async persistExtract(openingId: string, extracted: JdSkillExtractVector): Promise<void> {
    await this.prisma.jobOpening.update({
      where: { id: openingId },
      data: {
        jdParseStatus: 'PARSED',
        parseConfidence: extracted.parseConfidence,
        parsedAt: new Date(),
        parsedRequirements: extracted as never,
      },
    });

    if (extracted.parseConfidence < 0.6) {
      return;
    }

    const opening = await this.prisma.jobOpening.findUnique({
      where: { id: openingId },
      include: { requiredSkills: { include: { skill: { select: { code: true } } } } },
    });
    if (!opening) return;

    const manualCodes = new Set(opening.requiredSkills.map((row) => row.skill.code));
    const toMerge = extracted.requiredSkills.filter((skill) => !manualCodes.has(skill.skillCode));
    if (toMerge.length === 0) return;

    const skills = await this.prisma.skill.findMany({
      where: { code: { in: toMerge.map((row) => row.skillCode) } },
      select: { id: true, code: true },
    });
    const skillIdByCode = new Map(skills.map((skill) => [skill.code, skill.id]));

    for (const requirement of toMerge) {
      const skillId = skillIdByCode.get(requirement.skillCode);
      if (!skillId) continue;
      await this.prisma.jobOpeningSkill.create({
        data: {
          openingId,
          skillId,
          minProficiency: requirement.minProficiency,
        },
      });
    }
  }
}
