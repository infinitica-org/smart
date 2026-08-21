import { Controller, Get } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import type { SandboxService } from './sandbox.service.js';

@Controller(`${API_PREFIX}/sandbox`)
export class SandboxController {
  constructor(private readonly service: SandboxService) {}

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
