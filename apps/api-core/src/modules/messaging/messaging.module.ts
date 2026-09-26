import { Module } from '@nestjs/common';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { AdminConversationService } from './admin-conversation.service.js';
import { BlocksService } from './blocks.service.js';
import { ContactRulesService } from './contact-rules.service.js';
import { MessageReportsService } from './message-reports.service.js';
import { AdminConversationController } from './admin-conversation.controller.js';
import { MessagingController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';
import { ModerationPurgeProcessor } from './moderation-purge.processor.js';
import { ModerationRetentionService } from './moderation-retention.service.js';

/** COM-01 — direct messaging (Th6-422 to Th6-430). */
@Module({
  controllers: [MessagingController, AdminConversationController],
  providers: [
    ContactRulesService,
    MessagingService,
    BlocksService,
    MessageReportsService,
    AdminConversationService,
    ModerationRetentionService,
    ModerationPurgeProcessor,
    IdempotencyService,
  ],
  exports: [MessageReportsService, ContactRulesService, MessagingService],
})
export class MessagingModule {}
