import { describe, expect, it } from 'vitest';
import {
  GenerateSkillInterviewRequestSchema,
  GenerateSkillInterviewResponseSchema,
  GradeSkillInterviewRequestSchema,
  GradeSkillInterviewResponseSchema,
  SKILL_INTERVIEW_ANSWER_MAX_CHARS,
  SKILL_INTERVIEW_EXPLANATION_MAX_CHARS,
  SKILL_INTERVIEW_QUESTION_COUNT,
} from './evaluation.dto.js';

const threeQuestions = [
  { index: 1, text: 'How would you design a cache for this API?' },
  { index: 2, text: 'What fails first when traffic spikes 10x?' },
  { index: 3, text: 'Walk through one production incident you owned.' },
];

const threeItems = threeQuestions.map((question) => ({
  ...question,
  question: question.text,
  answer: 'I would use Redis with a TTL and a stampede lock.',
}));

describe('GenerateSkillInterviewRequestSchema', () => {
  it('accepts Advanced or Professional only', () => {
    expect(
      GenerateSkillInterviewRequestSchema.parse({
        skillCode: 'SYS_DESIGN',
        proficiency: 'ADVANCED',
      }).proficiency,
    ).toBe('ADVANCED');
    expect(
      GenerateSkillInterviewRequestSchema.safeParse({
        skillCode: 'SYS_DESIGN',
        proficiency: 'BEGINNER',
      }).success,
    ).toBe(false);
  });
});

describe('GenerateSkillInterviewResponseSchema', () => {
  it('requires exactly three questions and a promptRef', () => {
    const parsed = GenerateSkillInterviewResponseSchema.parse({
      skillCode: 'SYS_DESIGN',
      proficiency: 'PROFESSIONAL',
      questions: threeQuestions,
      promptRef: 'skill-interview-examiner@1',
    });
    expect(parsed.questions).toHaveLength(SKILL_INTERVIEW_QUESTION_COUNT);
  });

  it('rejects two questions so the runner cannot skip a probe', () => {
    expect(
      GenerateSkillInterviewResponseSchema.safeParse({
        skillCode: 'SYS_DESIGN',
        proficiency: 'ADVANCED',
        questions: threeQuestions.slice(0, 2),
        promptRef: 'skill-interview-examiner@1',
      }).success,
    ).toBe(false);
  });
});

describe('GradeSkillInterviewRequestSchema', () => {
  it('caps answers so we do not ship a novel to the grader', () => {
    expect(
      GradeSkillInterviewRequestSchema.safeParse({
        skillCode: 'SYS_DESIGN',
        proficiency: 'ADVANCED',
        items: threeItems.map((item) => ({
          ...item,
          answer: 'x'.repeat(SKILL_INTERVIEW_ANSWER_MAX_CHARS + 1),
        })),
      }).success,
    ).toBe(false);
  });
});

describe('GradeSkillInterviewResponseSchema', () => {
  it('requires a one-line why alongside pass/fail', () => {
    const parsed = GradeSkillInterviewResponseSchema.parse({
      skillCode: 'SYS_DESIGN',
      proficiency: 'ADVANCED',
      passed: false,
      explanation: 'Named Redis but could not explain stampede or TTL trade-offs.',
      promptRef: 'skill-interview-grader@1',
      auditId: null,
    });
    expect(parsed.passed).toBe(false);
    expect(parsed.explanation.length).toBeLessThanOrEqual(SKILL_INTERVIEW_EXPLANATION_MAX_CHARS);
  });

  it('rejects a score-only payload with an empty explanation', () => {
    expect(
      GradeSkillInterviewResponseSchema.safeParse({
        skillCode: 'SYS_DESIGN',
        proficiency: 'ADVANCED',
        passed: true,
        explanation: '',
        promptRef: 'skill-interview-grader@1',
        auditId: null,
      }).success,
    ).toBe(false);
  });
});
