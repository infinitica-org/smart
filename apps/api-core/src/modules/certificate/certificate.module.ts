import { Module } from '@nestjs/common';
import { CertificateController } from './certificate.controller.js';
import { CertificateService } from './certificate.service.js';

@Module({
  controllers: [CertificateController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificateModule {}
