import { Controller, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { SandboxService } from './sandbox.service.js';

@Controller(`${API_PREFIX}/sandbox`)
export class SandboxController {
  constructor(@Inject(SandboxService) private readonly service: SandboxService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'sandbox',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
