import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { EvidenceVerificationMethod } from '@smart/contracts';
import type { Prisma } from '../../../generated/prisma/index.js';
import { PrismaService } from '../../../platform/prisma/prisma.service.js';
import { Tier1IssuerRegistry } from '../../candidate-certificates/verification/tier1-issuer-registry.js';
import { Tier2PublicUrlVerifier } from '../../candidate-certificates/verification/tier2-public-url-verifier.js';
import { Tier3OcrVerifier } from '../../candidate-certificates/verification/tier3-ocr-verifier.js';
import type { TierVerificationResult } from '../../candidate-certificates/verification/tier1-issuer-adapter.js';
import { EvidenceReconciliationService } from '../evidence-reconciliation.service.js';

/**
 * Credential types with a known automated verification path today.
 * LICENSE relies on Tier 2 (public registry lookup); DEGREE is intentionally
 * excluded — CandidateEducation already owns degree verification.
 */
const AUTOMATABLE_CREDENTIAL_TYPES = new Set([
  'CERTIFICATION',
  'BADGE',
  'LICENSE',
  'PROFESSIONAL_MEMBERSHIP',
]);

const TIER_TO_VERIFICATION_METHOD: Record<
  TierVerificationResult['tier'],
  EvidenceVerificationMethod
> = {
  TIER_1_ISSUER_API: 'ISSUER',
  TIER_2_PUBLIC_URL: 'ISSUER',
  TIER_3_OCR_HEURISTIC: 'DOCUMENT',
};

@Injectable()
export class CredentialVerificationService {
  private readonly logger = new Logger(CredentialVerificationService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
    @Inject(Tier1IssuerRegistry) private readonly tier1Registry: Tier1IssuerRegistry,
    @Inject(Tier2PublicUrlVerifier) private readonly tier2Verifier: Tier2PublicUrlVerifier,
    @Inject(Tier3OcrVerifier) private readonly tier3Verifier: Tier3OcrVerifier,
  ) {}

  async runVerification(credentialId: string): Promise<void> {
    const credential = await this.prisma.professionalCredential.findUnique({
      where: { id: credentialId },
      include: { student: true },
    });
    if (!credential) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Professional credential not found.',
        statusCode: 404,
      });
    }

    if (!AUTOMATABLE_CREDENTIAL_TYPES.has(credential.credentialType)) {
      this.logger.debug(
        `Skipping automated verification for credential ${credentialId}: type ${credential.credentialType} is not automatable.`,
      );
      return;
    }

    const candidateName = credential.student?.fullName ?? null;
    const result = await this.evaluateTiers(credential, candidateName);
    await this.applyResult(credential.studentId, credential.id, result);
  }

  private async evaluateTiers(
    credential: {
      issuer: string;
      credentialName: string;
      externalCredentialId: string | null;
      verificationSource: string | null;
      documentObjectKey: string | null;
    },
    candidateName: string | null,
  ): Promise<TierVerificationResult> {
    const tier1Result = await this.tier1Registry.verify({
      title: credential.credentialName,
      issuer: credential.issuer,
      certificateNumber: credential.externalCredentialId,
      verificationUrl: credential.verificationSource,
      candidateName,
    });
    if (tier1Result.status !== 'UNAVAILABLE') {
      return tier1Result;
    }

    if (credential.verificationSource) {
      const tier2Result = await this.tier2Verifier.verify({
        verificationUrl: credential.verificationSource,
        candidateName,
        title: credential.credentialName,
        issuer: credential.issuer,
        certificateNumber: credential.externalCredentialId,
      });
      if (tier2Result.status !== 'UNAVAILABLE') {
        return tier2Result;
      }
    }

    if (credential.documentObjectKey) {
      const tier3Result = await this.tier3Verifier.verify({
        certificateFileUrl: credential.documentObjectKey,
        candidateName,
        title: credential.credentialName,
        issuer: credential.issuer,
        certificateNumber: credential.externalCredentialId,
        verificationUrl: credential.verificationSource,
      });
      if (tier3Result.status !== 'UNAVAILABLE') {
        return tier3Result;
      }
    }

    return {
      status: 'AMBIGUOUS',
      tier: 'TIER_3_OCR_HEURISTIC',
      confidence: 0,
      reason: 'No automated verification tier was capable of evaluating this credential.',
    };
  }

  private async applyResult(
    studentId: string,
    credentialId: string,
    result: TierVerificationResult,
  ): Promise<void> {
    // CredentialStatus has no "rejected" concept — a real-world credential's
    // active/expired/revoked state is independent of whether we could confirm
    // it. Only a VERIFIED tier result moves it off PENDING_VERIFICATION; a
    // FAILED/AMBIGUOUS result is reflected on the EvidenceRecord instead.
    const credentialStatus = result.status === 'VERIFIED' ? 'ACTIVE' : undefined;
    const evidenceStatus =
      result.status === 'VERIFIED'
        ? 'VERIFIED'
        : result.status === 'FAILED'
          ? 'REJECTED'
          : 'PENDING';
    const verificationMethod = TIER_TO_VERIFICATION_METHOD[result.tier];

    await this.prisma.professionalCredential.update({
      where: { id: credentialId },
      data: {
        ...(credentialStatus ? { status: credentialStatus } : {}),
        ...(result.status === 'VERIFIED' ? { verificationMethod } : {}),
      },
    });

    const evidenceRecord = await this.prisma.evidenceRecord.findFirst({
      where: { studentId, evidenceType: 'CREDENTIAL', sourceEntityId: credentialId },
    });
    if (evidenceRecord) {
      await this.prisma.evidenceRecord.update({
        where: { id: evidenceRecord.id },
        data: {
          verificationStatus: evidenceStatus,
          verificationMetadata: {
            tier: result.tier,
            resultStatus: result.status,
            confidence: result.confidence,
            reason: result.reason,
            ...(result.metadata ?? {}),
          } as Prisma.InputJsonValue,
        },
      });
    }

    await this.reconciliation.reconcileForStudent(studentId);
  }
}
