import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import {
  API_PREFIX,
  AiCompletionRequestSchema,
  type AiCompletionResponse,
  type AiHealthDto,
  type AiUsageSummaryDto,
} from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { AiGatewayService } from './ai-gateway.service.js';
import { AiGatewayUsageService } from './ai-gateway-usage.service.js';

@Controller()
export class AiGatewayController {
  constructor(
    @Inject(AiGatewayService) private readonly service: AiGatewayService,
    @Inject(AiGatewayUsageService) private readonly usage: AiGatewayUsageService,
  ) {}

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

  /** Cost, volume, latency and fallback aggregated from ai_evaluation_audits. */
  @Get(`${API_PREFIX}/admin/ai-usage`)
  @Roles('SUPER_ADMIN')
  adminAiUsage(): Promise<AiUsageSummaryDto> {
    return this.usage.getUsageSummary();
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
