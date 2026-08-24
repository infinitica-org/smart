import { Module } from '@nestjs/common';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';

@Module({
  controllers: [AiGatewayController],
  providers: [AnthropicAdapter, GoogleAdapter, AiGatewayService],
  exports: [AiGatewayService, AnthropicAdapter, GoogleAdapter],
})
export class AiGatewayModule {}
