import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProjectSubmittedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { ProjectVerifyRunnerService } from './project-verify-runner.service.js';

@Injectable()
export class ProjectSubmittedConsumer implements OnModuleInit {
  private readonly logger = new Logger(ProjectSubmittedConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(ProjectVerifyRunnerService) private readonly verifyRunner: ProjectVerifyRunnerService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.projectSubmitted,
        module: 'evaluation',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = ProjectSubmittedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed smart.project.submitted payload');
              return;
            }
            const { projectId, studentId } = parsed.data.data;
            await this.verifyRunner.runForProject(projectId, studentId);
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `project.submitted consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
