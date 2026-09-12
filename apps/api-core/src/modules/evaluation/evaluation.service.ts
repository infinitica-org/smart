import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CERT_AGENDA_PROMPT_REF,
  CERT_AGENDA_REGEN_MAX,
  CERT_VERIFY_PASS_MARK_PERCENT,
  CERT_VERIFY_TIME_MINUTES,
  GenerateCertAgendaRequestSchema,
  GenerateCertAgendaResponseSchema,
  GradeCertAgendaRequestSchema,
  GradeCertAgendaResponseSchema,
  GenerateSdeSkillFormRequestSchema,
  GenerateSdeSkillFormResponseSchema,
  GradeSdeSkillFormRequestSchema,
  GradeSdeSkillFormResponseSchema,
  GenerateSkillInterviewRequestSchema,
  GenerateSkillInterviewResponseSchema,
  GradeSkillInterviewRequestSchema,
  GradeSkillInterviewResponseSchema,
  REDIS_TTL_SECONDS,
  RunSdeSkillFormCodeRequestSchema,
  RunSdeSkillFormCodeResponseSchema,
  SKILL_INTERVIEW_ANSWER_MAX_CHARS,
  SKILL_INTERVIEW_EXPLANATION_MAX_CHARS,
  SKILL_INTERVIEW_QUESTION_COUNT,
  SkillInterviewQuestionSchema,
  certAgendaTaxonomySnapshot,
  type GenerateCertAgendaResponse,
  type GradeCertAgendaResponse,
  type GenerateSdeSkillFormResponse,
  type GenerateSkillInterviewResponse,
  type GradeSdeSkillFormResponse,
  type GradeSkillInterviewResponse,
  type RunSdeSkillFormCodeResponse,
} from '@smart/contracts';
import {
  SDE_SKILL_CODE_RUNNER_PROMPT_REF,
  SDE_SKILL_FORM_CLOSED_PROMPT_REF,
  SDE_SKILL_FORM_CLOSED_PROMPT_REF_V3,
  SDE_SKILL_FORM_OPEN_PROMPT_REF,
  SDE_SKILL_FORM_OPEN_PROMPT_REF_V3,
  SDE_SKILL_OPEN_BATCH_GRADER_PROMPT_REF,
  SDE_V4_PROFICIENCIES,
  SDE_V4_SKILL_BY_CODE,
  SdeCodeRunnerOutputSchema,
  SdeOpenBatchGradeSchema,
  SdeSkillFormClosedOutputSchema,
  SdeSkillFormClosedOutputSchemaV3,
  SdeSkillFormOpenOutputSchema,
  SdeSkillFormOpenOutputSchemaV3,
  agendaGuardFailure,
  alignAgendaToSyllabus,
  assertSdeV4FormShape,
  CertAgendaScorableGenerateOutputSchema,
  publisherSyllabus,
  toStudentPaperFromScorable,
  type CompetencySlot,
  type SdeV4Format,
} from '@smart/prompts';
import {
  computeSdeV4FormScore,
  SDE_V4_MARKS,
  scoreClosedChoice,
  assignCompetencyIds,
  scaleFormCounts,
  evaluateAssessmentIntelligence,
} from '@smart/scoring-engine';
import {
  buildSkillBlueprintForCategory,
  getSkillDefinition,
  type SkillBlueprint,
} from '@smart/contracts';
import { Effect, Either } from 'effect';
import { z } from 'zod';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import { sealSdeFormPayload, unsealSdeFormPayload } from './sde-form-seal.js';
import { RedisService } from '../../platform/redis/redis.service.js';

export const SKILL_INTERVIEW_EXAMINER_PROMPT_REF = 'skill-interview-examiner@1' as const;
export const SKILL_INTERVIEW_GRADER_PROMPT_REF = 'skill-interview-grader@1' as const;

const ScoringKeySchema = z.object({
  index: z.number().int().min(1),
  format: z.enum(['MCQ', 'TRACE', 'CODING', 'SCENARIO', 'DEBUG', 'DESIGN_REASONING']),
  answer: z.enum(['A', 'B', 'C', 'D']).optional(),
  prompt: z.string().optional(),
  rubric: z.string().optional(),
  modelAnswer: z.string().optional(),
  marksMax: z.number(),
  competencyIds: z.array(z.string().uuid()).max(5).optional(),
  hiddenTests: z
    .array(
      z.object({
        input: z.string().min(1).max(800),
        expected: z.string().min(1).max(800),
      }),
    )
    .max(8)
    .optional(),
});

