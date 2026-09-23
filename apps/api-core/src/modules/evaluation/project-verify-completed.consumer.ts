import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProjectVerifyCompletedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CapabilityInferenceService } from './capability-inference.service.js';
import { EvidenceSkillInferenceService } from '../evidence/evidence-skill-inference.service.js';

@Injectable()
export class ProjectVerifyCompletedConsumer implements OnModuleInit {
  private readonly logger = new Logger(ProjectVerifyCompletedConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CapabilityInferenceService)
    private readonly capabilityInference: CapabilityInferenceService,
    @Inject(EvidenceSkillInferenceService)
    private readonly skillInference: EvidenceSkillInferenceService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.projectVerifyCompleted,
        module: 'evaluation',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = ProjectVerifyCompletedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed smart.project.verify.completed payload');
              return;
            }
            const { projectId } = parsed.data.data;
            const project = await this.prisma.project.findUnique({
              where: { id: projectId },
              select: {
                studentId: true,
                skillMappings: { select: { skillCode: true } },
              },
            });
            if (!project) return;
            await this.capabilityInference.inferForProject(projectId, project.studentId);
            const skillCodes = project.skillMappings.map((row) => row.skillCode);
            if (skillCodes.length > 0) {
              await this.skillInference.recomputeForStudentSkills(project.studentId, skillCodes);
            }
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `project.verify.completed consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
