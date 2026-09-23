import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '../../dto/common.js';
import { AssessmentConfidenceLevelSchema } from './competency-status.js';
import { PROFICIENCY_LEVEL_ORDER } from '../skill-levels.js';
import { CompetencyFusionResultSchema } from './competency-fusion.js';

export const SKILL_EVIDENCE_INFERENCE_OUTCOMES = [
  'INFERRED',
  'INSUFFICIENT_EVIDENCE',
  'VETO_BLOCKED',
] as const;

export const SkillEvidenceInferenceOutcomeKindSchema = z.enum(SKILL_EVIDENCE_INFERENCE_OUTCOMES);
export type SkillEvidenceInferenceOutcomeKind = z.infer<
  typeof SkillEvidenceInferenceOutcomeKindSchema
>;

export const SkillInferenceProvenanceSchema = z.object({
  ruleSetVersion: z.string().max(40),
  taxonomyVersion: z.string().max(40),
  capabilityModelVersion: z.string().max(80).optional(),
  promptRefs: z.array(z.string().max(80)).max(20).default([]),
  evidenceRecordIds: z.array(UuidSchema).max(50).default([]),
  computedAt: IsoDateTimeSchema,
});
export type SkillInferenceProvenance = z.infer<typeof SkillInferenceProvenanceSchema>;

export const SkillEvidenceInferenceSnapshotSchema = z.object({
  studentId: UuidSchema,
  skillCode: z.string().min(1).max(80),
  outcome: SkillEvidenceInferenceOutcomeKindSchema,
  inferredProficiency: z.enum(PROFICIENCY_LEVEL_ORDER).nullable(),
  confidence: AssessmentConfidenceLevelSchema,
  confidenceReason: z.string().max(1000),
  proficiencyInferenceReason: z.enum(['INSUFFICIENT_EVIDENCE', 'VETO_BLOCKED']).nullable(),
  evidenceCount: z.number().int().min(0),
  provenance: SkillInferenceProvenanceSchema,
  fusion: CompetencyFusionResultSchema,
  previousInferredProficiency: z.enum(PROFICIENCY_LEVEL_ORDER).nullable().optional(),
});
export type SkillEvidenceInferenceSnapshot = z.infer<typeof SkillEvidenceInferenceSnapshotSchema>;

export const GetSkillEvidenceInferenceResponseSchema = SkillEvidenceInferenceSnapshotSchema;
export type GetSkillEvidenceInferenceResponse = z.infer<
  typeof GetSkillEvidenceInferenceResponseSchema
>;
