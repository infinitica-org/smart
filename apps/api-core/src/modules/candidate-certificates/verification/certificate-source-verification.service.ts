import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../platform/prisma/prisma.service.js';
import type { Tier1IssuerRegistry } from './tier1-issuer-registry.js';
import type { Tier2PublicUrlVerifier } from './tier2-public-url-verifier.js';
import type { Tier3OcrVerifier } from './tier3-ocr-verifier.js';
import type { TierVerificationResult } from './tier1-issuer-adapter.js';
import type {
  CandidateCertificateStatus,
  CertificateSourceStatus,
} from '../../../generated/prisma/index.js';

export interface VerificationRunOutput {
  certificateId: string;
  sourceStatus: CertificateSourceStatus;
  status: CandidateCertificateStatus;
  tierUsed: string;
  result: TierVerificationResult;
}

@Injectable()
export class CertificateSourceVerificationService {
  private readonly logger = new Logger(CertificateSourceVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tier1Registry: Tier1IssuerRegistry,
    private readonly tier2Verifier: Tier2PublicUrlVerifier,
    private readonly tier3Verifier: Tier3OcrVerifier,
  ) {}

  async runVerification(certificateId: string): Promise<VerificationRunOutput> {
    const cert = await this.prisma.candidateCertificate.findUnique({
      where: { id: certificateId },
      include: { candidate: true },
    });

    if (!cert) {
      throw new NotFoundException(`Candidate certificate with ID ${certificateId} not found.`);
    }

    const candidateName = cert.candidate?.fullName ?? null;

    // ------------------------------------------------------------------------
    // Tier 1: Issuer API Check
    // ------------------------------------------------------------------------
    const tier1Result = await this.tier1Registry.verify({
      title: cert.title,
      issuer: cert.issuer,
      certificateNumber: cert.certificateNumber,
      verificationUrl: cert.verificationUrl,
      candidateName,
    });

    if (tier1Result.status !== 'UNAVAILABLE') {
      return this.applyResult(cert.id, tier1Result);
    }

    // ------------------------------------------------------------------------
    // Tier 2: Public URL Verification Check
    // ------------------------------------------------------------------------
    if (cert.verificationUrl) {
      const tier2Result = await this.tier2Verifier.verify({
        verificationUrl: cert.verificationUrl,
        candidateName,
        title: cert.title,
        issuer: cert.issuer,
        certificateNumber: cert.certificateNumber,
      });

      if (tier2Result.status !== 'UNAVAILABLE') {
        return this.applyResult(cert.id, tier2Result);
      }
    }

    // ------------------------------------------------------------------------
    // Tier 3: OCR + Heuristic Analysis Check
    // ------------------------------------------------------------------------
    if (cert.certificateFileUrl) {
      const tier3Result = await this.tier3Verifier.verify({
        certificateFileUrl: cert.certificateFileUrl,
        candidateName,
        title: cert.title,
        issuer: cert.issuer,
        certificateNumber: cert.certificateNumber,
        verificationUrl: cert.verificationUrl,
      });

      if (tier3Result.status !== 'UNAVAILABLE') {
        return this.applyResult(cert.id, tier3Result);
      }
    }

    // Default Fallback: If no tier was available to evaluate
    const fallbackResult: TierVerificationResult = {
      status: 'AMBIGUOUS',
      tier: 'TIER_3_OCR_HEURISTIC',
      confidence: 0,
      reason: 'No automated verification tier was capable of evaluating this certificate payload.',
    };

    return this.applyResult(cert.id, fallbackResult);
  }

  private async applyResult(
    certificateId: string,
    result: TierVerificationResult,
  ): Promise<VerificationRunOutput> {
    let sourceStatus: CertificateSourceStatus = 'pending';
    let status: CandidateCertificateStatus = 'IN_VERIFICATION';

    if (result.status === 'VERIFIED') {
      sourceStatus = 'source_verified';
      status = 'VERIFIED';
    } else if (result.status === 'FAILED') {
      sourceStatus = 'source_failed';
      status = 'REJECTED';
    } else {
      // Ambiguous or Unavailable -> pending & IN_VERIFICATION
      sourceStatus = 'pending';
      status = 'IN_VERIFICATION';
    }

    // Update database row
    const updated = await this.prisma.candidateCertificate.update({
      where: { id: certificateId },
      data: {
        sourceStatus,
        status,
      },
    });

    // Record audit event in CertificateVerificationEvent
    await this.prisma.certificateVerificationEvent.create({
      data: {
        candidateCertificateId: certificateId,
        status: updated.status,
        message: `[${result.tier}] ${result.status}: ${result.reason}`,
        metadata: {
          tier: result.tier,
          resultStatus: result.status,
          confidence: result.confidence,
          reason: result.reason,
          sourceStatus,
          verificationSource: result.tier,
          ...(result.metadata ?? {}),
        },
      },
    });

    return {
      certificateId,
      sourceStatus: updated.sourceStatus,
      status: updated.status,
      tierUsed: result.tier,
      result,
    };
  }
}
