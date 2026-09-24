import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateAdminItemRequestSchema,
  CreateAdminLevelRequestSchema,
  UpdateAdminItemRequestSchema,
  UpdateAdminLevelRequestSchema,
  UpsertAdminCutScoreRequestSchema,
  UuidSchema,
  type AdminCutScoreDto,
  type AdminItemDto,
  type AdminLevelDto,
  type CreateAdminItemRequest,
  type ListAdminCutScoresResponse,
  type ListAdminItemsResponse,
  type ListAdminLevelsResponse,
} from '@smart/contracts';
import { Prisma, type ItemType } from '../../generated/prisma/index.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const ACTIVE_ATTEMPT_STATUSES = ['IN_PROGRESS', 'SUBMITTED', 'EVALUATING'] as const;
const MCQ_TYPES = new Set<ItemType>(['MCQ_SINGLE', 'MCQ_MULTI']);
const SUBJECTIVE_TYPES = new Set<ItemType>([
  'SHORT_ANSWER',
  'SCENARIO_RESPONSE',
  'SPOKEN_RESPONSE',
]);

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
  );
}

function num(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

@Injectable()
export class AssessmentAdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async listLevels(): Promise<ListAdminLevelsResponse> {
    const rows = await this.prisma.level.findMany({
      orderBy: [{ track: { code: 'asc' } }, { levelNumber: 'asc' }],
      include: { track: { select: { id: true, code: true, name: true } } },
    });
    return { levels: rows.map((row) => this.toLevelDto(row)) };
  }

  async getLevel(levelId: string): Promise<AdminLevelDto> {
    const id = UuidSchema.parse(levelId);
    const row = await this.prisma.level.findUnique({
      where: { id },
      include: { track: { select: { id: true, code: true, name: true } } },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Level not found.',
        statusCode: 404,
      });
    }
    return this.toLevelDto(row);
  }

  async createLevel(actorId: string, body: unknown): Promise<AdminLevelDto> {
    const request = CreateAdminLevelRequestSchema.parse(body);
    await this.assertTrackExists(request.trackId);

    try {
      const created = await this.prisma.level.create({
        data: {
          trackId: request.trackId,
          levelNumber: request.levelNumber,
          name: request.name.trim(),
          format: request.format,
          durationMinutes: request.durationMinutes,
        },
        include: { track: { select: { id: true, code: true, name: true } } },
      });

      await this.auditPublisher.record({
        actorId,
        action: 'admin.level.created',
        resourceType: 'Level',
        resourceId: created.id,
        reasonCode: null,
        metadata: {
          trackId: created.trackId,
          levelNumber: created.levelNumber,
          format: created.format,
          durationMinutes: created.durationMinutes,
        },
      });

      return this.toLevelDto(created);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          error: 'conflict',
          message: 'A level with this track and level number already exists.',
          statusCode: 409,
        });
      }
      throw error;
    }
  }

  async updateLevel(actorId: string, levelId: string, body: unknown): Promise<AdminLevelDto> {
    const id = UuidSchema.parse(levelId);
    const request = UpdateAdminLevelRequestSchema.parse(body);
    const existing = await this.prisma.level.findUnique({
      where: { id },
      include: { track: { select: { id: true, code: true, name: true } } },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Level not found.',
        statusCode: 404,
      });
    }

    if (
      (request.format !== undefined || request.durationMinutes !== undefined) &&
      (await this.hasActiveAttemptsForLevel(id))
    ) {
      throw new ConflictException({
        error: 'active_attempt',
        message: 'Cannot change format or duration while attempts are in progress.',
        statusCode: 409,
      });
    }

    const updated = await this.prisma.level.update({
      where: { id },
      data: {
        ...(request.name !== undefined ? { name: request.name.trim() } : {}),
        ...(request.format !== undefined ? { format: request.format } : {}),
        ...(request.durationMinutes !== undefined
          ? { durationMinutes: request.durationMinutes }
          : {}),
      },
      include: { track: { select: { id: true, code: true, name: true } } },
    });

    await this.auditPublisher.record({
      actorId,
      action: 'admin.level.updated',
      resourceType: 'Level',
      resourceId: id,
      reasonCode: null,
      metadata: {
        previous: {
          name: existing.name,
          format: existing.format,
          durationMinutes: existing.durationMinutes,
        },
        next: {
          name: updated.name,
          format: updated.format,
          durationMinutes: updated.durationMinutes,
        },
      },
    });

    return this.toLevelDto(updated);
  }

  async listItems(levelId: string): Promise<ListAdminItemsResponse> {
    const id = UuidSchema.parse(levelId);
    await this.assertLevelExists(id);
    const rows = await this.prisma.item.findMany({
      where: { levelId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        options: true,
        competency: { select: { name: true } },
      },
    });
    return { items: rows.map((row) => this.toItemDto(row)) };
  }

  async createItem(actorId: string, levelId: string, body: unknown): Promise<AdminItemDto> {
    const id = UuidSchema.parse(levelId);
    const request = CreateAdminItemRequestSchema.parse(body);
    const level = await this.prisma.level.findUnique({
      where: { id },
      include: { track: true },
    });
    if (!level) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Level not found.',
        statusCode: 404,
      });
    }
    await this.assertCompetencyForTrack(request.competencyId, level.trackId);
    this.validateItemConfiguration(request.itemType, request.options, request.modelAnswer);

    const created = await this.prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          levelId: id,
          competencyId: request.competencyId,
          itemType: request.itemType,
          stem: request.stem.trim(),
          modelAnswer: request.modelAnswer ?? Prisma.JsonNull,
          difficultyTag: request.difficultyTag,
          formCode: request.formCode,
          active: true,
        },
      });
      if (request.options.length > 0) {
        await tx.itemOption.createMany({
          data: request.options.map((option) => ({
            itemId: item.id,
            label: option.label,
            text: option.text,
            isCorrect: option.isCorrect,
          })),
        });
      }
      await tx.level.update({
        where: { id },
        data: { itemCount: { increment: 1 } },
      });
      return tx.item.findUniqueOrThrow({
        where: { id: item.id },
        include: { options: true, competency: { select: { name: true } } },
      });
    });

    await this.auditPublisher.record({
      actorId,
      action: 'admin.item.created',
      resourceType: 'Item',
      resourceId: created.id,
      reasonCode: null,
      metadata: { levelId: id, itemType: created.itemType, competencyId: created.competencyId },
    });

    return this.toItemDto(created);
  }

  async updateItem(actorId: string, itemId: string, body: unknown): Promise<AdminItemDto> {
    const id = UuidSchema.parse(itemId);
    const request = UpdateAdminItemRequestSchema.parse(body);
    const existing = await this.prisma.item.findUnique({
      where: { id },
      include: {
        options: true,
        competency: { select: { name: true } },
        level: { select: { trackId: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Item not found.',
        statusCode: 404,
      });
    }

    const semanticChange =
      request.stem !== undefined ||
      request.competencyId !== undefined ||
      request.modelAnswer !== undefined ||
      request.options !== undefined;
    if (semanticChange && (await this.hasActiveAttemptsForItem(id))) {
      throw new ConflictException({
        error: 'active_attempt',
        message: 'Cannot change item content while attempts are in progress.',
        statusCode: 409,
      });
    }

    if (request.competencyId !== undefined) {
      await this.assertCompetencyForTrack(request.competencyId, existing.level.trackId);
    }

    const nextOptions =
      request.options ??
      existing.options.map((o) => ({
        label: o.label,
        text: o.text,
        isCorrect: o.isCorrect,
      }));
    const nextModelAnswer =
      request.modelAnswer !== undefined
        ? request.modelAnswer
        : typeof existing.modelAnswer === 'string'
          ? existing.modelAnswer
          : existing.modelAnswer
            ? JSON.stringify(existing.modelAnswer)
            : undefined;
    this.validateItemConfiguration(existing.itemType, nextOptions, nextModelAnswer ?? undefined);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (request.options !== undefined) {
        await tx.itemOption.deleteMany({ where: { itemId: id } });
        if (request.options.length > 0) {
          await tx.itemOption.createMany({
            data: request.options.map((option) => ({
              itemId: id,
              label: option.label,
              text: option.text,
              isCorrect: option.isCorrect,
            })),
          });
        }
      }
      await tx.item.update({
        where: { id },
        data: {
          ...(request.competencyId !== undefined ? { competencyId: request.competencyId } : {}),
          ...(request.stem !== undefined ? { stem: request.stem.trim() } : {}),
          ...(request.modelAnswer !== undefined
            ? { modelAnswer: request.modelAnswer ?? Prisma.JsonNull }
            : {}),
          ...(request.difficultyTag !== undefined ? { difficultyTag: request.difficultyTag } : {}),
          ...(request.active !== undefined ? { active: request.active } : {}),
        },
      });
      return tx.item.findUniqueOrThrow({
        where: { id },
        include: { options: true, competency: { select: { name: true } } },
      });
    });

    await this.auditPublisher.record({
      actorId,
      action: 'admin.item.updated',
      resourceType: 'Item',
      resourceId: id,
      reasonCode: null,
      metadata: {
        levelId: existing.levelId,
        previousActive: existing.active,
        nextActive: updated.active,
        semanticChange,
      },
    });

    return this.toItemDto(updated);
  }

  async listCutScores(levelId: string): Promise<ListAdminCutScoresResponse> {
    const id = UuidSchema.parse(levelId);
    await this.assertLevelExists(id);
    const rows = await this.prisma.cutScore.findMany({
      where: { levelId: id },
      orderBy: { tier: 'asc' },
    });
    return { cutScores: rows.map((row) => this.toCutScoreDto(row)) };
  }

  async upsertCutScore(actorId: string, levelId: string, body: unknown): Promise<AdminCutScoreDto> {
    const id = UuidSchema.parse(levelId);
    const request = UpsertAdminCutScoreRequestSchema.parse(body);
    await this.assertLevelExists(id);

    const existing = await this.prisma.cutScore.findUnique({
      where: { levelId_tier: { levelId: id, tier: request.tier } },
    });
    if (existing?.published) {
      throw new ConflictException({
        error: 'cut_score_published',
        message: 'Published cut scores cannot be edited directly.',
        statusCode: 409,
      });
    }

    const row = await this.prisma.cutScore.upsert({
      where: { levelId_tier: { levelId: id, tier: request.tier } },
      create: {
        levelId: id,
        tier: request.tier,
        mean: request.mean,
        sd: request.sd,
        published: false,
      },
      update: {
        mean: request.mean,
        sd: request.sd,
      },
    });

    await this.auditPublisher.record({
      actorId,
      action: 'admin.cut_score.upserted',
      resourceType: 'CutScore',
      resourceId: row.id,
      reasonCode: null,
      metadata: {
        levelId: id,
        tier: row.tier,
        previous: existing
          ? { mean: num(existing.mean), sd: num(existing.sd), published: existing.published }
          : null,
        next: { mean: num(row.mean), sd: num(row.sd), published: row.published },
      },
    });

    return this.toCutScoreDto(row);
  }

  private async assertTrackExists(trackId: string): Promise<void> {
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) {
      throw new BadRequestException({
        error: 'invalid_track',
        message: 'Track does not exist.',
        statusCode: 400,
      });
    }
  }

  private async assertLevelExists(levelId: string): Promise<void> {
    const level = await this.prisma.level.findUnique({ where: { id: levelId } });
    if (!level) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Level not found.',
        statusCode: 404,
      });
    }
  }

  private async assertCompetencyForTrack(competencyId: string, trackId: string): Promise<void> {
    const competency = await this.prisma.competency.findUnique({ where: { id: competencyId } });
    if (!competency) {
      throw new BadRequestException({
        error: 'invalid_competency',
        message: 'Competency does not exist.',
        statusCode: 400,
      });
    }
    if (competency.trackId !== trackId) {
      throw new BadRequestException({
        error: 'competency_track_mismatch',
        message: 'Competency does not belong to this level track.',
        statusCode: 400,
      });
    }
  }

  private validateItemConfiguration(
    itemType: ItemType,
    options: CreateAdminItemRequest['options'],
    modelAnswer?: string,
  ): void {
    if (MCQ_TYPES.has(itemType)) {
      if (options.length < 2) {
        throw new BadRequestException({
          error: 'validation_failed',
          message: 'MCQ items require at least two options.',
          statusCode: 400,
        });
      }
      const correctCount = options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        throw new BadRequestException({
          error: 'validation_failed',
          message: 'MCQ items require at least one correct option.',
          statusCode: 400,
        });
      }
      if (itemType === 'MCQ_SINGLE' && correctCount !== 1) {
        throw new BadRequestException({
          error: 'validation_failed',
          message: 'MCQ_SINGLE items require exactly one correct option.',
          statusCode: 400,
        });
      }
      return;
    }
    if (SUBJECTIVE_TYPES.has(itemType) && modelAnswer !== undefined && modelAnswer.length < 10) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Subjective items require a model answer of at least 10 characters.',
        statusCode: 400,
      });
    }
    if (options.length > 0 && !MCQ_TYPES.has(itemType)) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Options are only valid for MCQ item types.',
        statusCode: 400,
      });
    }
  }

  private async hasActiveAttemptsForLevel(levelId: string): Promise<boolean> {
    const count = await this.prisma.attempt.count({
      where: { levelId, status: { in: [...ACTIVE_ATTEMPT_STATUSES] } },
    });
    return count > 0;
  }

  private async hasActiveAttemptsForItem(itemId: string): Promise<boolean> {
    const count = await this.prisma.attempt.count({
      where: {
        status: { in: [...ACTIVE_ATTEMPT_STATUSES] },
        responses: { some: { itemId } },
      },
    });
    return count > 0;
  }

  private toLevelDto(row: {
    id: string;
    trackId: string;
    levelNumber: number;
    name: string;
    format: string;
    durationMinutes: number;
    itemCount: number;
    createdAt: Date;
    track: { code: string; name: string };
  }): AdminLevelDto {
    return {
      levelId: row.id,
      trackId: row.trackId,
      trackCode: row.track.code as AdminLevelDto['trackCode'],
      trackName: row.track.name,
      levelNumber: row.levelNumber as AdminLevelDto['levelNumber'],
      name: row.name,
      format: row.format as AdminLevelDto['format'],
      durationMinutes: row.durationMinutes,
      itemCount: row.itemCount,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toItemDto(row: {
    id: string;
    levelId: string;
    competencyId: string;
    itemType: string;
    stem: string;
    modelAnswer: unknown;
    difficultyTag: string;
    active: boolean;
    formCode: string;
    createdAt: Date;
    competency: { name: string };
    options: { id: string; label: string; text: string; isCorrect: boolean }[];
  }): AdminItemDto {
    return {
      itemId: row.id,
      levelId: row.levelId,
      competencyId: row.competencyId,
      competencyName: row.competency.name,
      itemType: row.itemType as AdminItemDto['itemType'],
      stem: row.stem,
      modelAnswer:
        typeof row.modelAnswer === 'string'
          ? row.modelAnswer
          : row.modelAnswer
            ? JSON.stringify(row.modelAnswer)
            : null,
      difficultyTag: row.difficultyTag as AdminItemDto['difficultyTag'],
      active: row.active,
      formCode: row.formCode,
      options: row.options.map((option) => ({
        optionId: option.id,
        label: option.label,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toCutScoreDto(row: {
    id: string;
    levelId: string;
    tier: string;
    mean: Prisma.Decimal;
    sd: Prisma.Decimal;
    published: boolean;
    createdAt: Date;
  }): AdminCutScoreDto {
    return {
      cutScoreId: row.id,
      levelId: row.levelId,
      tier: row.tier as AdminCutScoreDto['tier'],
      mean: num(row.mean),
      sd: num(row.sd),
      published: row.published,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
