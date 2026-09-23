import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  UpdateSkillRetakePolicyRequestSchema,
  UuidSchema,
  type ListSkillRetakePoliciesResponse,
  type SkillRetakePolicyDto,
} from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

function num(value: { toNumber?: () => number } | number): number {
  return typeof value === 'number' ? value : Number(value);
}

@Injectable()
export class SkillRetakeAdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async listPolicies(): Promise<ListSkillRetakePoliciesResponse> {
    const rows = await this.prisma.skill.findMany({
      orderBy: { code: 'asc' },
    });
    return { skills: rows.map((row) => this.toDto(row)) };
  }

  async updatePolicy(
    actorId: string,
    skillId: string,
    body: unknown,
  ): Promise<SkillRetakePolicyDto> {
    const id = UuidSchema.parse(skillId);
    const request = UpdateSkillRetakePolicyRequestSchema.parse(body);
    const existing = await this.prisma.skill.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Skill not found.',
        statusCode: 404,
      });
    }
    if (
      request.validityDays !== undefined &&
      request.cooldownDays !== undefined &&
      request.validityDays < request.cooldownDays
    ) {
      throw new BadRequestException({
        error: 'invalid_policy',
        message: 'Validity period must be at least as long as the cooldown period.',
        statusCode: 400,
      });
    }

    const updated = await this.prisma.skill.update({
      where: { id },
      data: {
        ...(request.cooldownDays !== undefined ? { cooldownDays: request.cooldownDays } : {}),
        ...(request.validityDays !== undefined ? { validityDays: request.validityDays } : {}),
        ...(request.beginnerPassThreshold !== undefined
          ? { beginnerPassThreshold: request.beginnerPassThreshold }
          : {}),
      },
    });

    await this.auditPublisher.record({
      actorId,
      action: 'admin.skill_retake_policy.updated',
      resourceType: 'Skill',
      resourceId: id,
      reasonCode: null,
      metadata: {
        code: existing.code,
        previous: {
          cooldownDays: existing.cooldownDays,
          validityDays: existing.validityDays,
          beginnerPassThreshold: num(existing.beginnerPassThreshold),
        },
        next: {
          cooldownDays: updated.cooldownDays,
          validityDays: updated.validityDays,
          beginnerPassThreshold: num(updated.beginnerPassThreshold),
        },
      },
    });

    return this.toDto(updated);
  }

  private toDto(row: {
    id: string;
    code: string;
    name: string;
    cooldownDays: number;
    validityDays: number;
    beginnerPassThreshold: { toNumber?: () => number } | number;
    active: boolean;
  }): SkillRetakePolicyDto {
    return {
      skillId: row.id,
      code: row.code,
      name: row.name,
      cooldownDays: row.cooldownDays,
      validityDays: row.validityDays,
      beginnerPassThreshold: num(row.beginnerPassThreshold),
      active: row.active,
    };
  }
}
