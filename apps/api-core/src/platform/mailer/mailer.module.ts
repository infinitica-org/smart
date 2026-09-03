import { Global, Module } from '@nestjs/common';
import { MailerService } from './mailer.service.js';
import { SmtpService } from './smtp.service.js';

@Global()
@Module({
  providers: [SmtpService, MailerService],
  exports: [SmtpService, MailerService],
})
export class MailerModule {}
