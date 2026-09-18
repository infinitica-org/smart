import { z } from 'zod';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';

export const CAPABILITY_INFERENCE_PROMPT_REF = 'capability-inference@1' as const;

export const CapabilityInferenceVariables = z.object({
  projectTitle: z.string().min(2),
  projectSummary: z.string().min(20).max(8_000),
  stack: z.string().min(1).max(1_000),
  qlixDigest: z.string().max(8_000),
  smartAssessmentJson: z.string().max(16_000),
  skillsDigest: z.string().max(8_000),
});

const CAPABILITY_EVIDENCE_REF_MAX = 200;

/** Truncate long LLM evidence snippets so gateway schema validation succeeds. */
export function coerceCapabilityInferenceOutput(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const capabilities = (raw as { capabilities?: unknown }).capabilities;
  if (!Array.isArray(capabilities)) return raw;
  return {
    ...(raw as Record<string, unknown>),
    capabilities: capabilities.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
      const refs = (entry as { evidenceRefs?: unknown }).evidenceRefs;
      if (!Array.isArray(refs)) return entry;
      return {
        ...(entry as Record<string, unknown>),
        evidenceRefs: refs
          .filter((ref): ref is string => typeof ref === 'string')
          .map((ref) => ref.trim().slice(0, CAPABILITY_EVIDENCE_REF_MAX)),
      };
    }),
  };
}

const CapabilityInferenceOutputCoreSchema = z.object({
  capabilities: z
    .array(
      z.object({
        capabilityLabel: z.string().min(10).max(500),
        category: z.string().min(2).max(200),
        confidence: z.number().min(0).max(1),
        proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']),
        evidenceRefs: z.array(z.string().max(CAPABILITY_EVIDENCE_REF_MAX)).max(10),
      }),
    )
    .max(20),
});

export const CapabilityInferenceOutputSchema = z.preprocess(
  coerceCapabilityInferenceOutput,
  CapabilityInferenceOutputCoreSchema,
);

const OUTPUT_SHAPE = `{
  "capabilities": [{
    "capabilityLabel": string,
    "category": string,
    "confidence": number,
    "proficiency": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL",
    "evidenceRefs": string[]
  }]
}`;

export const capabilityInferenceTemplate: PromptTemplate<
  z.infer<typeof CapabilityInferenceVariables>
> = {
  id: 'capability-inference',
  version: 1,
  purpose: 'Infer provisional student capabilities from verified QLIX project evidence.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 2_048,
  outputSchema: CapabilityInferenceOutputSchema,
  variablesSchema: CapabilityInferenceVariables,
  render: (variables) => ({
    system: [
      'Infer concrete, action-oriented capability statements from QLIX project verification evidence.',
      'Each capabilityLabel must be verb-led and specific to this project — no generic resume fluff.',
      'Confidence must reflect evidence strength only; lower confidence when QLIX observations are UNCERTAIN.',
      'Each evidenceRefs entry must be a short pointer (file path, symbol, or ≤200 character quote) — never paste long paragraphs.',
      'These are provisional coaching signals unless assessment-verified elsewhere — do not overstate.',
      INJECTION_GUARD,
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `PROJECT: ${variables.projectTitle}`,
      `STACK: ${variables.stack}`,
      `SUMMARY: ${variables.projectSummary}`,
      `QLIX_DIGEST: ${untrusted(variables.qlixDigest)}`,
      `SMART_ASSESSMENT: ${untrusted(variables.smartAssessmentJson)}`,
      `SKILLS: ${untrusted(variables.skillsDigest)}`,
    ].join('\n'),
  }),
};
