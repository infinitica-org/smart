import { z } from 'zod';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';
import {
  SDE_V4_FORMATS,
  SDE_V4_PROFICIENCIES,
  SDE_V4_TASK_FAMILIES,
} from '../sde-skill-matrix-v4.js';

export const SDE_SKILL_FORM_CLOSED_PROMPT_REF = 'sde-skill-form-closed@1' as const;
export const SDE_SKILL_FORM_OPEN_PROMPT_REF = 'sde-skill-form-open@1' as const;
export const SDE_SKILL_OPEN_GRADER_PROMPT_REF = 'sde-skill-open-grader@1' as const;
export const SDE_SKILL_OPEN_BATCH_GRADER_PROMPT_REF = 'sde-skill-open-batch-grader@1' as const;

const FormatSchema = z.enum(SDE_V4_FORMATS);

export const SdeSkillFormClosedVariables = z.object({
  skillCode: z.string().min(2).max(64),
  skillName: z.string().min(2).max(80),
  proficiency: z.enum(SDE_V4_PROFICIENCIES),
  attemptId: z.string().min(1).max(80),
  mcqCount: z.number().int().min(1).max(8),
  traceCount: z.number().int().min(1).max(3),
  priorStems: z.array(z.string()).max(40).default([]),
  skillFocus: z.string().max(64).optional().default(''),
});
export type SdeSkillFormClosedVariables = z.infer<typeof SdeSkillFormClosedVariables>;

export const SdeClosedItemSchema = z.object({
  format: z.enum(['MCQ', 'TRACE']),
  prompt: z.string().min(12).max(2_000),
  options: z
    .object({
      A: z.string().min(1).max(400),
      B: z.string().min(1).max(400),
      C: z.string().min(1).max(400),
      D: z.string().min(1).max(400),
    })
    .strict(),
  answer: z.enum(['A', 'B', 'C', 'D']),
});

export const SdeSkillFormClosedOutputSchema = z.object({
  items: z.array(SdeClosedItemSchema).min(2).max(11),
});

export const sdeSkillFormClosedTemplate: PromptTemplate<SdeSkillFormClosedVariables> = {
  id: 'sde-skill-form-closed',
  version: 1,
  purpose: 'Generate v4 MCQ + Trace items for one SDE skill form.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0.4,
  maxOutputTokens: 6_144,
  outputSchema: SdeSkillFormClosedOutputSchema,
  variablesSchema: SdeSkillFormClosedVariables,
  render: (variables) => ({
    system: [
      'You write closed-form items for SMART SDE skill verification (v4, assessment-only).',
      'MCQ tests a real decision. TRACE shows a short snippet and asks the next state or output.',
      'Exactly one correct option. Distractors are plausible mistakes, not jokes.',
      'If a FOCUS is set, every stem must be about that language, framework, or topic only.',
      `Return exactly ${String(variables.mcqCount)} MCQ items then ${String(variables.traceCount)} TRACE items, in that order.`,
      'Vary stems using the attemptId so two attempts are not identical.',
      INJECTION_GUARD,
      jsonOnly(
        `{"items":[{"format":"MCQ"|"TRACE","prompt":string,"options":{"A":string,"B":string,"C":string,"D":string},"answer":"A"|"B"|"C"|"D"}]}`,
      ),
    ].join('\n'),
    user: [
      `SKILL ${variables.skillCode} ${variables.skillName}`,
      `PROFICIENCY ${variables.proficiency}`,
      variables.skillFocus ? `FOCUS ${variables.skillFocus}` : '',
      `ATTEMPT ${variables.attemptId}`,
      variables.priorStems.length > 0
        ? `DO NOT REPEAT\n${untrusted(variables.priorStems.join('\n'))}`
        : '',
      'Write the closed items now.',
    ]
      .filter((section) => section !== '')
      .join('\n'),
  }),
};

export const SdeSkillFormOpenVariables = z.object({
  skillCode: z.string().min(2).max(64),
  skillName: z.string().min(2).max(80),
  proficiency: z.enum(SDE_V4_PROFICIENCIES),
  taskFamily: z.enum(SDE_V4_TASK_FAMILIES),
  attemptId: z.string().min(1).max(80),
  formats: z.array(FormatSchema).min(1).max(3),
  flavorNotes: z.array(z.string()).max(6).default([]),
  priorStems: z.array(z.string()).max(40).default([]),
  skillFocus: z.string().max(64).optional().default(''),
});
export type SdeSkillFormOpenVariables = z.infer<typeof SdeSkillFormOpenVariables>;

export const SdeOpenItemSchema = z.object({
  format: z.enum(['CODING', 'SCENARIO', 'DEBUG', 'DESIGN_REASONING']),
  prompt: z.string().min(20).max(4_000),
  rubric: z.string().min(20).max(2_000),
  modelAnswer: z.string().min(10).max(4_000),
});

export const SdeSkillFormOpenOutputSchema = z.object({
  items: z.array(SdeOpenItemSchema).min(1).max(3),
});

