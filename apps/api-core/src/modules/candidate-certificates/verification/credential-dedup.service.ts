import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/prisma/prisma.service.js';

/**
 * Cross-store duplicate detection for real-world certificates/credentials.
 *
 * candidate_certificates and professional_credentials are separate tables
 * with no foreign key between them — a candidate could otherwise declare the
 * same real certificate twice (once per dashboard flow) and have both
 * independently feed the corroboration engine's EXTERNALCERT/
 * PROFESSIONALCREDENTIAL signals for the same evidence.
 *
 * Owner: Ramansh.
 */

export interface DedupCandidateInput {
  readonly issuer: string;
  readonly title: string;
  /** certificateNumber (candidate cert) or externalCredentialId (professional credential), if provided. */
  readonly identifierNumber?: string | null;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.,\-–—_/]/g, ' ')
    .replace(/\s+/g, ' ');
}

@Injectable()
export class CredentialDedupService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Throws ConflictException if candidateId already has a certificate or
   * credential that looks like the same real-world evidence as `input`.
   * Rejected/voided candidate-certificate rows never block a resubmission —
   * they represent a declaration the candidate/admin already discarded.
   */
  async assertNoDuplicate(candidateId: string, input: DedupCandidateInput): Promise<void> {
    const normalizedIssuer = normalize(input.issuer);
    const normalizedTitle = normalize(input.title);
    const normalizedNumber = input.identifierNumber ? normalize(input.identifierNumber) : null;

    const isMatch = (issuer: string, title: string, number: string | null) => {
      if (normalizedNumber && number && normalize(number) === normalizedNumber) return true;
      return normalize(issuer) === normalizedIssuer && normalize(title) === normalizedTitle;
    };

    const [certificates, credentials] = await Promise.all([
      this.prisma.candidateCertificate.findMany({
        where: { candidateId, status: { notIn: ['REJECTED', 'VOIDED'] } },
        select: { id: true, title: true, issuer: true, certificateNumber: true },
      }),
      this.prisma.professionalCredential.findMany({
        where: { studentId: candidateId },
        select: { id: true, credentialName: true, issuer: true, externalCredentialId: true },
      }),
    ]);

    const duplicateCertificate = certificates.find((c) =>
      isMatch(c.issuer, c.title, c.certificateNumber),
    );
    if (duplicateCertificate) {
      throw new ConflictException({
        error: 'duplicate_certificate',
        message: `You already have a certificate on file for "${duplicateCertificate.title}" from ${duplicateCertificate.issuer}. Update that entry instead of adding a duplicate.`,
        existingCertificateId: duplicateCertificate.id,
      });
    }

    const duplicateCredential = credentials.find((c) =>
      isMatch(c.issuer, c.credentialName, c.externalCredentialId),
    );
    if (duplicateCredential) {
      throw new ConflictException({
        error: 'duplicate_credential',
        message: `You already have a credential on file for "${duplicateCredential.credentialName}" from ${duplicateCredential.issuer}. Update that entry instead of adding a duplicate.`,
        existingCredentialId: duplicateCredential.id,
      });
    }
  }
}
