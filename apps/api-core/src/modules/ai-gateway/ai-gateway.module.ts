import { Module } from '@nestjs/common';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';

@Module({
  controllers: [AiGatewayController],
  providers: [AnthropicAdapter, GoogleAdapter, OpenRouterAdapter, AiGatewayService],
  exports: [AiGatewayService, AnthropicAdapter, GoogleAdapter, OpenRouterAdapter],
})
export class AiGatewayModule {}
