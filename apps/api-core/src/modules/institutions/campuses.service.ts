import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CampusDto,
  CreateCampusRequest,
  ListCampusesQuery,
  UpdateCampusRequest,
} from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

type CampusRow = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  isPrimary: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  _count: { batches: number };
};

const WITH_BATCH_COUNT = { _count: { select: { batches: true } } } as const;

/**
 * S6-VV-112 (#163) — an institution's campuses. Exactly one is primary: new batches land on it
 * unless the TPO picks another. Campuses are archived rather than deleted, so a batch never loses
 * its campus.
 */
@Injectable()
export class CampusesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async list(institutionId: string, query: ListCampusesQuery = {}): Promise<CampusDto[]> {
    const rows = await this.prisma.campus.findMany({
      where: { institutionId, ...(query.includeArchived ? {} : { archivedAt: null }) },
      include: WITH_BATCH_COUNT,
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toCampusDto);
  }

  async create(
    institutionId: string,
    body: CreateCampusRequest,
    actorId: string,
  ): Promise<CampusDto> {
    await this.assertNameFree(institutionId, body.name);
    const hasPrimary = await this.prisma.campus.count({
      where: { institutionId, isPrimary: true },
    });
    const row = await this.prisma.campus.create({
      data: {
        institutionId,
        name: body.name,
        code: body.code ?? null,
        city: body.city ?? null,
        // The first campus of an institution with none (e.g. seeded before campuses) is primary.
        isPrimary: hasPrimary === 0,
      },
      include: WITH_BATCH_COUNT,
    });
    await this.audit(actorId, 'institution.campus_created', row.id, { institutionId, ...body });
    return toCampusDto(row);
  }

  async update(
    campusId: string,
    institutionId: string,
    body: UpdateCampusRequest,
    actorId: string,
  ): Promise<CampusDto> {
    const campus = await findCampusOrThrow(this.prisma, campusId, institutionId);
    if (body.name !== undefined && body.name !== campus.name) {
      await this.assertNameFree(institutionId, body.name);
    }
    const archiving = body.archived === true && campus.archivedAt === null;
    if (archiving && campus.isPrimary) {
      throw new ConflictException({
        error: 'primary_campus',
        message: 'Make another campus primary before archiving this one.',
        statusCode: 409,
      });
    }
    if (body.isPrimary && (campus.archivedAt !== null || body.archived === true)) {
      throw new ConflictException({
        error: 'campus_archived',
        message: 'An archived campus cannot be the primary campus.',
        statusCode: 409,
      });
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (body.isPrimary && !campus.isPrimary) {
        await tx.campus.updateMany({
          where: { institutionId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.campus.update({
        where: { id: campusId },
        data: {
          name: body.name,
          code: body.code,
          city: body.city,
          ...(body.isPrimary ? { isPrimary: true } : {}),
          ...(body.archived === undefined
            ? {}
            : { archivedAt: body.archived ? (campus.archivedAt ?? new Date()) : null }),
        },
        include: WITH_BATCH_COUNT,
      });
    });
    await this.audit(actorId, 'institution.campus_updated', campusId, {
      institutionId,
      prior: {
        name: campus.name,
        code: campus.code,
        city: campus.city,
        isPrimary: campus.isPrimary,
        archived: campus.archivedAt !== null,
      },
      next: body,
    });
    return toCampusDto(row);
  }

  private async assertNameFree(institutionId: string, name: string): Promise<void> {
    const clash = await this.prisma.campus.findFirst({
      where: { institutionId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException({
        error: 'conflict',
        message: 'A campus with this name already exists.',
        statusCode: 409,
      });
    }
  }

  private async audit(
    actorId: string,
    action: string,
    campusId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditPublisher.record({
      actorId,
      action,
      resourceType: 'campus',
      resourceId: campusId,
      reasonCode: null,
      metadata,
    });
  }
}

function toCampusDto(row: CampusRow): CampusDto {
  return {
    campusId: row.id,
    name: row.name,
    code: row.code,
    city: row.city,
    isPrimary: row.isPrimary,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    batchCount: row._count.batches,
    createdAt: row.createdAt.toISOString(),
  };
}

type CampusReader = Pick<PrismaService, 'campus'>;

async function findCampusOrThrow(prisma: CampusReader, campusId: string, institutionId: string) {
  const campus = await prisma.campus.findFirst({ where: { id: campusId, institutionId } });
  if (!campus) {
    throw new NotFoundException({
      error: 'not_found',
      message: 'Campus not found.',
      statusCode: 404,
    });
  }
  return campus;
}

/**
 * The campus a batch should use: the requested one (it must be an active campus of this
 * institution), else the primary campus, else none for an institution without campuses.
 */
export async function resolveBatchCampus(
  prisma: CampusReader,
  institutionId: string,
  campusId?: string,
): Promise<string | null> {
  if (campusId) {
    const campus = await findCampusOrThrow(prisma, campusId, institutionId);
    if (campus.archivedAt) {
      throw new ConflictException({
        error: 'campus_archived',
        message: 'This campus is archived. Restore it before adding batches to it.',
        statusCode: 409,
      });
    }
    return campus.id;
  }
  const primary = await prisma.campus.findFirst({
    where: { institutionId, isPrimary: true, archivedAt: null },
    select: { id: true },
  });
  return primary?.id ?? null;
}
