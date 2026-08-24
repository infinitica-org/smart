import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import type { WebhooksService } from './webhooks.service.js';

@ApiTags('webhooks')
@Controller(`${API_PREFIX}/webhooks`)
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'webhooks',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
