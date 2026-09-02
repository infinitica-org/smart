import { BadGatewayException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  GenerateSkillInterviewRequestSchema,
  GenerateSkillInterviewResponseSchema,
  GradeSkillInterviewRequestSchema,
  GradeSkillInterviewResponseSchema,
  SKILL_INTERVIEW_ANSWER_MAX_CHARS,
  SKILL_INTERVIEW_EXPLANATION_MAX_CHARS,
  SKILL_INTERVIEW_QUESTION_COUNT,
  SkillInterviewQuestionSchema,
  type GenerateSkillInterviewResponse,
  type GradeSkillInterviewResponse,
} from '@smart/contracts';
import { z } from 'zod';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';

export const SKILL_INTERVIEW_EXAMINER_PROMPT_REF = 'skill-interview-examiner@1' as const;
export const SKILL_INTERVIEW_GRADER_PROMPT_REF = 'skill-interview-grader@1' as const;

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
  readonly purpose = 'BARS grading, L4 defense, and SE-T02 skill interview. Produces raw scores.';
  private readonly logger = new Logger(EvaluationService.name);

  constructor(@Inject(AiGatewayService) private readonly gateway: AiGatewayService) {}

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
      this.failClosed(err);
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
      this.failClosed(err);
    }
  }

  private failClosed(err: unknown): never {
    if (err instanceof BadGatewayException) throw err;
    const message = err instanceof Error ? err.message : String(err);
    this.logger.warn(`Skill interview failed closed: ${message}`);
    throw new BadGatewayException({
      error: 'skill_interview_unavailable',
      message: 'Skill interview could not be completed.',
    });
  }
}
