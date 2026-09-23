import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProjectDefenseCompletedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CorroborationService } from '../corroboration/corroboration.service.js';
import { EvidenceSkillInferenceService } from '../evidence/evidence-skill-inference.service.js';
import { mapVerifiedProjectToQlixFusionInput } from './qlix-project.mapper.js';
import { RuleBasedEncoder } from './rule-based.encoder.js';

/**
 * After project defense completes with VERIFIED status, encodes persisted QLIX
 * evidence as passive X and re-fuses with any verified skill assessments (Y).
 *
 * Owner: Ramansh.
 */
@Injectable()
export class ProjectDefenseCompletedFusionConsumer implements OnModuleInit {
  private readonly logger = new Logger(ProjectDefenseCompletedFusionConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RuleBasedEncoder) private readonly encoder: RuleBasedEncoder,
    @Inject(CorroborationService) private readonly corroboration: CorroborationService,
    @Inject(EvidenceSkillInferenceService)
    private readonly skillInference: EvidenceSkillInferenceService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.projectDefenseCompleted,
        module: 'signal-encoder',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = ProjectDefenseCompletedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed smart.project.defense.completed payload');
              return;
            }

            const event = parsed.data.data;
            if (event.routedToReview || event.ownershipConcern) return;

            const project = await this.prisma.project.findUnique({
              where: { id: event.projectId },
              include: {
                skillMappings: { select: { skillCode: true } },
                qlixCheckResult: true,
              },
            });
            if (!project || project.status !== 'VERIFIED' || !project.qlixCheckResult) return;

            const verifiedProjects = await this.prisma.project.findMany({
              where: {
                studentId: project.studentId,
                status: 'VERIFIED',
                qlixCheckResult: { isNot: null },
              },
              include: {
                skillMappings: { select: { skillCode: true } },
                qlixCheckResult: true,
              },
            });

            const fusionProjects = verifiedProjects
              .map((row) =>
                mapVerifiedProjectToQlixFusionInput(row, {
                  defenseScore: row.id === event.projectId ? event.defenseScore : null,
                  ownershipConcern: row.id === event.projectId ? event.ownershipConcern : false,
                }),
              )
              .filter((row): row is NonNullable<typeof row> => row != null);

            if (fusionProjects.length === 0) return;

            const encodedAt = parsed.data.meta.occurredAt;
            const vector = this.encoder.encodeQlixVerifiedProjects({
              userId: project.studentId,
              projects: fusionProjects,
              encodedAt,
              fetchedAt: encodedAt,
            });
            if (vector.entries.length === 0) return;

            await this.corroboration.ingestPassiveSignal(vector);

            const skillCodes = [...new Set(project.skillMappings.map((row) => row.skillCode))];
            await this.corroboration.refusionVerifiedSkillClaims(project.studentId, {
              skillCodes,
            });
            if (skillCodes.length > 0) {
              await this.skillInference.recomputeForStudentSkills(project.studentId, skillCodes);
            }
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `project-defense fusion consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
