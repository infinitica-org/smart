import { Module } from '@nestjs/common';
import { CorroborationAdminController } from './corroboration-admin.controller.js';
import { CorroborationController } from './corroboration.controller.js';
import { CorroborationRedisStore } from './corroboration-redis.store.js';
import { CorroborationService } from './corroboration.service.js';
import { SignalWeightModelStore } from './signal-weight-model.store.js';
@Module({
  controllers: [CorroborationController, CorroborationAdminController],
  providers: [CorroborationRedisStore, SignalWeightModelStore, CorroborationService],
  exports: [CorroborationService, SignalWeightModelStore],
})
export class CorroborationModule {}
