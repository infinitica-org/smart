import { z } from 'zod';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, NO_INFLATION, jsonOnly, untrusted } from '../shared.js';

/**
 * INF-05 mark-weighted grading — AI-graded rubric scoring for the Scoring
 * Schema document's Short Answer (0-3), Long Answer (0-6) and coding
 * design-quality (0-3, 30% of a coding item) question types, plus the
 * Professional debug/incident-scenario gate (dormant — see
 * `@smart/scoring-engine`'s `mark-weighted-scoring.ts` docstring for why).
 *
 * Unlike `bars-l3`/`defense-*`, SkillClaim verification has no calibrated
 * behavioural anchors or certification tier to protect (see the
 * NO_TIER_AUTHORITY note in shared.ts) — it grades against a fixed rubric to
 * a fixed pass threshold (`SkillPassThresholdsDto`, PRD v1 §7.3), so these
 * templates omit that instruction rather than reference an authority that
 * does not apply here.
 *
 * Owner: Ramansh. Rubric wording sourced from the Scoring Schema doc (INF-05).
 */

const RubricGradeSchema = z.object({
  marksAwarded: z.number().min(0),
  justification: z.string().min(10).max(2_000),
});
export type RubricGrade = z.infer<typeof RubricGradeSchema>;

const OUTPUT_SHAPE = (max: number) => `{
  "marksAwarded": number, // 0-${String(max)}, integer or half-mark
  "justification": string // 10-2000 chars, cite what earned or lost marks
}`;

const RubricVariables = z.object({
  prompt: z.string().min(5),
  modelAnswer: z.string().min(1),
  candidateResponse: z.string(),
});
export type RubricVariables = z.infer<typeof RubricVariables>;

const SHORT_ANSWER_RUBRIC = `
RUBRIC — Short Answer, max 3 marks
3: Correct, precise and complete. Key concept clearly stated with no gaps.
2: Mostly correct. Core idea present but one minor omission or imprecision.
1: Partially correct. Shows some understanding but misses a key element.
0: Wrong, off-topic, or blank.`.trim();

const LONG_ANSWER_RUBRIC = `
RUBRIC — Long Answer, max 6 marks
5-6: Full solution with correct reasoning, edge cases considered, and clear structure.
3-4: Core logic correct. Some gaps in design, justification, or completeness.
1-2: Partial understanding. Correct direction but major gaps in reasoning or solution.
0: Off-topic, incoherent, or blank.`.trim();

const CODING_DESIGN_RUBRIC = `
RUBRIC — Coding design quality, max 3 marks (30% of a 10-mark coding item;
the remaining 7 marks come from the automated test runner, scored elsewhere)
- Approach appropriateness: was the right algorithm/data structure chosen?
- Code structure: readable, well-decomposed, not a tangled solution.
- A working brute-force solution that hard-codes outputs cannot max out this rubric.`.trim();

function buildTemplate(
  id: string,
  purpose: string,
  rubric: string,
  maxMarks: number,
): PromptTemplate<RubricVariables> {
  return {
    id,
    version: 1,
    purpose,
    modelRole: 'PRIMARY_REASONING',
    // Zero temperature: identical responses must receive the same marks.
    temperature: 0,
    maxOutputTokens: 1_024,
    outputSchema: RubricGradeSchema,
    variablesSchema: RubricVariables,
    render: (variables) => ({
      system: [
        `You are grading a candidate's answer for the SMART skill-claim verification`,
        `assessment (INF-05). This is a fixed-rubric pass/fail gate, not a`,
        `certification tier decision — award marks strictly against the rubric below.`,
        '',
        NO_INFLATION,
        '',
        rubric,
        '',
        INJECTION_GUARD,
        '',
        jsonOnly(OUTPUT_SHAPE(maxMarks)),
      ].join('\n'),
      user: [
        `QUESTION\n${variables.prompt}`,
        '',
        `MODEL ANSWER (reference only, do not require verbatim match)\n${variables.modelAnswer}`,
        '',
        untrusted(variables.candidateResponse),
        '',
        'Grade this response now.',
      ].join('\n'),
    }),
  };
}

export const proficiencyShortAnswerTemplate = buildTemplate(
  'proficiency-short-answer',
  'Grade an INF-05 Short Answer item, max 3 marks.',
  SHORT_ANSWER_RUBRIC,
  3,
);

export const proficiencyLongAnswerTemplate = buildTemplate(
  'proficiency-long-answer',
  'Grade an INF-05 Long Answer item, max 6 marks.',
  LONG_ANSWER_RUBRIC,
  6,
);

export const proficiencyCodingDesignRubricTemplate = buildTemplate(
  'proficiency-coding-design',
  'Grade the 30% AI design-rubric share of an INF-05 coding item, max 3 marks.',
  CODING_DESIGN_RUBRIC,
  3,
);

/* ------------------------- Professional debug gate ------------------------ */
/* Dormant — SkillProficiency has no PROFESSIONAL value yet (enums.ts). Ready */
/* for whenever that product decision lands; not registered as reachable      */
/* from any SkillClaim flow today.                                           */

const DebugScenarioGradeSchema = z.object({
  rootCause: z.number().min(0).max(12),
  fix: z.number().min(0).max(9),
  tradeoff: z.number().min(0).max(6),
  monitoring: z.number().min(0).max(3),
  justification: z.string().min(10).max(2_000),
});
export type DebugScenarioGrade = z.infer<typeof DebugScenarioGradeSchema>;

const DebugScenarioVariables = z.object({
  incidentBrief: z.string().min(10),
  candidateDiagnosis: z.string(),
});
export type DebugScenarioVariables = z.infer<typeof DebugScenarioVariables>;

const DEBUG_SCENARIO_SHAPE = `{
  "rootCause": number,    // 0-12
  "fix": number,          // 0-9
  "tradeoff": number,     // 0-6
  "monitoring": number,   // 0-3
  "justification": string // 10-2000 chars
}`;

const DEBUG_SCENARIO_RUBRIC = `
RUBRIC — Professional debug/incident scenario, 30 marks across four dimensions
- Root Cause (12): correct identification of the actual failure cause, not a red herring or surface symptom.
- Fix (9): proposed fix is practical, correct, and applicable to the given context.
- Trade-off (6): names what the fix costs, when it breaks, or what it sacrifices.
- Monitoring (3): suggests what to observe or alert on to confirm the fix held in production.
Score each dimension independently against its own maximum.`.trim();

export const proficiencyDebugScenarioTemplate: PromptTemplate<DebugScenarioVariables> = {
  id: 'proficiency-debug-scenario',
  version: 1,
  purpose: 'Grade the Professional debug/incident scenario gate across its four dimensions.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 1_536,
  outputSchema: DebugScenarioGradeSchema,
  variablesSchema: DebugScenarioVariables,
  render: (variables) => ({
    system: [
      `You are grading a Professional-level candidate's structured incident diagnosis`,
      `for the SMART skill-claim verification assessment (INF-05). The candidate had 25`,
      `minutes, no hints, no AI assistance and no adaptive scaffolding.`,
      '',
      NO_INFLATION,
      '',
      DEBUG_SCENARIO_RUBRIC,
      '',
      INJECTION_GUARD,
      '',
      jsonOnly(DEBUG_SCENARIO_SHAPE),
    ].join('\n'),
    user: [
      `INCIDENT BRIEF (stack trace / partial logs / degraded output given to the candidate)\n${variables.incidentBrief}`,
      '',
      untrusted(variables.candidateDiagnosis),
      '',
      'Grade this diagnosis now.',
    ].join('\n'),
  }),
};
