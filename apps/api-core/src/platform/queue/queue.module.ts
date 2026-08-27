import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { env } from '../config/env.js';
import { EMAIL_QUEUE } from '../mailer/mailer.types.js';
import { EmailProcessor } from './email.processor.js';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: { url: env.REDIS_URL },
    }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  providers: [EmailProcessor],
  exports: [BullModule],
})
export class QueueModule {}
