import { Controller, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { CertificateService } from './certificate.service.js';

@Controller(`${API_PREFIX}/certificate`)
export class CertificateController {
  constructor(@Inject(CertificateService) private readonly service: CertificateService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'certificate',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
