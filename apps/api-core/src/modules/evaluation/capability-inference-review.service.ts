import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CorrectStudentCapabilityRequestSchema,
  CorrectStudentCapabilityResponseSchema,
  ListCapabilityInferenceReviewQueueResponseSchema,
  UuidSchema,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { EvidenceSkillInferenceService } from '../evidence/evidence-skill-inference.service.js';

export const LOW_CONFIDENCE_THRESHOLD = 0.55;

@Injectable()
export class CapabilityInferenceReviewService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceSkillInferenceService)
    private readonly skillInference: EvidenceSkillInferenceService,
  ) {}

  async listReviewQueue(limit = 50) {
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.prisma.studentCapability.findMany({
      where: { confidenceScore: { lt: LOW_CONFIDENCE_THRESHOLD } },
      orderBy: { inferredAt: 'desc' },
      take,
    });

    return ListCapabilityInferenceReviewQueueResponseSchema.parse({
      items: rows.map((row) => ({
        capabilityId: row.id,
        studentId: row.studentId,
        skillCode: row.skillCode,
        capabilityLabel: row.capabilityLabel,
        proficiency: row.proficiency,
        confidenceScore: row.confidenceScore,
        modelVersion: row.modelVersion,
        inferredAt: row.inferredAt.toISOString(),
      })),
    });
  }

  async correctCapability(capabilityId: string, body: unknown, reviewerId: string) {
    const id = UuidSchema.parse(capabilityId);
    const request = CorrectStudentCapabilityRequestSchema.parse(body);
    if (request.proficiency === undefined && request.confidenceScore === undefined) {
      throw new BadRequestException({
        error: 'no_corrections',
        message: 'Provide proficiency or confidenceScore to correct.',
        statusCode: 400,
      });
    }

    const row = await this.prisma.studentCapability.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Capability inference row not found.',
        statusCode: 404,
      });
    }

    if (row.confidenceScore >= LOW_CONFIDENCE_THRESHOLD && !request.proficiency) {
      throw new BadRequestException({
        error: 'confidence_not_low',
        message: 'Only low-confidence capabilities can be approved without a proficiency change.',
        statusCode: 400,
      });
    }

    const updated = await this.prisma.studentCapability.update({
      where: { id },
      data: {
        proficiency: request.proficiency ?? row.proficiency,
        confidenceScore: request.confidenceScore ?? Math.max(row.confidenceScore, 0.7),
        capabilityLabel: row.capabilityLabel.includes('[reviewer]')
          ? row.capabilityLabel
          : `${row.capabilityLabel} [reviewer: ${request.reviewerNote.slice(0, 120)}]`,
      },
    });

    if (row.skillCode) {
      await this.skillInference.recomputeForSkill(row.studentId, row.skillCode);
    }

    return CorrectStudentCapabilityResponseSchema.parse({
      capabilityId: updated.id,
      proficiency: updated.proficiency,
      confidenceScore: updated.confidenceScore,
      reviewerId,
      correctedAt: new Date().toISOString(),
    });
  }
}
