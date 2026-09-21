import { ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  CreatePlacementEmployerRequestSchema,
  ListPlacementEmployersQuerySchema,
  PlacementEmployerDetailSchema,
  PlacementEmployerSummarySchema,
  UpdatePlacementEmployerRequestSchema,
  type CreatePlacementEmployerRequest,
  type ListPlacementEmployersQuery,
  type ListPlacementEmployersResponse,
  type PlacementEmployerDetail,
  type PlacementEmployerSummary,
  type UpdatePlacementEmployerRequest,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { normalizeCompanyName } from '../work-experience/company-name.util.js';

type EmployerRow = {
  id: string;
  institutionId: string;
  name: string;
  website: string | null;
  linkedinUrl: string | null;
  sector: string | null;
  location: string | null;
  aboutCompany: string | null;
  companyOffers: string | null;
  additionalCompanyDetails: string | null;
  logoStorageKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { jobOpenings: number };
};

@Injectable()
export class PlacementEmployersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(StorageService) private readonly storageService?: StorageService,
  ) {}

  async listEmployers(
    institutionId: string,
    queryRaw: ListPlacementEmployersQuery,
  ): Promise<ListPlacementEmployersResponse> {
    const query = ListPlacementEmployersQuerySchema.parse(queryRaw);
    const where: Prisma.PlacementEmployerWhereInput = { institutionId };
    if (query.q) {
      where.name = { contains: query.q, mode: 'insensitive' };
    }
    const rows = await this.prisma.placementEmployer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { jobOpenings: true } },
        jobOpenings: { select: { status: true } },
      },
    });
    const employers = await Promise.all(rows.map((row) => this.toSummary(row)));
    return { employers };
  }

  async createEmployer(
    institutionId: string,
    bodyRaw: CreatePlacementEmployerRequest,
  ): Promise<PlacementEmployerSummary> {
    const body = CreatePlacementEmployerRequestSchema.parse(bodyRaw);
    const normalizedName = normalizeCompanyName(body.name);
    if (!normalizedName) {
      throw new ConflictException({
        error: 'validation_failed',
        message: 'Company name is too short after normalization.',
        statusCode: 409,
      });
    }
    const existing = await this.prisma.placementEmployer.findFirst({
      where: { institutionId, normalizedName },
    });
    if (existing) {
      throw new ConflictException({
        error: 'employer_exists',
        message: `A company named "${existing.name}" already exists in your repository.`,
        statusCode: 409,
      });
    }
    const row = await this.prisma.placementEmployer.create({
      data: {
        institutionId,
        name: body.name.trim(),
        normalizedName,
        website: body.website?.trim() || null,
        linkedinUrl: body.linkedinUrl?.trim() || null,
        sector: body.sector?.trim() || null,
        location: body.location?.trim() || null,
        aboutCompany: body.aboutCompany?.trim() || null,
        companyOffers: body.companyOffers?.trim() || null,
        additionalCompanyDetails: body.additionalCompanyDetails?.trim() || null,
        logoStorageKey: body.logoStorageKey ?? null,
      },
      include: {
        _count: { select: { jobOpenings: true } },
        jobOpenings: { select: { status: true } },
      },
    });
    return this.toSummary(row);
  }

  async getEmployer(institutionId: string, employerId: string): Promise<PlacementEmployerDetail> {
    const row = await this.prisma.placementEmployer.findFirst({
      where: { id: employerId, institutionId },
      include: {
        _count: { select: { jobOpenings: true } },
        jobOpenings: {
          orderBy: { createdAt: 'desc' },
          include: {
            applications: { select: { stage: true } },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Company not found.',
        statusCode: 404,
      });
    }
    const summary = await this.toSummary(row);
    const driveHistory = row.jobOpenings
      .filter((opening) => opening.status !== 'DRAFT')
      .map((opening) => {
        const stages = opening.applications.map((app) => app.stage);
        return {
          openingId: opening.id,
          roleTitle: opening.roleTitle,
          driveDate: opening.driveDate ? opening.driveDate.toISOString().slice(0, 10) : undefined,
          status: opening.status,
          applicationCount: opening.applications.length,
          shortlistedCount: stages.filter((s) => s === 'SHORTLISTED').length,
          selectedCount: stages.filter((s) => s === 'HIRED' || s === 'OFFER').length,
          createdAt: opening.createdAt.toISOString(),
        };
      });
    const currentOpenings = row.jobOpenings
      .filter((opening) => opening.status === 'OPEN' || opening.status === 'DRAFT')
      .map((opening) => ({
        openingId: opening.id,
        roleTitle: opening.roleTitle,
        status: opening.status,
        location: opening.location?.trim() || 'Unspecified',
        createdAt: opening.createdAt.toISOString(),
      }));
    return PlacementEmployerDetailSchema.parse({
      ...summary,
      driveHistory,
      currentOpenings,
    });
  }

  async updateEmployer(
    institutionId: string,
    employerId: string,
    bodyRaw: UpdatePlacementEmployerRequest,
  ): Promise<PlacementEmployerSummary> {
    const body = UpdatePlacementEmployerRequestSchema.parse(bodyRaw);
    await this.requireEmployer(institutionId, employerId);
    if (body.name) {
      const normalizedName = normalizeCompanyName(body.name);
      const clash = await this.prisma.placementEmployer.findFirst({
        where: {
          institutionId,
          normalizedName,
          NOT: { id: employerId },
        },
      });
      if (clash) {
        throw new ConflictException({
          error: 'employer_exists',
          message: `Another company named "${clash.name}" already exists.`,
          statusCode: 409,
        });
      }
    }
    const row = await this.prisma.placementEmployer.update({
      where: { id: employerId },
      data: {
        ...(body.name !== undefined
          ? {
              name: body.name.trim(),
              normalizedName: normalizeCompanyName(body.name),
            }
          : {}),
        ...(body.website !== undefined ? { website: body.website?.trim() || null } : {}),
        ...(body.linkedinUrl !== undefined
          ? { linkedinUrl: body.linkedinUrl?.trim() || null }
          : {}),
        ...(body.sector !== undefined ? { sector: body.sector?.trim() || null } : {}),
        ...(body.location !== undefined ? { location: body.location?.trim() || null } : {}),
        ...(body.aboutCompany !== undefined
          ? { aboutCompany: body.aboutCompany?.trim() || null }
          : {}),
        ...(body.companyOffers !== undefined
          ? { companyOffers: body.companyOffers?.trim() || null }
          : {}),
        ...(body.additionalCompanyDetails !== undefined
          ? { additionalCompanyDetails: body.additionalCompanyDetails?.trim() || null }
          : {}),
        ...(body.logoStorageKey !== undefined
          ? { logoStorageKey: body.logoStorageKey ?? null }
          : {}),
      },
      include: {
        _count: { select: { jobOpenings: true } },
        jobOpenings: { select: { status: true } },
      },
    });
    return this.toSummary(row);
  }

  async requireEmployer(institutionId: string, employerId: string) {
    const row = await this.prisma.placementEmployer.findFirst({
      where: { id: employerId, institutionId },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Company not found.',
        statusCode: 404,
      });
    }
    return row;
  }

  private async resolveLogoUrl(key: string | null): Promise<string | undefined> {
    if (!key || !this.storageService) return undefined;
    try {
      return await this.storageService.getSignedDownloadUrl(key);
    } catch {
      return undefined;
    }
  }

  private async toSummary(
    row: EmployerRow & { jobOpenings?: { status: string }[] },
  ): Promise<PlacementEmployerSummary> {
    const openingCount = row._count?.jobOpenings ?? row.jobOpenings?.length ?? 0;
    const activeOpeningCount = row.jobOpenings?.filter((o) => o.status === 'OPEN').length ?? 0;
    const companyLogoUrl = await this.resolveLogoUrl(row.logoStorageKey);
    return PlacementEmployerSummarySchema.parse({
      employerId: row.id,
      institutionId: row.institutionId,
      name: row.name,
      website: row.website ?? undefined,
      linkedinUrl: row.linkedinUrl ?? undefined,
      sector: row.sector ?? undefined,
      location: row.location ?? undefined,
      aboutCompany: row.aboutCompany ?? undefined,
      companyOffers: row.companyOffers ?? undefined,
      additionalCompanyDetails: row.additionalCompanyDetails ?? undefined,
      logoStorageKey: row.logoStorageKey ?? undefined,
      openingCount,
      activeOpeningCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      companyLogoUrl,
    });
  }
}
