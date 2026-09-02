import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CertificateService } from './certificate.service.js';

@ApiTags('certificate')
@Controller(`${API_PREFIX}/certificate`)
export class CertificateController {
  constructor(@Inject(CertificateService) private readonly service: CertificateService) {}

  @Get('_meta')
  meta() {
    return this.service.getMeta();
  }
}
