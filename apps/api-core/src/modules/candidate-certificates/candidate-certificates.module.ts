import { Module } from '@nestjs/common';
import { CandidateCertificatesController } from './candidate-certificates.controller.js';
import { PublicCertificateEndorsementController } from './public-certificate-endorsement.controller.js';
import { CandidateCertificatesService } from './candidate-certificates.service.js';

@Module({
  controllers: [CandidateCertificatesController, PublicCertificateEndorsementController],
  providers: [CandidateCertificatesService],
})
export class CandidateCertificatesModule {}
