import { Inject, Injectable } from '@nestjs/common';
import type { TransitionApplicationRequest, TransitionApplicationResponse } from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { requireCompanyActor } from '../company-profile/company-access.js';
import { HiringService } from './hiring.service.js';

/** Th6-414 — an employer moves a candidate. Permission and company scoping here; the rules in HiringService. */
@Injectable()
export class EmployerPipelineService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(HiringService) private readonly hiring: HiringService,
  ) {}

  async transition(
    userId: string,
    applicationId: string,
    params: { key: string; body: TransitionApplicationRequest },
  ): Promise<TransitionApplicationResponse> {
    // Owners and recruiters may both move candidates; anyone else, or a deactivated member, gets 403.
    const actor = await requireCompanyActor(this.prisma, userId, 'company.applicants.manage');
    return this.hiring.transition({
      applicationId,
      toStatus: params.body.toStatus,
      expectedFromStatus: params.body.expectedFromStatus,
      note: params.body.note,
      actor: { type: 'EMPLOYER', id: userId, companyId: actor.companyId },
      idempotencyKey: params.key,
      source: 'employer_board',
    });
  }
}
