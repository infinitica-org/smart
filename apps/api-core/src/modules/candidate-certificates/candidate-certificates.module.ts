import { Module } from '@nestjs/common';
import { CandidateCertificateVoidAdminController } from './candidate-certificate-void-admin.controller.js';
import { CandidateCertificatesController } from './candidate-certificates.controller.js';
import { PublicCertificateEndorsementController } from './public-certificate-endorsement.controller.js';
import { CandidateCertificatesAdminController } from './candidate-certificates-admin.controller.js';
import { CandidateCertificatesService } from './candidate-certificates.service.js';
import { CertificateSourceVerificationService } from './verification/certificate-source-verification.service.js';
import {
  AccredibleAdapter,
  AwsAdapter,
  CredlyAdapter,
  GoogleAdapter,
  MicrosoftAdapter,
} from './verification/tier1-issuer-adapter.js';
import { Tier1IssuerRegistry } from './verification/tier1-issuer-registry.js';
import { Tier2PublicUrlVerifier } from './verification/tier2-public-url-verifier.js';
import { Tier3OcrVerifier } from './verification/tier3-ocr-verifier.js';

@Module({
  controllers: [
    CandidateCertificatesController,
    PublicCertificateEndorsementController,
    CandidateCertificatesAdminController,
    CandidateCertificateVoidAdminController,
  ],
  providers: [
    CandidateCertificatesService,
    CertificateSourceVerificationService,
    Tier1IssuerRegistry,
    CredlyAdapter,
    AccredibleAdapter,
    AwsAdapter,
    GoogleAdapter,
    MicrosoftAdapter,
    Tier2PublicUrlVerifier,
    Tier3OcrVerifier,
  ],
})
export class CandidateCertificatesModule {}
