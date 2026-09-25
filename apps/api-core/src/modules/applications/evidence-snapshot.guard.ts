import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import type { EvidenceRef } from './application-snapshot.js';

/**
 * Th6-394 — evidence a submitted application's snapshot points at cannot be deleted while that
 * application exists. Deletion is blocked (not silently kept) so the student knows why.
 */
@Injectable()
export class EvidenceSnapshotGuard {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async isReferenced(studentId: string, ref: EvidenceRef): Promise<boolean> {
    const hit = await this.prisma.applicationSnapshot.findFirst({
      where: {
        application: { studentId },
        evidenceRefs: { array_contains: [{ type: ref.type, id: ref.id }] },
      },
      select: { id: true },
    });
    return hit !== null;
  }

  async assertNotReferenced(studentId: string, ref: EvidenceRef): Promise<void> {
    if (await this.isReferenced(studentId, ref)) {
      throw new ConflictException({
        error: 'evidence_in_use',
        message:
          'This evidence is part of a job application you submitted, so it cannot be deleted while that application exists.',
        statusCode: 409,
      });
    }
  }
}
