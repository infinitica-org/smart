import { Buffer } from 'node:buffer';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LEVEL_DEFINITIONS,
  SKILL_CATEGORIES,
  SKILL_DEFINITIONS,
  TARGET_ROLES,
  TRACK_DEFINITIONS,
  TrackDtoSchema,
  buildSeSkillLibraryResponse,
  buildSkillLibraryResponse,
  CreateSkillDtoSchema,
  DefineCompetenciesDtoSchema,
  DefineProficiencyCriteriaDtoSchema,
  MapSkillsToRoleDtoSchema,
  MergeSkillsDtoSchema,
  UpdateSkillDtoSchema,
  type CreateSkillDto,
  type DefineCompetenciesDto,
  type DefineProficiencyCriteriaDto,
  type MapSkillsToRoleDto,
  type MergeSkillsDto,
  type ProficiencyCriteriaRecord,
  type RoleSkillMappingRecord,
  type SeSkillLibraryResponse,
  type SkillCompetenciesRecord,
  type SkillLibraryResponse,
  type SkillManagementRecord,
  type SkillMergeResultDto,
  type SkillQueryDto,
  type TrackDto,
  type UpdateSkillDto,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { passThresholdsFor } from './skill-pass-thresholds.js';
/** Scalar fields only — never select Unsupported("vector") embedding. */
const competencySelect = {
  id: true,
  domainCode: true,
  name: true,
  subDomain: true,
  realWorldWeight: true,
  assessedAtLevels: true,
} as const;

/** Frozen at boot — skill@1 taxonomy is immutable for this release. */
const SKILL_LIBRARY: SkillLibraryResponse = buildSkillLibraryResponse();