const SealedSdeFormSchema = z.object({
  exp: z.number(),
  userId: z.string().uuid(),
  skillCode: z.string(),
  proficiency: z.enum(SDE_V4_PROFICIENCIES),
  items: z.array(ScoringKeySchema).min(1),
  intelligenceEnabled: z.boolean().optional(),
  catalogSkillCode: z.string().optional(),
  targetProficiency: z.enum(SDE_V4_PROFICIENCIES).optional(),
  stage: z.enum(['DIAGNOSTIC', 'TARGETED', 'FULL']).optional(),
});

const ExaminerOutputSchema = z.object({
  questions: z.array(SkillInterviewQuestionSchema).length(SKILL_INTERVIEW_QUESTION_COUNT),
});

const GraderOutputSchema = z.object({
  passed: z.boolean(),
  explanation: z.string().min(10).max(SKILL_INTERVIEW_EXPLANATION_MAX_CHARS),
});

@Injectable()
export class EvaluationService {
  readonly owner = 'Ramansh';
  readonly purpose =
    'BARS grading, L4 defense, skill interview, SDE v4 skill-form, and cert-agenda generate.';
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    @Inject(AiGatewayService) private readonly gateway: AiGatewayService,
    @Inject(RedisService) private readonly redis?: RedisService,
  ) {}

  async generateCertAgenda(body: unknown, userId: string): Promise<GenerateCertAgendaResponse> {
    const request = GenerateCertAgendaRequestSchema.parse(body);
    const syllabus = publisherSyllabus(request.trackCode);
    const alignment = alignAgendaToSyllabus(request.agendaLines, syllabus);
    const guard = agendaGuardFailure(alignment);
    if (guard === 'sparse_agenda') {
      throw new UnprocessableEntityException({
        error: 'sparse_agenda',
        message: 'Agenda is too sparse to generate a certification paper.',
        statusCode: 422,
      });
    }
    if (guard === 'agenda_drift') {
      throw new UnprocessableEntityException({
        error: 'agenda_drift',
        message: 'Agenda drifts from the publisher syllabus for this track.',
        statusCode: 422,
      });
    }

    await this.consumeCertAgendaRegen(userId);

    try {
      const result = await this.gateway.complete({
        promptRef: CERT_AGENDA_PROMPT_REF,
        modelRole: 'PRIMARY_REASONING',
        priority: 'P3_BATCH',
        variables: {
          trackCode: syllabus.trackCode,
          trackName: syllabus.trackName,
          syllabusTopics: [...syllabus.topics],
          agendaLines: request.agendaLines,
        },
        correlation: {},
        maxOutputTokens: 4_096,
        temperature: 0,
      });
      const parsed = CertAgendaScorableGenerateOutputSchema.parse(result.output);
      return GenerateCertAgendaResponseSchema.parse({
        trackCode: request.trackCode,
        items: toStudentPaperFromScorable(parsed.items),
        promptRef: CERT_AGENDA_PROMPT_REF,
        taxonomyVersionSnapshot: certAgendaTaxonomySnapshot(),
        auditId: result.auditId ?? null,
      });
    } catch (err) {
      this.failClosed(
        err,
        'cert_agenda_unavailable',
        'Certification paper could not be generated.',
      );
    }
  }

  /**
   * CV-T02 — cert verify session paper with sealed scoring token (correctKey never exposed).
   */
  async generateCertAgendaVerifyPaper(
    body: unknown,
    userId: string,
    certificateId: string,
  ): Promise<{
    items: GenerateCertAgendaResponse['items'];
    scoringToken: string;
    taxonomyVersionSnapshot: string;
    timeMinutes: number;
    passMarkPercent: number;
  }> {
    const request = GenerateCertAgendaRequestSchema.parse(body);
    const syllabus = publisherSyllabus(request.trackCode);
    const alignment = alignAgendaToSyllabus(request.agendaLines, syllabus);
    const guard = agendaGuardFailure(alignment);
    if (guard === 'sparse_agenda') {
      throw new UnprocessableEntityException({
        error: 'sparse_agenda',
        message: 'Agenda is too sparse to generate a certification paper.',
        statusCode: 422,
      });
    }
    if (guard === 'agenda_drift') {
      throw new UnprocessableEntityException({
        error: 'agenda_drift',
        message: 'Agenda drifts from the publisher syllabus for this track.',
        statusCode: 422,
      });
    }

    await this.consumeCertAgendaRegen(userId);

    try {
      const result = await this.gateway.complete({
        promptRef: CERT_AGENDA_PROMPT_REF,
        modelRole: 'PRIMARY_REASONING',
        priority: 'P3_BATCH',
        variables: {
          trackCode: syllabus.trackCode,
          trackName: syllabus.trackName,
          syllabusTopics: [...syllabus.topics],
          agendaLines: request.agendaLines,
        },
        correlation: {},
        maxOutputTokens: 4_096,
        temperature: 0,
      });
      const parsed = CertAgendaScorableGenerateOutputSchema.parse(result.output);
      const expiresAt = Date.now() + CERT_VERIFY_TIME_MINUTES * 60_000;
      const scoringToken = sealSdeFormPayload({
        certificateId,
        userId,
        exp: expiresAt,
        items: parsed.items.map((item) => ({
          index: item.index,
          correctKey: item.correctKey,
        })),
      });
      return {
        items: toStudentPaperFromScorable(parsed.items),
        scoringToken,
        taxonomyVersionSnapshot: certAgendaTaxonomySnapshot(),
        timeMinutes: CERT_VERIFY_TIME_MINUTES,
        passMarkPercent: CERT_VERIFY_PASS_MARK_PERCENT,
      };
    } catch (err) {
      this.failClosed(
        err,
        'cert_agenda_unavailable',
        'Certification paper could not be generated.',
      );
    }
  }

  async gradeCertAgendaPaper(body: unknown, ownerUserId: string): Promise<GradeCertAgendaResponse> {
    const request = GradeCertAgendaRequestSchema.parse(body);
    const SealedCertAgendaSchema = z.object({
      certificateId: z.string().uuid(),
      userId: z.string().uuid(),
      exp: z.number(),
      items: z.array(
        z.object({
          index: z.number().int().min(1),
          correctKey: z.enum(['A', 'B', 'C', 'D']),
        }),
      ),
    });

    let bundle: z.infer<typeof SealedCertAgendaSchema>;
    try {
      bundle = SealedCertAgendaSchema.parse(unsealSdeFormPayload(request.scoringToken));
    } catch {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Invalid scoring token.',
      });
    }
    if (bundle.exp < Date.now()) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Scoring token expired.',
      });
    }
    if (bundle.userId !== ownerUserId) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Scoring token does not match this student.',
      });
    }
    if (bundle.certificateId !== request.certificateId) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Scoring token does not match this certificate.',
      });
    }

    const byIndex = new Map(request.responses.map((row) => [row.index, row]));
    const itemResults: GradeCertAgendaResponse['itemResults'] = [];
    let marksEarned = 0;
    let marksTotal = 0;

    for (const key of bundle.items) {
      const response = byIndex.get(key.index);
      const earned = scoreClosedChoice(response?.selectedKey ?? null, key.correctKey);
      const max = 1;
      marksEarned += earned;
      marksTotal += max;
      const correct = earned === max;
      itemResults.push({
        index: key.index,
        marksEarned: earned,
        marksMax: max,
        correct,
        selectedKey: response?.selectedKey,
        correctKey: key.correctKey,
        feedback: correct ? 'Correct.' : `Incorrect. The correct option was ${key.correctKey}.`,
      });
    }

    const scorePercent = marksTotal === 0 ? 0 : (marksEarned / marksTotal) * 100;
    const passed = scorePercent >= CERT_VERIFY_PASS_MARK_PERCENT;

    return GradeCertAgendaResponseSchema.parse({
      certificateId: request.certificateId,
      marksEarned,
      marksTotal,
      scorePercent,
      passed,
      promptRef: CERT_AGENDA_PROMPT_REF,
      itemResults,
    });
  }

  async generateSkillInterview(body: unknown): Promise<GenerateSkillInterviewResponse> {
    const request = GenerateSkillInterviewRequestSchema.parse(body);
    try {
      const result = await this.gateway.complete({
        promptRef: SKILL_INTERVIEW_EXAMINER_PROMPT_REF,
        modelRole: 'FAST_EXTRACTION',
        priority: 'P3_BATCH',
        variables: { skillCode: request.skillCode, proficiency: request.proficiency },
        correlation: {},
        maxOutputTokens: 400,
        temperature: 0,
      });
      const parsed = ExaminerOutputSchema.parse(result.output);
      return GenerateSkillInterviewResponseSchema.parse({
        skillCode: request.skillCode,
        proficiency: request.proficiency,
        questions: parsed.questions,
        promptRef: SKILL_INTERVIEW_EXAMINER_PROMPT_REF,
      });
    } catch (err) {
      this.failClosed(
        err,
        'skill_interview_unavailable',
        'Skill interview could not be completed.',
      );
    }
  }

  async gradeSkillInterview(body: unknown): Promise<GradeSkillInterviewResponse> {
    const request = GradeSkillInterviewRequestSchema.parse(body);
    const transcript = request.items
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((item) => {
        const answer = item.answer.slice(0, SKILL_INTERVIEW_ANSWER_MAX_CHARS);
        return `Q${String(item.index)}: ${item.question}\nA${String(item.index)}: ${answer}`;
      })
      .join('\n');

    try {
      const result = await this.gateway.complete({
        promptRef: SKILL_INTERVIEW_GRADER_PROMPT_REF,
        modelRole: 'PRIMARY_REASONING',
        priority: 'P2_ASYNC_EVAL',
        variables: {
          skillCode: request.skillCode,
          proficiency: request.proficiency,
          transcript,
        },
        correlation: {},
        maxOutputTokens: 256,
        temperature: 0,
      });
      const parsed = GraderOutputSchema.parse(result.output);
      return GradeSkillInterviewResponseSchema.parse({
        skillCode: request.skillCode,
        proficiency: request.proficiency,
        passed: parsed.passed,
        explanation: parsed.explanation,
        promptRef: SKILL_INTERVIEW_GRADER_PROMPT_REF,
        auditId: result.auditId ?? null,
      });
    } catch (err) {
      this.failClosed(
        err,
        'skill_interview_unavailable',
        'Skill interview could not be completed.',
      );
    }
  }

  async generateSkillForm(
    body: unknown,
    ownerUserId: string,
  ): Promise<GenerateSdeSkillFormResponse> {
    const request = GenerateSdeSkillFormRequestSchema.parse(body);
    const skill = SDE_V4_SKILL_BY_CODE.get(request.skillCode);
    if (!skill) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Unknown SDE v4 skill code.',
      });
    }
    const proficiency = request.proficiency;
    const spec = skill.levels[proficiency];
    const stage = request.stage ?? 'FULL';
    const blueprint =
      request.catalogSkillCode && getSkillDefinition(request.catalogSkillCode)
        ? buildSkillBlueprintForCategory(
            getSkillDefinition(request.catalogSkillCode)!.code,
            getSkillDefinition(request.catalogSkillCode)!.name,
            getSkillDefinition(request.catalogSkillCode)!.domain,
            getSkillDefinition(request.catalogSkillCode)!.categoryName,
            getSkillDefinition(request.catalogSkillCode)!.categoryId,
          )
        : null;
    const scaled = scaleFormCounts(
      spec.closed,
      spec.openFormats.length,
      stage === 'FULL' ? 'FULL' : stage,
      request.targetCompetencyIds?.length ?? 2,
    );
    const attemptId = request.attemptId ?? randomUUID();
    const priorStems = (request.priorStems ?? []).map((stem) => stem.slice(0, 200)).slice(0, 40);
    const intelligenceEnabled = Boolean(blueprint?.competencyModel.length);
    const closedPromptRef = intelligenceEnabled
      ? SDE_SKILL_FORM_CLOSED_PROMPT_REF_V3
      : SDE_SKILL_FORM_CLOSED_PROMPT_REF;
    const openPromptRef = intelligenceEnabled
      ? SDE_SKILL_FORM_OPEN_PROMPT_REF_V3
      : SDE_SKILL_FORM_OPEN_PROMPT_REF;
    const competencyLabels = intelligenceEnabled
      ? blueprint!.competencyModel.slice(0, 6).map((comp, idx) => ({
          slot: `C${String(idx + 1)}` as CompetencySlot,
          name: comp.capability,
        }))
      : [];

    try {
      const [closedResult, openResult] = await Promise.all([
        this.completeWithRetry({
          promptRef: closedPromptRef,
          modelRole: 'PRIMARY_REASONING',
          priority: 'P1_REALTIME',
          variables: {
            skillCode: skill.code,
            skillName: skill.name,
            proficiency,
            attemptId,
            mcqCount: scaled.closed.MCQ,
            traceCount: scaled.closed.TRACE,
            priorStems,
            skillFocus: request.skillFocus ?? '',
            ...(intelligenceEnabled ? { competencyLabels } : {}),
          },
          correlation: {},
          maxOutputTokens: 3_072,
          temperature: intelligenceEnabled ? 0.35 : 0.4,
        }),
        this.completeWithRetry({
          promptRef: openPromptRef,
          modelRole: 'PRIMARY_REASONING',
          priority: 'P1_REALTIME',
          variables: {
            skillCode: skill.code,
            skillName: skill.name,
            proficiency,
            taskFamily: skill.taskFamily,
            attemptId,
            formats: [...spec.openFormats],
            flavorNotes: request.skillFocus
              ? [`Focus exclusively on ${request.skillFocus}`, ...spec.flavorNotes].slice(0, 6)
              : [...spec.flavorNotes],
            priorStems,
            skillFocus: request.skillFocus ?? '',
            ...(intelligenceEnabled ? { competencyLabels } : {}),
          },
          correlation: {},
          maxOutputTokens: 4_096,
          temperature: intelligenceEnabled ? 0.35 : 0.4,
        }),
      ]);
      const closedParsed = (
        intelligenceEnabled ? SdeSkillFormClosedOutputSchemaV3 : SdeSkillFormClosedOutputSchema
      ).parse(closedResult.output);
      const closedOrdered = this.orderClosed(
        closedParsed.items,
        scaled.closed.MCQ,
        scaled.closed.TRACE,
      );
      const openFormats =
        stage === 'FULL' ? [...spec.openFormats] : [...spec.openFormats].slice(0, scaled.openCount);
      const openParsed = (
        intelligenceEnabled ? SdeSkillFormOpenOutputSchemaV3 : SdeSkillFormOpenOutputSchema
      ).parse(openResult.output);
      const openOrdered = this.orderOpen(openParsed.items, openFormats);

      this.logger.log(
        `skill_form ${skill.code} ${proficiency} closed in=${String(closedResult.promptTokens ?? 0)} out=${String(closedResult.completionTokens ?? 0)} ${String(closedResult.latencyMs ?? 0)}ms ~$${(closedResult.estimatedCostUsd ?? 0).toFixed(6)} | open in=${String(openResult.promptTokens ?? 0)} out=${String(openResult.completionTokens ?? 0)} ${String(openResult.latencyMs ?? 0)}ms ~$${(openResult.estimatedCostUsd ?? 0).toFixed(6)} | total ~$${((closedResult.estimatedCostUsd ?? 0) + (openResult.estimatedCostUsd ?? 0)).toFixed(6)}`,
      );

      const formats: SdeV4Format[] = [
        ...closedOrdered.map((item) => item.format),
        ...openOrdered.map((item) => item.format),
      ];
      if (stage === 'FULL') {
        assertSdeV4FormShape(skill, proficiency, formats);
      }

      const items: GenerateSdeSkillFormResponse['items'] = [];
      const scoringItems: z.infer<typeof ScoringKeySchema>[] = [];
      let index = 1;
      for (const item of closedOrdered) {
        const competencyIds = blueprint?.competencyModel.length
          ? this.resolveCompetencyIds(
              blueprint,
              this.competencySlotFromItem(item),
              item.format,
              index,
              request.targetCompetencyIds,
            )
          : undefined;
        items.push({
          index,
          format: item.format,
          prompt: item.prompt,
          options: item.options,
          ...(competencyIds ? { competencyIds } : {}),
        });
        scoringItems.push({
          index,
          format: item.format,
          answer: item.answer,
          marksMax: SDE_V4_MARKS[item.format],
          ...(competencyIds ? { competencyIds } : {}),
        });
        index += 1;
      }
      for (const item of openOrdered) {
        const competencyIds = blueprint?.competencyModel.length
          ? this.resolveCompetencyIds(
              blueprint,
              this.competencySlotFromItem(item),
              item.format,
              index,
              request.targetCompetencyIds,
            )
          : undefined;
        items.push({
          index,
          format: item.format,
          prompt: item.prompt,
          options: null,
          ...(item.title ? { title: item.title } : {}),
          ...(item.constraints ? { constraints: item.constraints } : {}),
          ...(item.examples && item.examples.length > 0 ? { examples: item.examples } : {}),
          ...(competencyIds ? { competencyIds } : {}),
        });
        scoringItems.push({
          index,
          format: item.format,
          prompt: item.prompt,
          rubric: item.rubric,
          modelAnswer: item.modelAnswer,
          marksMax: SDE_V4_MARKS[item.format],
          hiddenTests: item.hiddenTests,
          ...(competencyIds ? { competencyIds } : {}),
        });
        index += 1;
      }

      const scoringToken = sealSdeFormPayload({
        exp: Date.now() + (spec.timeMinutes + 30) * 60_000,
        userId: ownerUserId,
        skillCode: skill.code,
        proficiency,
        items: scoringItems,
        ...(blueprint
          ? {
              intelligenceEnabled: true,
              catalogSkillCode: blueprint.skillCode,
              targetProficiency: proficiency,
              stage,
            }
          : {}),
      });

      return GenerateSdeSkillFormResponseSchema.parse({
        skillCode: skill.code,
        proficiency,
        attemptId,
        timeMinutes:
          stage === 'DIAGNOSTIC'
            ? Math.max(10, Math.ceil(spec.timeMinutes * 0.45))
            : spec.timeMinutes,
        passMarkPercent: blueprint ? undefined : spec.passMarkPercent,
        stage,
        promptRefs: {
          closed: closedPromptRef,
          open: openPromptRef,
        },
        items,
        scoringToken,
      });
    } catch (err) {
      this.failClosed(err, 'skill_form_unavailable', 'Skill form could not be generated.');
    }
  }

  async gradeSkillForm(body: unknown, ownerUserId: string): Promise<GradeSdeSkillFormResponse> {
    const request = GradeSdeSkillFormRequestSchema.parse(body);
    let bundle: z.infer<typeof SealedSdeFormSchema>;
    try {
      bundle = SealedSdeFormSchema.parse(unsealSdeFormPayload(request.scoringToken));
    } catch {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Invalid scoring token.',
      });
    }
    if (bundle.exp < Date.now()) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Scoring token expired.',
      });
    }
    if (bundle.userId !== ownerUserId) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Scoring token does not match this student.',
      });
    }
    if (bundle.skillCode !== request.skillCode || bundle.proficiency !== request.proficiency) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Scoring token does not match this form.',
      });
    }

    const byIndex = new Map(request.responses.map((row) => [row.index, row]));
    const scored: { itemId: string; marksEarned: number; marksMax: number }[] = [];
    const itemResults: GradeSdeSkillFormResponse['itemResults'] = [];
    let mcqCorrect = 0;
    let mcqTotal = 0;
    let traceCorrect = 0;
    let traceTotal = 0;

    try {
      const openKeys = bundle.items.filter((key) => key.format !== 'MCQ' && key.format !== 'TRACE');
      for (const key of bundle.items) {
        if (key.format !== 'MCQ' && key.format !== 'TRACE') continue;
        const response = byIndex.get(key.index);
        const marksEarned = scoreClosedChoice(response?.selectedKey ?? null, key.answer ?? '');
        const correct = marksEarned === key.marksMax;
        if (key.format === 'MCQ') {
          mcqTotal += 1;
          if (correct) mcqCorrect += 1;
        } else {
          traceTotal += 1;
          if (correct) traceCorrect += 1;
        }
        scored.push({
          itemId: String(key.index),
          marksEarned,
          marksMax: key.marksMax,
        });
        itemResults.push({
          index: key.index,
          format: key.format,
          marksEarned,
          marksMax: key.marksMax,
          correct,
          selectedKey: response?.selectedKey,
          correctKey: key.answer,
          feedback: correct
            ? 'Correct.'
            : `Incorrect. The correct option was ${key.answer ?? '?'}.`,
          ...(key.competencyIds ? { competencyIds: key.competencyIds } : {}),
        });
      }

      if (openKeys.length > 0) {
        const completion = await this.gateway.complete({
          promptRef: SDE_SKILL_OPEN_BATCH_GRADER_PROMPT_REF,
          modelRole: 'PRIMARY_REASONING',
          priority: 'P2_ASYNC_EVAL',
          variables: {
            skillCode: request.skillCode,
            proficiency: request.proficiency,
            items: openKeys.map((key) => {
              const response = byIndex.get(key.index);
              if (key.format === 'MCQ' || key.format === 'TRACE') {
                throw new Error('Closed item leaked into open batch');
              }
              return {
                index: key.index,
                format: key.format,
                prompt: key.prompt ?? 'see rubric',
                rubric: key.rubric ?? 'Award marks for a correct, complete solution.',
                modelAnswer: key.modelAnswer ?? '',
                candidateResponse: response?.text ?? '',
                maxMarks: key.marksMax,
                hiddenTests: key.hiddenTests,
              };
            }),
          },
          correlation: {},
          maxOutputTokens: 3_072,
          temperature: 0,
        });
        const parsed = SdeOpenBatchGradeSchema.parse(completion.output);
        const gradeByIndex = new Map(parsed.grades.map((grade) => [grade.index, grade]));
        for (const key of openKeys) {
          const grade = gradeByIndex.get(key.index);
          if (!grade) throw new Error(`Missing batch grade for item ${String(key.index)}`);
          const earned = Math.min(Math.max(grade.marksAwarded, 0), key.marksMax);
          scored.push({
            itemId: String(key.index),
            marksEarned: earned,
            marksMax: key.marksMax,
          });
          itemResults.push({
            index: key.index,
            format: key.format,
            marksEarned: earned,
            marksMax: key.marksMax,
            testsPassed: grade.testsPassed,
            testsTotal: grade.testsTotal,
            missedTests: grade.missedTests,
            feedback: grade.justification,
            ...(key.competencyIds ? { competencyIds: key.competencyIds } : {}),
          });
        }
      }

      const result = Effect.runSync(
        Effect.either(computeSdeV4FormScore(scored, request.proficiency)),
      );
      if (Either.isLeft(result)) {
        throw new BadGatewayException({
          error: 'skill_form_unavailable',
          message: 'Skill form could not be scored.',
        });
      }

      let passed = result.right.passed;
      let competencySupportedProficiency: GradeSdeSkillFormResponse['competencySupportedProficiency'];
      let assessmentPassed: boolean | undefined;
      if (bundle.intelligenceEnabled && bundle.catalogSkillCode) {
        const definition = getSkillDefinition(bundle.catalogSkillCode);
        if (definition) {
          const blueprint = buildSkillBlueprintForCategory(
            definition.code,
            definition.name,
            definition.domain,
            definition.categoryName,
            definition.categoryId,
          );
          const intelligence = Effect.runSync(
            evaluateAssessmentIntelligence({
              competencyModel: blueprint.competencyModel,
              proficiencyRequirements: blueprint.proficiencyRequirements ?? [],
              items: itemResults.map((item) => ({
                competencyIds: item.competencyIds ?? [],
                marksEarned: item.marksEarned,
                marksMax: item.marksMax,
              })),
              targetProficiency: bundle.targetProficiency ?? request.proficiency,
            }),
          );
          passed = intelligence.assessmentPassed;
          assessmentPassed = intelligence.assessmentPassed;
          competencySupportedProficiency = intelligence.highestAssessmentSupportedProficiency;
        }
      }

      return GradeSdeSkillFormResponseSchema.parse({
        skillCode: request.skillCode,
        proficiency: request.proficiency,
        marksEarned: result.right.marksEarned,
        marksTotal: result.right.marksTotal,
        scorePercent: result.right.scorePercent,
        passed,
        assessmentPassed,
        competencySupportedProficiency,
        promptRef: SDE_SKILL_OPEN_BATCH_GRADER_PROMPT_REF,
        mcqCorrect,
        mcqTotal,
        traceCorrect,
        traceTotal,
        itemResults,
      });
    } catch (err) {
      this.failClosed(err, 'skill_form_unavailable', 'Skill form could not be graded.');
    }
  }

  async runSkillFormCode(body: unknown): Promise<RunSdeSkillFormCodeResponse> {
    const request = RunSdeSkillFormCodeRequestSchema.parse(body);
    try {
      const completion = await this.gateway.complete({
        promptRef: SDE_SKILL_CODE_RUNNER_PROMPT_REF,
        modelRole: 'PRIMARY_REASONING',
        priority: 'P1_REALTIME',
        variables: {
          prompt: request.prompt,
          constraints: request.constraints ?? '',
          source: request.source,
          tests: request.examples.map((example) => ({
            input: example.input,
            expected: example.output,
          })),
        },
        correlation: {},
        maxOutputTokens: 1_536,
        temperature: 0,
      });
      const parsed = SdeCodeRunnerOutputSchema.parse(completion.output);
      const testsPassed = parsed.tests.filter((test) => test.passed).length;
      return RunSdeSkillFormCodeResponseSchema.parse({
        compileError: parsed.compileError,
        testsPassed,
        testsTotal: parsed.tests.length,
        tests: parsed.tests,
        promptRef: SDE_SKILL_CODE_RUNNER_PROMPT_REF,
      });
    } catch (err) {
      this.failClosed(err, 'skill_form_run_unavailable', 'Code could not be run.');
    }
  }

  private competencySlotFromItem(item: { format: SdeV4Format }): CompetencySlot | undefined {
    const slot = (item as { competencySlot?: unknown }).competencySlot;
    if (typeof slot === 'string' && /^C[1-6]$/.test(slot)) {
      return slot as CompetencySlot;
    }
    return undefined;
  }

  private resolveCompetencyIds(
    blueprint: SkillBlueprint,
    slot: CompetencySlot | undefined,
    format: SdeV4Format,
    index: number,
    targetCompetencyIds?: readonly string[],
  ): string[] {
    if (slot) {
      const match = /^C(\d)$/i.exec(slot);
      if (match) {
        const comp = blueprint.competencyModel[Number(match[1]) - 1];
        if (comp) return [comp.competencyId];
      }
    }
    return assignCompetencyIds(format, index, blueprint.competencyModel, targetCompetencyIds);
  }

  private orderClosed<T extends { format: 'MCQ' | 'TRACE' }>(
    items: readonly T[],
    mcqCount: number,
    traceCount: number,
  ): T[] {
    const mcq = items.filter((item) => item.format === 'MCQ');
    const trace = items.filter((item) => item.format === 'TRACE');
    if (mcq.length !== mcqCount || trace.length !== traceCount) {
      throw new Error('Closed item counts did not match the v4 spec');
    }
    return [...mcq, ...trace];
  }

  private orderOpen<T extends { format: SdeV4Format }>(
    items: readonly T[],
    expected: readonly SdeV4Format[],
  ): T[] {
    const pool = [...items];
    const ordered: T[] = [];
    for (const format of expected) {
      const idx = pool.findIndex((item) => item.format === format);
      if (idx < 0) throw new Error(`Missing open item format ${format}`);
      const picked = pool.splice(idx, 1)[0];
      if (!picked) throw new Error(`Missing open item format ${format}`);
      ordered.push(picked);
    }
    if (pool.length > 0) throw new Error('Unexpected extra open items');
    return ordered;
  }

  private async completeWithRetry(
    request: Parameters<AiGatewayService['complete']>[0],
  ): Promise<Awaited<ReturnType<AiGatewayService['complete']>>> {
    try {
      return await this.gateway.complete(request);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Skill form LLM call failed; retrying once: ${detail}`);
      return await this.gateway.complete(request);
    }
  }

  private async consumeCertAgendaRegen(userId: string): Promise<void> {
    if (!this.redis) {
      throw new ServiceUnavailableException({
        error: 'service_unavailable',
        message: 'Certification paper regeneration cap could not be checked.',
        statusCode: 503,
      });
    }
    const key = `rl:cert_agenda_regen:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, REDIS_TTL_SECONDS.certAgendaRegen);
    }
    if (count > CERT_AGENDA_REGEN_MAX) {
      throw new HttpException(
        {
          error: 'rate_limit_exceeded',
          message: 'Certification paper regeneration cap reached. Try again after 24 hours.',
          statusCode: 429,
          retryAfterSeconds: REDIS_TTL_SECONDS.certAgendaRegen,
          limit: CERT_AGENDA_REGEN_MAX,
          window: '24 hours',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private failClosed(err: unknown, error: string, message: string): never {
    if (
      err instanceof BadGatewayException ||
      err instanceof UnprocessableEntityException ||
      err instanceof HttpException
    ) {
      throw err;
    }
    const detail = err instanceof Error ? err.message : String(err);
    this.logger.error(`Evaluation failed closed: ${detail}`);
    throw new BadGatewayException({ error, message });
  }
}
