import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CompanyProfileSchema } from '@smart/contracts';
import type { CompanyProfile, UpdateCompanyProfileRequest } from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { requireCompanyActor } from './company-access.js';
import { IdempotencyService } from './idempotency.service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOGO_MIME = new Set(['image/jpeg', 'image/png']);
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

type CompanyRow = {
  id: string;
  name: string;
  website: string | null;
  location: string | null;
  taxonomyDomain: string | null;
  verificationStatus: string;
  deactivatedAt: Date | null;
  heldAt: Date | null;
};

type ProfileRow = {
  slug: string;
  displayName: string;
  logoFileId: string | null;
  website: string | null;
  about: string | null;
  benefits: string[];
  socialLinks: unknown;
  industry: string | null;
  employeeCount: CompanyProfile['employeeCount'];
  headquarters: string | null;
  additionalLocations: string[];
  version: number;
};

export function slugifyCompany(name: string, companyId: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'company'}-${companyId.slice(0, 8)}`;
}

function notFound() {
  return new NotFoundException({
    error: 'not_found',
    message: 'Company not found.',
    statusCode: 404,
  });
}

function versionConflict(currentVersion?: number) {
  return new ConflictException({
    error: 'version_conflict',
    message: 'The company profile changed since you loaded it. Reload and try again.',
    statusCode: 409,
    ...(currentVersion !== undefined ? { currentVersion } : {}),
  });
}

@Injectable()
export class CompanyProfileService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
    @Optional() @Inject(StorageService) private readonly storage?: StorageService,
  ) {}

  /** Public view. Only APPROVED, active companies resolve; everything else is a plain 404. */
  async getPublic(idOrSlug: string): Promise<CompanyProfile> {
    const byId = UUID_RE.test(idOrSlug);
    const profile = await this.prisma.companyProfile.findFirst({
      where: byId ? { companyId: idOrSlug } : { slug: idOrSlug },
      include: { company: true },
    });
    const company: CompanyRow | null =
      profile?.company ??
      (byId ? await this.prisma.company.findUnique({ where: { id: idOrSlug } }) : null);
    if (!company || !this.isPubliclyVisible(company)) throw notFound();
    return this.toDto(company, profile ?? this.defaultProfile(company));
  }

  /** The caller's own profile, editable by the owner or a permitted recruiter (created lazily). */
  async getForEditor(userId: string): Promise<CompanyProfile> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.profile.edit');
    const company = await this.requireCompany(actor.companyId);
    const profile = await this.ensureProfile(company);
    return this.toDto(company, profile);
  }

  async update(
    userId: string,
    params: { key: string; expectedVersion: number; body: UpdateCompanyProfileRequest },
  ): Promise<CompanyProfile> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.profile.edit');
    const { body } = params;
    if (body.logoFileId && !body.logoFileId.startsWith(`company-logos/${actor.companyId}/`)) {
      // A file from another company (or arbitrary storage) is never accepted as this company's logo.
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'The logo must be uploaded through the company logo upload.',
        statusCode: 400,
      });
    }

    return this.idempotency.run({
      userId,
      scope: 'employer.company.update',
      key: params.key,
      request: { expectedVersion: params.expectedVersion, body },
      execute: async (tx) => {
        const company = await tx.company.findUnique({ where: { id: actor.companyId } });
        if (!company) throw notFound();
        const before = await this.ensureProfile(company, tx);
        if (before.version !== params.expectedVersion) throw versionConflict(before.version);

        const data: Prisma.CompanyProfileUpdateManyMutationInput = {
          ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
          ...(body.logoFileId !== undefined ? { logoFileId: body.logoFileId } : {}),
          ...(body.website !== undefined ? { website: body.website } : {}),
          ...(body.about !== undefined ? { about: body.about } : {}),
          ...(body.benefits !== undefined ? { benefits: body.benefits } : {}),
          ...(body.socialLinks !== undefined ? { socialLinks: body.socialLinks } : {}),
          ...(body.industry !== undefined ? { industry: body.industry } : {}),
          ...(body.employeeCount !== undefined ? { employeeCount: body.employeeCount } : {}),
          ...(body.headquarters !== undefined ? { headquarters: body.headquarters } : {}),
          ...(body.additionalLocations !== undefined
            ? { additionalLocations: body.additionalLocations }
            : {}),
          version: { increment: 1 },
        };
        // Optimistic lock: the version in the WHERE clause decides the winner of a concurrent save.
        const updated = await tx.companyProfile.updateMany({
          where: { companyId: actor.companyId, version: params.expectedVersion },
          data,
        });
        if (updated.count === 0) throw versionConflict();

        // Keep the registration-era columns the rest of the platform reads in step with the profile.
        const mirror: Prisma.CompanyUpdateInput = {
          ...(body.website !== undefined ? { website: body.website } : {}),
          ...(body.industry !== undefined ? { taxonomyDomain: body.industry } : {}),
          ...(body.headquarters !== undefined ? { location: body.headquarters } : {}),
        };
        if (Object.keys(mirror).length > 0) {
          await tx.company.update({ where: { id: actor.companyId }, data: mirror });
        }

        const after = await tx.companyProfile.findUniqueOrThrow({
          where: { companyId: actor.companyId },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'company.profile_updated',
            resourceType: 'company',
            resourceId: actor.companyId,
            metadata: {
              companyId: actor.companyId,
              before: auditView(before),
              after: auditView(after),
            } as Prisma.InputJsonValue,
          },
        });
        return { result: await this.toDto(company, after) };
      },
    });
  }

  async uploadLogo(
    userId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<{ logoFileId: string; previewUrl: string }> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.profile.edit');
    if (!this.storage) {
      throw new BadRequestException({
        error: 'storage_unavailable',
        message: 'Logo upload is unavailable in this environment.',
        statusCode: 400,
      });
    }
    if (!LOGO_MIME.has(file.mimeType) || file.buffer.byteLength > LOGO_MAX_BYTES) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Upload a JPG or PNG logo of 2MB or less.',
        statusCode: 400,
      });
    }
    const logoFileId = await this.storage.upload({
      buffer: file.buffer,
      namespace: `company-logos/${actor.companyId}`,
      fileName: file.fileName,
      contentType: file.mimeType,
    });
    return { logoFileId, previewUrl: await this.storage.getSignedDownloadUrl(logoFileId) };
  }

  private isPubliclyVisible(company: CompanyRow): boolean {
    return company.verificationStatus === 'APPROVED' && !company.deactivatedAt && !company.heldAt;
  }

  private async requireCompany(companyId: string): Promise<CompanyRow> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw notFound();
    return company;
  }

  private defaultProfile(company: CompanyRow): ProfileRow {
    return {
      slug: slugifyCompany(company.name, company.id),
      displayName: company.name,
      logoFileId: null,
      website: company.website,
      about: null,
      benefits: [],
      socialLinks: {},
      industry: company.taxonomyDomain,
      employeeCount: null,
      headquarters: company.location,
      additionalLocations: [],
      version: 1,
    };
  }

  private async ensureProfile(
    company: CompanyRow,
    db: Pick<PrismaService, 'companyProfile'> | Prisma.TransactionClient = this.prisma,
  ) {
    const existing = await db.companyProfile.findUnique({ where: { companyId: company.id } });
    if (existing) return existing;
    const seed = this.defaultProfile(company);
    return db.companyProfile.create({
      data: {
        companyId: company.id,
        slug: seed.slug,
        displayName: seed.displayName,
        website: seed.website,
        industry: seed.industry,
        headquarters: seed.headquarters,
      },
    });
  }

  private async toDto(company: CompanyRow, profile: ProfileRow): Promise<CompanyProfile> {
    const verified = this.isPubliclyVisible(company);
    let verifiedAt: Date | null = null;
    if (verified) {
      const latest = await this.prisma.companyVerification.findFirst({
        where: { companyId: company.id, reviewedAt: { not: null } },
        orderBy: { reviewedAt: 'desc' },
        select: { reviewedAt: true },
      });
      verifiedAt = latest?.reviewedAt ?? null;
    }
    let logoUrl: string | null = null;
    if (profile.logoFileId && this.storage) {
      try {
        logoUrl = await this.storage.getSignedDownloadUrl(profile.logoFileId);
      } catch {
        logoUrl = null;
      }
    }
    return CompanyProfileSchema.parse({
      companyId: company.id,
      slug: profile.slug,
      displayName: profile.displayName,
      logoUrl,
      website: profile.website,
      about: profile.about,
      benefits: profile.benefits,
      socialLinks: profile.socialLinks ?? {},
      industry: profile.industry,
      employeeCount: profile.employeeCount,
      headquarters: profile.headquarters,
      additionalLocations: profile.additionalLocations,
      version: profile.version,
      isVerified: verified,
      verifiedAt: verifiedAt?.toISOString() ?? null,
    });
  }
}

function auditView(profile: ProfileRow): Record<string, unknown> {
  return {
    displayName: profile.displayName,
    logoFileId: profile.logoFileId,
    website: profile.website,
    about: profile.about,
    benefits: profile.benefits,
    socialLinks: profile.socialLinks,
    industry: profile.industry,
    employeeCount: profile.employeeCount,
    headquarters: profile.headquarters,
    additionalLocations: profile.additionalLocations,
    version: profile.version,
  };
}
