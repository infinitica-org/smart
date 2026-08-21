import { Module } from '@nestjs/common';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';

@Module({
  controllers: [AiGatewayController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
