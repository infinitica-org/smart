import { z } from 'zod';
import {
  SKILL_INTERVIEW_ANSWER_MAX_CHARS,
  SKILL_INTERVIEW_EXPLANATION_MAX_CHARS,
  SKILL_INTERVIEW_QUESTION_COUNT,
  SkillInterviewProficiencySchema,
  SkillInterviewQuestionSchema,
} from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';

/**
 * SE-T02 — short skill / confidence interview (VEGA). Not L4 defense, not MCQ.
 * Three questions in one FAST call; one PRIMARY grade. Owner: Ramansh.
 */

export const SKILL_INTERVIEW_EXAMINER_PROMPT_REF = 'skill-interview-examiner@1' as const;
export const SKILL_INTERVIEW_GRADER_PROMPT_REF = 'skill-interview-grader@1' as const;

export const SkillInterviewExaminerVariables = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SkillInterviewProficiencySchema,
});
export type SkillInterviewExaminerVariables = z.infer<typeof SkillInterviewExaminerVariables>;

export const SkillInterviewExaminerOutputSchema = z.object({
  questions: z.array(SkillInterviewQuestionSchema).length(SKILL_INTERVIEW_QUESTION_COUNT),
});

const EXAMINER_SHAPE = `{
  "questions": [
    { "index": 1, "text": string },
    { "index": 2, "text": string },
    { "index": 3, "text": string }
  ]
}`;

export const skillInterviewExaminerTemplate: PromptTemplate<SkillInterviewExaminerVariables> = {
  id: 'skill-interview-examiner',
  version: 1,
  purpose: 'Generate three skill-relevant interview questions for Advanced/Professional.',
  modelRole: 'FAST_EXTRACTION',
  temperature: 0,
  maxOutputTokens: 400,
  outputSchema: SkillInterviewExaminerOutputSchema,
  variablesSchema: SkillInterviewExaminerVariables,
  render: (variables) => ({
    system: [
      'You write three short interview questions for a SMART skill check.',
      'This is not a multiple-choice quiz and not a project defense.',
      '',
      'RULES',
      `- Return exactly ${String(SKILL_INTERVIEW_QUESTION_COUNT)} questions, indexes 1, 2, and 3.`,
      '- Each question 10-500 characters. One sentence. No preamble.',
      `- Match ${variables.proficiency} depth for skill ${variables.skillCode}.`,
      '- Ask about decisions, failure modes, or trade-offs. No trivia, no yes/no.',
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(EXAMINER_SHAPE),
    ].join('\n'),
    user: `Write three questions for ${variables.skillCode} at ${variables.proficiency}.`,
  }),
};

export const SkillInterviewGraderVariables = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SkillInterviewProficiencySchema,
  transcript: z
    .string()
    .min(1)
    .max(SKILL_INTERVIEW_ANSWER_MAX_CHARS * 4),
});
export type SkillInterviewGraderVariables = z.infer<typeof SkillInterviewGraderVariables>;

export const SkillInterviewGraderOutputSchema = z.object({
  passed: z.boolean(),
  explanation: z.string().min(10).max(SKILL_INTERVIEW_EXPLANATION_MAX_CHARS),
});

const GRADER_SHAPE = `{
  "passed": boolean,
  "explanation": string
}`;

export const skillInterviewGraderTemplate: PromptTemplate<SkillInterviewGraderVariables> = {
  id: 'skill-interview-grader',
  version: 1,
  purpose: 'Pass/fail a skill interview with a one-line why the student can see.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 256,
  outputSchema: SkillInterviewGraderOutputSchema,
  variablesSchema: SkillInterviewGraderVariables,
  render: (variables) => ({
    system: [
      `Score whether this ${variables.proficiency} answer set shows real ${variables.skillCode} skill.`,
      'Do not award a certification tier. Do not invent a numeric score in the explanation.',
      '',
      'RULES',
      `- explanation is one sentence, 10-${String(SKILL_INTERVIEW_EXPLANATION_MAX_CHARS)} characters.`,
      '- Name what was present or missing. Fluency is not evidence.',
      '- Vague or empty answers fail.',
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(GRADER_SHAPE),
    ].join('\n'),
    user: ['TRANSCRIPT', untrusted(variables.transcript), '', 'Score now.'].join('\n'),
  }),
};
