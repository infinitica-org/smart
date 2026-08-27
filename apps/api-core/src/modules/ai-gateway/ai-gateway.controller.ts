import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import {
  API_PREFIX,
  AiCompletionRequestSchema,
  type AiCompletionResponse,
  type AiHealthDto,
} from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { AiGatewayService } from './ai-gateway.service.js';

@Controller()
export class AiGatewayController {
  constructor(@Inject(AiGatewayService) private readonly service: AiGatewayService) {}

  @Public()
  @Get('/ai/health')
  health(): Promise<AiHealthDto> {
    return this.service.getHealth();
  }

  @Public()
  @Get(`${API_PREFIX}/ai/health`)
  versionedHealth(): Promise<AiHealthDto> {
    return this.service.getHealth();
  }

  @Get(`${API_PREFIX}/admin/ai-health`)
  @Roles('SUPER_ADMIN')
  adminAiHealth(): Promise<AiHealthDto> {
    return this.service.getHealth();
  }

  @Get(`${API_PREFIX}/ai-gateway/_meta`)
  meta() {
    return {
      module: 'ai-gateway',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'active',
    };
  }

  @Post(`${API_PREFIX}/ai-gateway/complete`)
  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
  complete(@Body() body: unknown): Promise<AiCompletionResponse> {
    return this.service.complete(AiCompletionRequestSchema.parse(body));
  }
}
