import { Inject, Injectable } from '@nestjs/common';
import type { EvidenceRecordDto } from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

export interface ReconciliationResult {
  contradictionsDetected: number;
  reviewRequired: boolean;
}

@Injectable()
export class EvidenceReconciliationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * V1 stub — flags review when the same skill has conflicting responsibility levels
   * across independent evidence sources.
   */
  async reconcileForStudent(studentId: string): Promise<ReconciliationResult> {
    const records = await this.prisma.evidenceRecord.findMany({
      where: { studentId },
      select: {
        id: true,
        relatedSkillCodes: true,
        evidenceStrength: true,
        sourcePayload: true,
      },
    });

    let contradictionsDetected = 0;
    const bySkill = new Map<string, EvidenceRecordDto['evidenceStrength'][]>();

    for (const record of records) {
      for (const skillCode of record.relatedSkillCodes) {
        const strengths = bySkill.get(skillCode) ?? [];
        if (record.evidenceStrength) {
          strengths.push(record.evidenceStrength as EvidenceRecordDto['evidenceStrength']);
        }
        bySkill.set(skillCode, strengths);
      }
    }

    for (const strengths of bySkill.values()) {
      const hasWeak = strengths.includes('WEAK');
      const hasDirect = strengths.includes('DIRECT');
      if (hasWeak && hasDirect) {
        contradictionsDetected += 1;
      }
    }

    return {
      contradictionsDetected,
      reviewRequired: contradictionsDetected > 0,
    };
  }
}