/** Frozen at boot — inf-se-v1 taxonomy is immutable for this release. */
const SE_SKILL_LIBRARY: SeSkillLibraryResponse = buildSeSkillLibraryResponse();

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listTracks(): Promise<TrackDto[]> {
    try {
      const rows = await this.prisma.track.findMany({
        include: {
          competencies: { select: competencySelect },
          levels: { orderBy: { levelNumber: 'asc' } },
        },
        orderBy: { code: 'asc' },
      });
      if (rows.length > 0) return rows.map(toTrackDto);
    } catch {
      // Empty database or Postgres down: serve the frozen contract catalogue so
      // frontend work is not blocked on migrations.
    }
    return TRACK_DEFINITIONS.map(fromContract);
  }

  private readonly customSkills: Map<string, SkillManagementRecord> = new Map();

  /** skill@1 library grouped by category (Global IT Skills Database). */
  listSkillLibrary(): SkillLibraryResponse {
    return SKILL_LIBRARY;
  }

  /** inf-se-v1 SE skill framework grouped by category A–I (S6-RM-13). */
  listSeSkillLibrary(): SeSkillLibraryResponse {
    return SE_SKILL_LIBRARY;
  }

  createSkill(dto: CreateSkillDto): SkillManagementRecord {
    const parsed = CreateSkillDtoSchema.parse(dto);
    const upperCode = parsed.code.toUpperCase();

    if (this.customSkills.has(upperCode) || SKILL_DEFINITIONS.some((s) => s.code === upperCode)) {
      throw new ConflictException({
        error: 'duplicate_skill_code',
        message: `Skill with code ${upperCode} already exists.`,
      });
    }

    const nameExists =
      Array.from(this.customSkills.values()).some(
        (s) => s.name.toLowerCase() === parsed.name.toLowerCase(),
      ) || SKILL_DEFINITIONS.some((s) => s.name.toLowerCase() === parsed.name.toLowerCase());

    if (nameExists) {
      throw new ConflictException({
        error: 'duplicate_skill_name',
        message: `Skill with name ${parsed.name} already exists.`,
      });
    }

    const categoryName =
      parsed.categoryName || SKILL_CATEGORIES[parsed.categoryId]?.name || parsed.categoryId;

    const now = new Date().toISOString();
    const record: SkillManagementRecord = {
      code: upperCode,
      name: parsed.name,
      categoryId: parsed.categoryId,
      categoryName,
      description: parsed.description || '',
      corroborationEligible: parsed.corroborationEligible ?? true,
      assessmentRequiredForClaim: parsed.assessmentRequiredForClaim ?? true,
      status: parsed.status || 'ACTIVE',
      aliases: parsed.aliases || [],
      createdAt: now,
      updatedAt: now,
    };

    this.customSkills.set(upperCode, record);
    return record;
  }

  updateSkill(code: string, dto: UpdateSkillDto): SkillManagementRecord {
    const upperCode = code.toUpperCase();
    const existing = this.customSkills.get(upperCode);

    let baseRecord: SkillManagementRecord;
    if (!existing) {
      const predefined = SKILL_DEFINITIONS.find((s) => s.code === upperCode);
      if (!predefined) {
        throw new NotFoundException({
          error: 'not_found',
          message: `Skill ${upperCode} not found.`,
        });
      }
      const now = new Date().toISOString();
      baseRecord = {
        code: predefined.code,
        name: predefined.name,
        categoryId: predefined.categoryId,
        categoryName: predefined.categoryName,
        description: '',
        corroborationEligible: predefined.corroborationEligible,
        assessmentRequiredForClaim: predefined.assessmentRequiredForClaim,
        status: 'ACTIVE',
        aliases: [],
        createdAt: now,
        updatedAt: now,
      };
    } else {
      baseRecord = existing;
    }

    const parsed = UpdateSkillDtoSchema.parse(dto);
    const updatedRecord: SkillManagementRecord = {
      ...baseRecord,
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.categoryId
        ? {
            categoryId: parsed.categoryId,
            categoryName: SKILL_CATEGORIES[parsed.categoryId]?.name || parsed.categoryId,
          }
        : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.corroborationEligible !== undefined
        ? { corroborationEligible: parsed.corroborationEligible }
        : {}),
      ...(parsed.assessmentRequiredForClaim !== undefined
        ? { assessmentRequiredForClaim: parsed.assessmentRequiredForClaim }
        : {}),
      ...(parsed.status ? { status: parsed.status } : {}),
      updatedAt: new Date().toISOString(),
    };

    this.customSkills.set(upperCode, updatedRecord);
    return updatedRecord;
  }

  mergeSkills(dto: MergeSkillsDto): SkillMergeResultDto {
    const parsed = MergeSkillsDtoSchema.parse(dto);
    const targetCode = parsed.targetSkillCode.toUpperCase();

    const targetRecord =
      this.customSkills.get(targetCode) || this.getPredefinedAsRecord(targetCode);
    if (!targetRecord) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Target skill ${targetCode} not found.`,
      });
    }

    const mergedCodes: string[] = [];
    const aliasesAdded: string[] = [];
    let recordsReboundCount = 0;

    for (const sourceCodeRaw of parsed.sourceSkillCodes) {
      const sourceCode = sourceCodeRaw.toUpperCase();
      if (sourceCode === targetCode) {
        throw new BadRequestException({
          error: 'invalid_merge_source',
          message: `Source skill code ${sourceCode} cannot be the same as target skill code.`,
        });
      }

      const sourceRecord =
        this.customSkills.get(sourceCode) || this.getPredefinedAsRecord(sourceCode);
      if (!sourceRecord) {
        throw new NotFoundException({
          error: 'not_found',
          message: `Source skill ${sourceCode} not found.`,
        });
      }

      mergedCodes.push(sourceCode);
      recordsReboundCount += 1;

      if (parsed.addAsAliases !== false) {
        if (!aliasesAdded.includes(sourceRecord.name)) aliasesAdded.push(sourceRecord.name);
        if (!aliasesAdded.includes(sourceCode)) aliasesAdded.push(sourceCode);
      }

      const archivedSource: SkillManagementRecord = {
        ...sourceRecord,
        status: 'ARCHIVED',
        description: `Merged into ${targetCode}`,
        updatedAt: new Date().toISOString(),
      };
      this.customSkills.set(sourceCode, archivedSource);
    }

    const updatedAliases = Array.from(new Set([...(targetRecord.aliases || []), ...aliasesAdded]));
    const updatedTarget: SkillManagementRecord = {
      ...targetRecord,
      aliases: updatedAliases,
      updatedAt: new Date().toISOString(),
    };

    this.customSkills.set(targetCode, updatedTarget);

    return {
      targetSkillCode: targetCode,
      mergedSkillCodes: mergedCodes,
      aliasesAdded,
      recordsReboundCount,
      mergedAt: new Date().toISOString(),
    };
  }

  private readonly roleMappings: Map<string, RoleSkillMappingRecord> = new Map();

  mapSkillsToRole(dto: MapSkillsToRoleDto): RoleSkillMappingRecord {
    const parsed = MapSkillsToRoleDtoSchema.parse(dto);
    const roleId = parsed.roleId.toUpperCase();

    const targetRole = TARGET_ROLES.find((r) => r.roleId === roleId);
    if (!targetRole) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Target job role ${roleId} not found in taxonomy.`,
      });
    }

    const availableManaged = this.listManagedSkills();
    const availableCodes = new Set(availableManaged.map((s) => s.code));

    for (const code of parsed.recommendedSkillCodes) {
      if (!availableCodes.has(code.toUpperCase())) {
        throw new NotFoundException({
          error: 'unknown_skill_code',
          message: `Recommended skill code ${code} not found.`,
        });
      }
    }

    for (const code of parsed.optionalSkillCodes) {
      if (!availableCodes.has(code.toUpperCase())) {
        throw new NotFoundException({
          error: 'unknown_skill_code',
          message: `Optional skill code ${code} not found.`,
        });
      }
    }

    const record: RoleSkillMappingRecord = {
      roleId: targetRole.roleId,
      roleName: targetRole.name,
      domainId: targetRole.domainId,
      recommendedSkillCodes: parsed.recommendedSkillCodes.map((c) => c.toUpperCase()),
      optionalSkillCodes: parsed.optionalSkillCodes.map((c) => c.toUpperCase()),
      mappedAt: new Date().toISOString(),
    };

    this.roleMappings.set(roleId, record);
    return record;
  }

  private readonly skillCompetencies: Map<string, SkillCompetenciesRecord> = new Map();

  defineCompetencies(skillCode: string, dto: DefineCompetenciesDto): SkillCompetenciesRecord {
    const parsed = DefineCompetenciesDtoSchema.parse({ ...dto, skillCode });
    const upperCode = parsed.skillCode.toUpperCase();

    const skill = this.customSkills.get(upperCode) || this.getPredefinedAsRecord(upperCode);
    if (!skill) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Parent skill ${upperCode} not found in taxonomy.`,
      });
    }

    const seenNames = new Set<string>();
    const entries = parsed.competencies.map((comp, index) => {
      const nameLower = comp.name.toLowerCase();
      if (seenNames.has(nameLower)) {
        throw new BadRequestException({
          error: 'duplicate_competency_name',
          message: `Duplicate competency topic name "${comp.name}" under skill ${upperCode}.`,
        });
      }
      seenNames.add(nameLower);

      return {
        competencyId: `${upperCode}_COMP_${index + 1}`,
        name: comp.name,
        subDomain: comp.subDomain || 'General',
        realWorldWeight: comp.realWorldWeight ?? 0.1667,
      };
    });

    const record: SkillCompetenciesRecord = {
      skillCode: upperCode,
      competencies: entries,
      updatedAt: new Date().toISOString(),
    };

    this.skillCompetencies.set(upperCode, record);
    return record;
  }

  private readonly proficiencyCriteria: Map<string, ProficiencyCriteriaRecord> = new Map();

  defineProficiencyCriteria(
    skillCode: string,
    dto: DefineProficiencyCriteriaDto,
  ): ProficiencyCriteriaRecord {
    const parsed = DefineProficiencyCriteriaDtoSchema.parse({ ...dto, skillCode });
    const upperCode = parsed.skillCode.toUpperCase();

    const skill = this.customSkills.get(upperCode) || this.getPredefinedAsRecord(upperCode);
    if (!skill) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Parent skill ${upperCode} not found in taxonomy.`,
      });
    }

    const expectedTiers = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
    const providedTiers = parsed.tiers.map((t) => t.tier);

    for (const exp of expectedTiers) {
      if (!providedTiers.includes(exp)) {
        throw new BadRequestException({
          error: 'missing_proficiency_tier',
          message: `Proficiency criteria must include tier ${exp}.`,
        });
      }
    }

    const sorted = [...parsed.tiers].sort(
      (a, b) => expectedTiers.indexOf(a.tier) - expectedTiers.indexOf(b.tier),
    );

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]!.minScore <= sorted[i - 1]!.minScore) {
        throw new BadRequestException({
          error: 'invalid_score_thresholds',
          message: `Min score for tier ${sorted[i]!.tier} must be strictly greater than tier ${sorted[i - 1]!.tier}.`,
        });
      }
    }

    const record: ProficiencyCriteriaRecord = {
      skillCode: upperCode,
      tiers: sorted,
      updatedAt: new Date().toISOString(),
    };

    this.proficiencyCriteria.set(upperCode, record);
    return record;
  }

  private getPredefinedAsRecord(code: string): SkillManagementRecord | undefined {
    const def = SKILL_DEFINITIONS.find((s) => s.code === code);
    if (!def) return undefined;
    const now = new Date().toISOString();
    return {
      code: def.code,
      name: def.name,
      categoryId: def.categoryId,
      categoryName: def.categoryName,
      description: '',
      corroborationEligible: def.corroborationEligible,
      assessmentRequiredForClaim: def.assessmentRequiredForClaim,
      status: 'ACTIVE',
      aliases: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  listManagedSkills(query?: SkillQueryDto): SkillManagementRecord[] {
    const map = new Map<string, SkillManagementRecord>();
    const now = new Date().toISOString();

    for (const def of SKILL_DEFINITIONS) {
      map.set(def.code, {
        code: def.code,
        name: def.name,
        categoryId: def.categoryId,
        categoryName: def.categoryName,
        description: '',
        corroborationEligible: def.corroborationEligible,
        assessmentRequiredForClaim: def.assessmentRequiredForClaim,
        status: 'ACTIVE',
        aliases: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const [c, record] of this.customSkills.entries()) {
      map.set(c, record);
    }

    let list = Array.from(map.values());

    if (query?.categoryId) {
      list = list.filter((s) => s.categoryId === query.categoryId);
    }
    if (query?.status) {
      list = list.filter((s) => s.status === query.status);
    }
    if (query?.search) {
      const term = query.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.code.toLowerCase().includes(term) ||
          (s.aliases && s.aliases.some((alias) => alias.toLowerCase().includes(term))),
      );
    }

    return list;
  }

  async getTrack(trackCode: string): Promise<TrackDto> {
    try {
      const row = await this.prisma.track.findUnique({
        where: { code: trackCode },
        include: {
          competencies: { select: competencySelect },
          levels: { orderBy: { levelNumber: 'asc' } },
        },
      });
      if (row) return toTrackDto(row);
    } catch {
      // fall through to contract defaults
    }

    const definition = TRACK_DEFINITIONS.find((track) => track.code === trackCode);
    if (!definition) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Unknown track ${trackCode}.`,
        statusCode: 404,
      });
    }
    return fromContract(definition);
  }
}

function fromContract(definition: (typeof TRACK_DEFINITIONS)[number]): TrackDto {
  return TrackDtoSchema.parse({
    trackId: nilUuid(definition.code),
    code: definition.code,
    name: definition.name,
    category: definition.category,
    launchStatus: definition.launchStatus,
    calibrationStatus: 'NOT_CALIBRATED',
    foundationWeight: definition.foundationWeight,
    capstoneBrief: definition.capstone,
    competencies: definition.domains.flatMap((domain) =>
      domain.topics.map((topic, index) => ({
        competencyId: nilUuid(`${definition.code}:${domain.code}:${String(index)}`),
        trackCode: definition.code,
        domainCode: domain.code,
        name: topic,
        subDomain: domain.name,
        realWorldWeight: Number((domain.weight / domain.topics.length).toFixed(4)),
        assessedAtLevels: [...domain.assessedAtLevels],
        passThresholds: passThresholdsFor(definition.code, topic),
      })),
    ),
    levels: LEVEL_DEFINITIONS.map((level) => ({
      levelId: nilUuid(`${definition.code}:L${String(level.level)}`),
      trackCode: definition.code,
      levelNumber: level.level,
      name: level.name,
      format: level.format,
      durationMinutes: level.defaultDurationMinutes,
      itemCount: 0,
      cutScoresPublished: false,
    })),
  });
}

function toTrackDto(row: {
  id: string;
  code: string;
  name: string;
  category: TrackDto['category'];
  launchStatus: TrackDto['launchStatus'];
  calibrationStatus: TrackDto['calibrationStatus'];
  foundationWeight: { toNumber(): number } | number;
  capstoneBrief: string;
  competencies: Array<{
    id: string;
    domainCode: TrackDto['competencies'][number]['domainCode'];
    name: string;
    subDomain: string;
    realWorldWeight: { toNumber(): number } | number;
    assessedAtLevels: number[];
  }>;
  levels: Array<{
    id: string;
    levelNumber: number;
    name: string;
    format: TrackDto['levels'][number]['format'];
    durationMinutes: number;
    itemCount: number;
  }>;
}): TrackDto {
  return TrackDtoSchema.parse({
    trackId: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    launchStatus: row.launchStatus,
    calibrationStatus: row.calibrationStatus,
    foundationWeight: decimal(row.foundationWeight),
    capstoneBrief: row.capstoneBrief,
    competencies: row.competencies.map((competency) => ({
      competencyId: competency.id,
      trackCode: row.code,
      domainCode: competency.domainCode,
      name: competency.name,
      subDomain: competency.subDomain,
      realWorldWeight: decimal(competency.realWorldWeight),
      assessedAtLevels: competency.assessedAtLevels,
      passThresholds: passThresholdsFor(row.code, competency.name),
    })),
    levels: row.levels.map((level) => ({
      levelId: level.id,
      trackCode: row.code,
      levelNumber: level.levelNumber,
      name: level.name,
      format: level.format,
      durationMinutes: level.durationMinutes,
      itemCount: level.itemCount,
      cutScoresPublished: false,
    })),
  });
}

function decimal(value: { toNumber(): number } | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

function nilUuid(seed: string): string {
  const hex = Buffer.from(seed).toString('hex').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
