import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { TenantVerificationStatus } from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { extractDomain, normalizeCompanyName } from '../work-experience/company-name.util.js';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  /**
   * Resolves an existing Organization by matching canonical domain or normalized company name.
   * If no Organization matches, creates an unverified Organization ('PENDING') with raw/normalized name and domain.
   */
  async resolveOrCreateOrganization(params: {
    name: string;
    website?: string | null;
    verifierEmail?: string | null;
  }) {
    const rawName = params.name.trim();
    const normalizedName = normalizeCompanyName(rawName);

    let extractedDomain: string | null = null;
    if (params.website) {
      extractedDomain = extractDomain(params.website);
    }
    if (!extractedDomain && params.verifierEmail) {
      extractedDomain = extractDomain(params.verifierEmail);
    }

    // 1. Match by domain if domain extracted
    if (extractedDomain) {
      const orgByDomain = await this.prisma.organization.findFirst({
        where: { domain: extractedDomain },
      });
      if (orgByDomain) {
        return orgByDomain;
      }
    }

    // 2. Match by exact or normalized name (case-insensitive)
    const orgByName = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { name: { equals: rawName, mode: 'insensitive' } },
          { name: { equals: normalizedName, mode: 'insensitive' } },
        ],
      },
    });

    if (orgByName) {
      // Update domain if not set and domain is valid & available
      if (!orgByName.domain && extractedDomain) {
        const domainExists = await this.prisma.organization.findFirst({
          where: { domain: extractedDomain },
        });
        if (!domainExists) {
          return this.prisma.organization.update({
            where: { id: orgByName.id },
            data: { domain: extractedDomain },
          });
        }
      }
      return orgByName;
    }

    // 3. Ensure domain is unique before insert (if domain is already taken, keep domain null)
    let domainToUse: string | null = extractedDomain;
    if (domainToUse) {
      const domainExists = await this.prisma.organization.findFirst({
        where: { domain: domainToUse },
      });
      if (domainExists) {
        domainToUse = null;
      }
    }

    // 4. Create new unverified Organization
    return this.prisma.organization.create({
      data: {
        name: rawName,
        domain: domainToUse,
        verificationStatus: 'PENDING',
      },
    });
  }

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        companies: true,
      },
    });
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found.`);
    }
    return org;
  }

  async updateVerificationStatus(
    id: string,
    verificationStatus: TenantVerificationStatus,
    verificationReason?: string,
    actorId?: string,
  ) {
    const org = await this.prisma.organization.update({
      where: { id },
      data: {
        verificationStatus,
        verificationReason: verificationReason ?? null,
        ...(actorId ? { updatedById: actorId } : {}),
      },
    });

    if (actorId) {
      await this.auditPublisher.record({
        actorId,
        action: 'organization.verification_updated',
        resourceType: 'organization',
        resourceId: id,
        reasonCode: verificationStatus.toLowerCase(),
        metadata: { verificationStatus, verificationReason },
      });
    }

    return org;
  }
}
