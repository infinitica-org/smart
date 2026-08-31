import { Buffer } from 'node:buffer';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  LEVEL_DEFINITIONS,
  TRACK_DEFINITIONS,
  TrackDtoSchema,
  type TrackDto,
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
