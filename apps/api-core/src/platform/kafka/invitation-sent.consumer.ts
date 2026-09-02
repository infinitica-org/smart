import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InvitationSentEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import type { EmailTemplateName } from '../mailer/mailer.types.js';
import { env } from '../config/env.js';
import { NotificationsService } from '../../modules/notifications/notifications.service.js';
import { KafkaService } from './kafka.service.js';

/**
 * Consumes invitation.sent and enqueues in-app notification + email via BullMQ.
 */
@Injectable()
export class InvitationSentConsumer implements OnModuleInit {
  private readonly logger = new Logger(InvitationSentConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.invitationSent,
        module: 'notifications',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = InvitationSentEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed invitation.sent payload');
              return;
            }

            const event = parsed.data.data;
            const template = event.template as EmailTemplateName;
            const title =
              template === 'institution-admin-invite'
                ? `Invitation to manage ${event.institutionName}`
                : `Invitation to join ${event.institutionName}`;
            const body =
              template === 'institution-admin-invite'
                ? `You have been invited as an institution admin for ${event.institutionName}.`
                : `You have been invited to join ${event.institutionName} on SMART.`;

            await this.notifications.notify({
              userId: event.userId,
              email: event.email,
              kind: 'INVITATION',
              title,
              body,
              linkUrl: event.inviteUrl,
              emailTemplate: template,
              emailData: {
                fullName: event.fullName,
                institutionName: event.institutionName,
                inviteUrl: event.inviteUrl,
                batchName: event.batchName,
              },
              metadata: {
                invitationId: event.invitationId,
              },
            });
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `invitation.sent consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
