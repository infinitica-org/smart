import { Controller, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { WebhooksService } from './webhooks.service.js';

@Controller(`${API_PREFIX}/webhooks`)
export class WebhooksController {
  constructor(@Inject(WebhooksService) private readonly service: WebhooksService) {}

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
