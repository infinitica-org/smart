import { Module } from '@nestjs/common';
import { CorroborationAdminController } from './corroboration-admin.controller.js';
import { CorroborationController } from './corroboration.controller.js';
import { CorroborationRedisStore } from './corroboration-redis.store.js';
import { CorroborationService } from './corroboration.service.js';
@Module({
  controllers: [CorroborationController, CorroborationAdminController],
  providers: [CorroborationRedisStore, CorroborationService],
  exports: [CorroborationService],
})
export class CorroborationModule {}
