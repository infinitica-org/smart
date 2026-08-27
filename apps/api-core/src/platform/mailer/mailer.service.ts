import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { renderEmailTemplate } from './email-templates.js';
import type { EmailJobPayload } from './mailer.types.js';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      auth:
        env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  async send(payload: EmailJobPayload): Promise<void> {
    const rendered = renderEmailTemplate(payload.template, payload.data);
    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to: payload.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    this.logger.log(`Email sent to ${payload.to} (${payload.template})`);
  }
}
