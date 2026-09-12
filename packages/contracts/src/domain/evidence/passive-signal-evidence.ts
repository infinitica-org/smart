import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema, WeightSchema } from '../../dto/common.js';
import { SignalSourceIdSchema } from '../../dto/signals.dto.js';
import { EvidenceReliabilitySchema } from './enums.js';
import { SkillMappingSchema } from './metadata.js';

export const PassiveSignalActivitySchema = z.object({
  activityType: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  occurredAt: IsoDateTimeSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type PassiveSignalActivity = z.infer<typeof PassiveSignalActivitySchema>;

export const PassiveSignalEvidenceSchema = z.object({
  signalId: UuidSchema,
  source: SignalSourceIdSchema,
  accountReference: z.string().min(1).max(500),
  activity: z.array(PassiveSignalActivitySchema).max(100).default([]),
  activityPeriodStart: IsoDateTimeSchema.nullable().optional(),
  activityPeriodEnd: IsoDateTimeSchema.nullable().optional(),
  relevantArtifactIds: z.array(UuidSchema).max(50).default([]),
  skillMappings: z.array(SkillMappingSchema).max(50).default([]),
  signalStrength: WeightSchema.optional(),
  reliability: EvidenceReliabilitySchema.optional(),
  anomalies: z.array(z.string().max(500)).max(20).default([]),
});
export type PassiveSignalEvidence = z.infer<typeof PassiveSignalEvidenceSchema>;
