import { Injectable } from '@nestjs/common';

@Injectable()
export class AiGatewayService {
  readonly owner = 'Ramansh';
  readonly purpose = 'The only module allowed to import an LLM SDK.';
}
