import { Module } from '@nestjs/common';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
import { AiGatewayAuditService } from './ai-gateway-audit.service.js';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';
import { AiGatewayUsageService } from './ai-gateway-usage.service.js';
import { ResumeParseService } from './resume-parse.service.js';
import { AiCircuitBreaker } from './circuit-breaker.js';

@Module({
  controllers: [AiGatewayController],
  providers: [
    AnthropicAdapter,
    GoogleAdapter,
    OpenRouterAdapter,
    AiGatewayAuditService,
    AiCircuitBreaker,
    AiGatewayService,
    AiGatewayUsageService,
    ResumeParseService,
  ],
  exports: [
    AiGatewayService,
    AiGatewayUsageService,
    ResumeParseService,
    AnthropicAdapter,
    GoogleAdapter,
    OpenRouterAdapter,
  ],
})
export class AiGatewayModule {}
