import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env.js';

export interface SmtpMessage {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

/**
 * Low-level SMTP transport used by the mailer queue worker.
 * Owner: Vishal V (SE-T07 / SE-T08).
 */
@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.warn(
        `SMTP verify failed (${env.SMTP_HOST}:${env.SMTP_PORT}): ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return false;
    }
  }

  async send(message: SmtpMessage): Promise<void> {
    await this.transporter.sendMail(message);
  }
}
