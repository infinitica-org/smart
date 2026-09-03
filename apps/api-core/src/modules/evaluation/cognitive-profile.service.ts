import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  COGNITIVE_PROFILE_PROMPT_REF,
  COGNITIVE_PROFILE_REFRESH_DAYS,
  RefreshCognitiveProfileRequestSchema,
  RefreshCognitiveProfileResponseSchema,
  type CognitiveProfileSnapshot,
  type RefreshCognitiveProfileResponse,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import { buildCognitiveBioDigest, isCognitiveProfileFresh } from './cognitive-profile.digest.js';
import { parseCognitiveCommLlmOutput, toCognitiveSnapshot } from './cognitive-profile.mapper.js';

@Injectable()
export class CognitiveProfileService {
  private readonly logger = new Logger(CognitiveProfileService.name);

  constructor(
    @Inject(AiGatewayService) private readonly gateway: AiGatewayService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async getMine(studentId: string): Promise<CognitiveProfileSnapshot> {
    const snapshot = await this.loadSnapshot(studentId);
    if (!snapshot) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Cognitive profile has not been generated yet.',
        statusCode: 404,
      });
    }
    return snapshot;
  }

  async refresh(
    studentId: string,
    body: unknown,
    now: Date = new Date(),
  ): Promise<RefreshCognitiveProfileResponse> {
    const request = RefreshCognitiveProfileRequestSchema.parse(body ?? {});
    const existing = await this.loadSnapshot(studentId);
    if (
      existing &&
      !request.force &&
      isCognitiveProfileFresh(new Date(existing.refreshedAt), now, COGNITIVE_PROFILE_REFRESH_DAYS)
    ) {
      return RefreshCognitiveProfileResponseSchema.parse({
        status: 'ready',
        studentId,
        refreshedAt: existing.refreshedAt,
        snapshot: existing,
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user || user.role !== 'STUDENT' || !user.onboardingCompleted) {
      throw new ConflictException({
        error: 'onboarding_incomplete',
        message: 'Complete candidate onboarding before generating a cognitive profile.',
        statusCode: 409,
      });
    }

    const bioDigest = buildCognitiveBioDigest(user.onboardingDetails);
    if (!bioDigest) {
      throw new ConflictException({
        error: 'onboarding_incomplete',
        message: 'Onboarding details are missing or invalid.',
        statusCode: 409,
      });
    }

    try {
      const result = await this.gateway.complete({
        promptRef: COGNITIVE_PROFILE_PROMPT_REF,
        modelRole: 'PRIMARY_REASONING',
        priority: 'P3_BATCH',
        variables: {
          bioDigest,
          refreshReason: request.force ? 'forced-refresh' : 'onboarding',
        },
        correlation: {},
        temperature: 0.2,
        maxOutputTokens: 1_536,
      });
      const parsed = parseCognitiveCommLlmOutput(result.output);
      const refreshedAt = now;
      await this.persist(studentId, parsed, refreshedAt);
      const snapshot = toCognitiveSnapshot({
        studentId,
        refreshedAt,
        cognitiveNarrative: parsed.cognitiveNarrative,
        communicationNarrative: parsed.communicationNarrative,
        cognitiveStrengths: parsed.cognitiveStrengths,
        cognitiveWeaknesses: parsed.cognitiveWeaknesses,
        communicationStrengths: parsed.communicationStrengths,
        communicationWeaknesses: parsed.communicationWeaknesses,
        cognitiveScore: parsed.cognitiveScore ?? null,
        communicationScore: parsed.communicationScore ?? null,
      });
      this.logger.log(`Cognitive profile refreshed for student ${studentId}`);
      return RefreshCognitiveProfileResponseSchema.parse({
        status: 'ready',
        studentId,
        refreshedAt: snapshot.refreshedAt,
        snapshot,
      });
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      if (err instanceof BadGatewayException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cognitive profile failed closed: ${message}`);
      throw new BadGatewayException({
        error: 'cognitive_profile_unavailable',
        message: 'Cognitive profile could not be generated.',
      });
    }
  }

  private async persist(
    studentId: string,
    parsed: ReturnType<typeof parseCognitiveCommLlmOutput>,
    refreshedAt: Date,
  ): Promise<void> {
    const cognitiveScore = parsed.cognitiveScore ?? null;
    const communicationScore = parsed.communicationScore ?? null;
    await this.prisma.$transaction([
      this.prisma.cognitiveProfile.upsert({
        where: { studentId },
        create: {
          studentId,
          narrative: parsed.cognitiveNarrative,
          strengths: parsed.cognitiveStrengths as Prisma.InputJsonValue,
          weaknesses: parsed.cognitiveWeaknesses as Prisma.InputJsonValue,
          score: cognitiveScore,
          refreshedAt,
        },
        update: {
          narrative: parsed.cognitiveNarrative,
          strengths: parsed.cognitiveStrengths as Prisma.InputJsonValue,
          weaknesses: parsed.cognitiveWeaknesses as Prisma.InputJsonValue,
          score: cognitiveScore,
          refreshedAt,
        },
      }),
      this.prisma.communicationProfile.upsert({
        where: { studentId },
        create: {
          studentId,
          narrative: parsed.communicationNarrative,
          strengths: parsed.communicationStrengths as Prisma.InputJsonValue,
          weaknesses: parsed.communicationWeaknesses as Prisma.InputJsonValue,
          score: communicationScore,
          refreshedAt,
        },
        update: {
          narrative: parsed.communicationNarrative,
          strengths: parsed.communicationStrengths as Prisma.InputJsonValue,
          weaknesses: parsed.communicationWeaknesses as Prisma.InputJsonValue,
          score: communicationScore,
          refreshedAt,
        },
      }),
    ]);
  }

  private async loadSnapshot(studentId: string): Promise<CognitiveProfileSnapshot | null> {
    const [cognitive, communication] = await Promise.all([
      this.prisma.cognitiveProfile.findUnique({ where: { studentId } }),
      this.prisma.communicationProfile.findUnique({ where: { studentId } }),
    ]);
    if (!cognitive || !communication) return null;
    try {
      return toCognitiveSnapshot({
        studentId,
        refreshedAt:
          cognitive.refreshedAt > communication.refreshedAt
            ? cognitive.refreshedAt
            : communication.refreshedAt,
        cognitiveNarrative: cognitive.narrative,
        communicationNarrative: communication.narrative,
        cognitiveStrengths: cognitive.strengths,
        cognitiveWeaknesses: cognitive.weaknesses,
        communicationStrengths: communication.strengths,
        communicationWeaknesses: communication.weaknesses,
        cognitiveScore: cognitive.score,
        communicationScore: communication.score,
      });
    } catch {
      return null;
    }
  }
}
