import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WEBHOOK_HEADERS } from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  readonly owner = 'Vishal Bharath R';
  readonly purpose = 'Outbound signed webhooks.';

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolveStudentInstitution(
    studentId: string,
  ): Promise<{ institutionId: string | null } | null> {
    return this.prisma.user.findUnique({
      where: { id: studentId },
      select: { institutionId: true },
    });
  }

  async dispatch(params: {
    institutionId: string;
    eventType: string;
    payload: unknown;
  }): Promise<void> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        institutionId: params.institutionId,
        active: true,
        events: { has: params.eventType },
      },
    });

    if (endpoints.length === 0) return;

    const body = JSON.stringify(params.payload);
    for (const endpoint of endpoints) {
      const eventId = randomUUID();
      const timestamp = String(Math.floor(Date.now() / 1000));
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [WEBHOOK_HEADERS.eventType]: params.eventType,
            [WEBHOOK_HEADERS.eventId]: eventId,
            [WEBHOOK_HEADERS.timestamp]: timestamp,
            [WEBHOOK_HEADERS.idempotencyKey]: eventId,
          },
          body,
        });
        this.logger.log(`Webhook ${params.eventType} → ${endpoint.url} (${response.status})`);
      } catch (error) {
        this.logger.warn(
          `Webhook delivery failed for ${endpoint.url}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
  }
}
