import { Injectable } from '@nestjs/common';

@Injectable()
export class WebhooksService {
  readonly owner = 'Vishal Bharath R';
  readonly purpose = 'Outbound signed webhooks.';
}
