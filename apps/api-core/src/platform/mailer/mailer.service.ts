import { Inject, Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env.js';
import { renderEmailTemplate } from './email-templates.js';
import type { EmailJobPayload } from './mailer.types.js';
import { SmtpService } from './smtp.service.js';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(@Inject(SmtpService) private readonly smtp: SmtpService) {}

  async send(payload: EmailJobPayload): Promise<void> {
    const rendered = renderEmailTemplate(payload.template, payload.data);
    await this.smtp.send({
      from: env.SMTP_FROM,
      to: payload.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    this.logger.log(`Email sent to ${payload.to} (${payload.template})`);
  }
}