export const sdeSkillFormOpenTemplate: PromptTemplate<SdeSkillFormOpenVariables> = {
  id: 'sde-skill-form-open',
  version: 1,
  purpose: 'Generate v4 coding/scenario/debug/design items for one SDE skill form.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0.4,
  maxOutputTokens: 6_144,
  outputSchema: SdeSkillFormOpenOutputSchema,
  variablesSchema: SdeSkillFormOpenVariables,
  render: (variables) => ({
    system: [
      'You write open items for SMART SDE skill verification (v4, assessment-only). No interview.',
      `Return exactly ${String(variables.formats.length)} items with formats in this order: ${variables.formats.join(', ')}.`,
      'CODING: a concrete task with constraints. SCENARIO: applied ops/network/git/deploy/design situation.',
      'DEBUG: logs or broken snippet; ask for root cause and fix. DESIGN_REASONING: trade-offs, not trivia.',
      'Difficulty matches proficiency (easy / medium / hard / professional).',
      'If a FOCUS is set, every item must be about that language, framework, or topic only.',
      'Vary using attemptId. Include a model answer and a short rubric.',
      INJECTION_GUARD,
      jsonOnly(
        `{"items":[{"format":string,"prompt":string,"rubric":string,"modelAnswer":string}]}`,
      ),
    ].join('\n'),
    user: [
      `SKILL ${variables.skillCode} ${variables.skillName}`,
      `FAMILY ${variables.taskFamily}`,
      `PROFICIENCY ${variables.proficiency}`,
      variables.skillFocus ? `FOCUS ${variables.skillFocus}` : '',
      `ATTEMPT ${variables.attemptId}`,
      variables.flavorNotes.length > 0 ? `FLAVOR\n${variables.flavorNotes.join('\n')}` : '',
      variables.priorStems.length > 0
        ? `DO NOT REPEAT\n${untrusted(variables.priorStems.join('\n'))}`
        : '',
      'Write the open items now.',
    ]
      .filter((section) => section !== '')
      .join('\n'),
  }),
};

export const SdeOpenGraderVariables = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: z.enum(SDE_V4_PROFICIENCIES),
  format: z.enum(['CODING', 'SCENARIO', 'DEBUG', 'DESIGN_REASONING']),
  prompt: z.string().min(10),
  rubric: z.string().min(10),
  modelAnswer: z.string().min(1),
  candidateResponse: z.string(),
  maxMarks: z.number().int().min(1).max(10),
});
export type SdeOpenGraderVariables = z.infer<typeof SdeOpenGraderVariables>;

export const SdeOpenGradeSchema = z.object({
  marksAwarded: z.number().min(0).max(10),
  justification: z.string().min(10).max(2_000),
});

export const SdeOpenBatchGraderVariables = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: z.enum(SDE_V4_PROFICIENCIES),
  items: z
    .array(
      z.object({
        index: z.number().int().min(1),
        format: z.enum(['CODING', 'SCENARIO', 'DEBUG', 'DESIGN_REASONING']),
        prompt: z.string().min(10),
        rubric: z.string().min(10),
        modelAnswer: z.string().min(1),
        candidateResponse: z.string(),
        maxMarks: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(3),
});
export type SdeOpenBatchGraderVariables = z.infer<typeof SdeOpenBatchGraderVariables>;

export const SdeOpenBatchGradeSchema = z.object({
  grades: z
    .array(
      z.object({
        index: z.number().int().min(1),
        marksAwarded: z.number().min(0).max(10),
        justification: z.string().min(10).max(2_000),
      }),
    )
    .min(1)
    .max(3),
});

export const sdeSkillOpenBatchGraderTemplate: PromptTemplate<SdeOpenBatchGraderVariables> = {
  id: 'sde-skill-open-batch-grader',
  version: 1,
  purpose: 'Rubric-grade all open SDE v4 items in one call (0–10 each).',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 2_048,
  outputSchema: SdeOpenBatchGradeSchema,
  variablesSchema: SdeOpenBatchGraderVariables,
  render: (variables) => ({
    system: [
      'Grade every open item in this SMART SDE v4 form. Assessment-only; no certification tier.',
      'Return one grades[] entry per item index. Award 0-maxMarks. Integers or half-marks. Do not inflate.',
      INJECTION_GUARD,
      jsonOnly(`{"grades":[{"index":number,"marksAwarded":number,"justification":string}]}`),
    ].join('\n'),
    user: [
      `SKILL ${variables.skillCode} ${variables.proficiency}`,
      ...variables.items.flatMap((item) => [
        `ITEM ${String(item.index)} ${item.format} max=${String(item.maxMarks)}`,
        `QUESTION\n${item.prompt}`,
        `RUBRIC\n${item.rubric}`,
        `MODEL ANSWER\n${item.modelAnswer}`,
        untrusted(item.candidateResponse),
      ]),
      'Grade all items now.',
    ].join('\n'),
  }),
};

export const sdeSkillOpenGraderTemplate: PromptTemplate<SdeOpenGraderVariables> = {
  id: 'sde-skill-open-grader',
  version: 1,
  purpose: 'Rubric-grade one v4 open SDE skill-form item (0–10).',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 1_024,
  outputSchema: SdeOpenGradeSchema,
  variablesSchema: SdeOpenGraderVariables,
  render: (variables) => ({
    system: [
      'Grade one SMART SDE v4 skill-verification answer. Assessment-only; no certification tier.',
      `Award 0-${String(variables.maxMarks)} marks against the rubric. Integers or half-marks.`,
      'Do not inflate. Empty or off-topic is 0.',
      INJECTION_GUARD,
      jsonOnly(`{"marksAwarded":number,"justification":string}`),
    ].join('\n'),
    user: [
      `SKILL ${variables.skillCode} ${variables.proficiency} ${variables.format}`,
      `QUESTION\n${variables.prompt}`,
      `RUBRIC\n${variables.rubric}`,
      `MODEL ANSWER\n${variables.modelAnswer}`,
      untrusted(variables.candidateResponse),
      'Grade now.',
    ].join('\n'),
  }),
};
