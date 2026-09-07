import { describe, expect, it } from 'vitest';
import {
  GenerateSkillInterviewRequestSchema,
  GenerateSkillInterviewResponseSchema,
  GradeSdeSkillFormResponseSchema,
  GradeSkillInterviewRequestSchema,
  GradeSkillInterviewResponseSchema,
  SdeSkillFormPublicItemSchema,
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

describe('SDE skill-form public item and grade report', () => {
  it('allows LeetCode examples on a coding item without hidden tests', () => {
    const parsed = SdeSkillFormPublicItemSchema.parse({
      index: 12,
      format: 'CODING',
      prompt: 'Return indices of two numbers that add up to target.',
      options: null,
      title: 'Two Sum',
      constraints: '2 <= n <= 10^4',
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: '2+7=9' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
      ],
    });
    expect(parsed.examples).toHaveLength(2);
    expect(parsed).not.toHaveProperty('hiddenTests');
  });

  it('requires MCQ and coding breakdowns on a skill-form grade', () => {
    const parsed = GradeSdeSkillFormResponseSchema.parse({
      skillCode: 'SDE_DSA',
      proficiency: 'BEGINNER',
      marksEarned: 40,
      marksTotal: 50,
      scorePercent: 80,
      passed: true,
      promptRef: 'sde-skill-open-batch-grader@2',
      mcqCorrect: 6,
      mcqTotal: 8,
      traceCorrect: 2,
      traceTotal: 3,
      itemResults: [
        {
          index: 12,
          format: 'CODING',
          marksEarned: 7,
          marksMax: 10,
          testsPassed: 2,
          testsTotal: 3,
          missedTests: [
            {
              input: 'nums = [0,0], target = 0',
              expected: '[0,1]',
              reason: 'Did not handle duplicate zeros.',
            },
          ],
          feedback: 'Missed the duplicate-zero case.',
        },
      ],
    });
    expect(parsed.mcqCorrect).toBe(6);
    expect(parsed.itemResults[0]?.missedTests?.[0]?.reason).toContain('duplicate');
  });
});
