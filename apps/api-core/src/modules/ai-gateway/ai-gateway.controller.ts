import { Controller, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { AiGatewayService } from './ai-gateway.service.js';

@Controller(`${API_PREFIX}/ai-gateway`)
export class AiGatewayController {
  constructor(@Inject(AiGatewayService) private readonly service: AiGatewayService) {}

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
