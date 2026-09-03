import type { PromptRef, PromptTemplate, RenderedPrompt } from './types.js';
import { promptRef } from './types.js';
import { barsL3Template } from './templates/bars-grading.js';
import { defenseExaminerTemplate, defenseGraderTemplate } from './templates/l4-defense.js';
import { capstoneReviewTemplate } from './templates/capstone-review.js';
import { jdParseTemplate } from './templates/jd-parsing.js';
import { resumeParseTemplate } from './templates/resume-parsing.js';
import { itemDraftTemplate } from './templates/item-authoring.js';
import { gapNarrativeTemplate } from './templates/gap-report.js';
import {
  skillInterviewExaminerTemplate,
  skillInterviewGraderTemplate,
} from './templates/skill-interview.js';
import {
  proficiencyCodingDesignRubricTemplate,
  proficiencyDebugScenarioTemplate,
  proficiencyLongAnswerTemplate,
  proficiencyShortAnswerTemplate,
} from './templates/proficiency-grading.js';
import { projectVerifyTemplate } from './templates/project-verify.js';
import { workExperienceProofParseTemplate } from './templates/work-experience-proof-parsing.js';

/**
 * The prompt registry.
 *
 * `ai-gateway` resolves a `promptRef` through here and nowhere else. That
 * indirection is what lets every audit row store `bars-l3@1` and lets someone
 * reproduce a two-year-old grade exactly.
 *
 * Adding a prompt: append it here. Changing a prompt: bump `version` and keep
 * the old template exported if any unmigrated grade still references it. Never
 * edit a published prompt's text in place.
 *
 * Owner: Ramansh.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- the registry is
   deliberately heterogeneous: each template has its own variables type, and
   render-time validation via variablesSchema is what enforces correctness.
   Callers get full type safety through renderPrompt<T>. */
const TEMPLATES: readonly PromptTemplate<any>[] = [
  barsL3Template,
  defenseExaminerTemplate,
  defenseGraderTemplate,
  capstoneReviewTemplate,
  jdParseTemplate,
  resumeParseTemplate,
  itemDraftTemplate,
  gapNarrativeTemplate,
  skillInterviewExaminerTemplate,
  skillInterviewGraderTemplate,
  proficiencyShortAnswerTemplate,
  proficiencyLongAnswerTemplate,
  proficiencyCodingDesignRubricTemplate,
  proficiencyDebugScenarioTemplate,
  projectVerifyTemplate,
  workExperienceProofParseTemplate,
];
/* eslint-enable @typescript-eslint/no-explicit-any */

export const PROMPT_REGISTRY: ReadonlyMap<PromptRef, PromptTemplate<unknown>> = new Map(
  TEMPLATES.map((template) => [promptRef(template), template as PromptTemplate<unknown>]),
);

export function listPrompts(): readonly {
  readonly promptRef: PromptRef;
  readonly purpose: string;
  readonly modelRole: string;
  readonly temperature: number;
}[] {
  return TEMPLATES.map((template) => ({
    promptRef: promptRef(template),
    purpose: template.purpose,
    modelRole: template.modelRole,
    temperature: template.temperature,
  }));
}

export class UnknownPromptError extends Error {
  constructor(ref: string) {
    super(
      `No prompt registered as "${ref}". Known refs: ${[...PROMPT_REGISTRY.keys()].join(', ')}. ` +
        `A missing ref usually means a prompt version was bumped without migrating its callers.`,
    );
    this.name = 'UnknownPromptError';
  }
}

export class InvalidPromptVariablesError extends Error {
  constructor(
    ref: string,
    readonly issues: unknown,
  ) {
    super(
      `Variables supplied to "${ref}" failed validation. Refusing to spend tokens on a ` +
        `malformed prompt. Issues: ${JSON.stringify(issues)}`,
    );
    this.name = 'InvalidPromptVariablesError';
  }
}

/**
 * Render a prompt by template.
 *
 * The type parameter is inferred from the template, so a caller cannot pass
 * L4 variables to the L3 grader. The runtime schema check is the second line of
 * defence, for variables assembled from database rows.
 */
export function renderPrompt<TVariables>(
  template: PromptTemplate<TVariables>,
  variables: TVariables,
): RenderedPrompt {
  const parsed = template.variablesSchema.safeParse(variables);
  if (!parsed.success) {
    throw new InvalidPromptVariablesError(promptRef(template), parsed.error.issues);
  }

  const { system, user } = template.render(parsed.data);

  return {
    promptRef: promptRef(template),
    system,
    user,
    modelRole: template.modelRole,
    temperature: template.temperature,
    maxOutputTokens: template.maxOutputTokens,
    outputSchema: template.outputSchema,
  };
}

/** Render by `promptRef` string — the path `ai-gateway` uses. */
export function renderPromptRef(ref: string, variables: unknown): RenderedPrompt {
  const template = PROMPT_REGISTRY.get(ref as PromptRef);
  if (!template) throw new UnknownPromptError(ref);
  return renderPrompt(template, variables);
}
