import { Controller, Get } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import type { AiGatewayService } from './ai-gateway.service.js';

@Controller(`${API_PREFIX}/ai-gateway`)
export class AiGatewayController {
  constructor(private readonly service: AiGatewayService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'ai-gateway',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
