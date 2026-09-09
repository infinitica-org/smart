import { Module } from '@nestjs/common';
import { CandidateCertificateVoidAdminController } from './candidate-certificate-void-admin.controller.js';
import { CandidateCertificatesController } from './candidate-certificates.controller.js';
import { PublicCertificateEndorsementController } from './public-certificate-endorsement.controller.js';
import { CandidateCertificatesService } from './candidate-certificates.service.js';

@Module({
  controllers: [
    CandidateCertificatesController,
    PublicCertificateEndorsementController,
    CandidateCertificateVoidAdminController,
  ],
  providers: [CandidateCertificatesService],
})
export class CandidateCertificatesModule {}
