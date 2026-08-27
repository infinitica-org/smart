import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MailerService } from '../mailer/mailer.service.js';
import { EMAIL_QUEUE, type EmailJobPayload } from '../mailer/mailer.types.js';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  constructor(@Inject(MailerService) private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job<EmailJobPayload>): Promise<void> {
    await this.mailer.send(job.data);
  }
}
