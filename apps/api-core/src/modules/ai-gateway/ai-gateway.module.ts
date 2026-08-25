import { Module } from '@nestjs/common';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
import { AiGatewayAuditService } from './ai-gateway-audit.service.js';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';
import { AiCircuitBreaker } from './circuit-breaker.js';

@Module({
  controllers: [AiGatewayController],
  providers: [
    AnthropicAdapter,
    GoogleAdapter,
    OpenRouterAdapter,
    AiCircuitBreaker,
    AiGatewayAuditService,
    AiGatewayService,
  ],
  exports: [
    AiGatewayService,
    AiGatewayAuditService,
    AiCircuitBreaker,
    AnthropicAdapter,
    GoogleAdapter,
    OpenRouterAdapter,
  ],
})
export class AiGatewayModule {}
