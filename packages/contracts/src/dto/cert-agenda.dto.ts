import { z } from 'zod';
import { TrackCodeSchema } from '../domain/enums.js';
import { UuidSchema } from './common.js';

/**
 * PR-T01 — agenda → cert paper. Owner: Ramansh (`evaluation` + `prompts`).
 * Sparse/drift fail closed before any LLM call. Student payloads never carry
 * agenda→question mapping.
 */

export const CERT_AGENDA_PROMPT_REF = 'cert-agenda-generate@1' as const;
export const CERT_AGENDA_SYLLABUS_PACK_VERSION = 'publisher-syllabus@1' as const;
export const CERT_AGENDA_MIN_MAPPED_TOPICS = 5;
export const CERT_AGENDA_MIN_COVERAGE = 0.4;
export const CERT_AGENDA_MIN_JACCARD = 0.5;
export const CERT_AGENDA_MAX_UNMATCHED_RATIO = 0.3;
export const CERT_AGENDA_REGEN_MAX = 3;
export const CERT_AGENDA_ITEM_COUNT = 5;
export const CERT_AGENDA_LINE_MAX = 40;

export const CertAgendaLineSchema = z.string().trim().min(3).max(240);
export type CertAgendaLine = z.infer<typeof CertAgendaLineSchema>;

export const GenerateCertAgendaRequestSchema = z.object({
  trackCode: TrackCodeSchema,
  agendaLines: z.array(CertAgendaLineSchema).min(1).max(CERT_AGENDA_LINE_MAX),
});
export type GenerateCertAgendaRequest = z.infer<typeof GenerateCertAgendaRequestSchema>;

export const CertAgendaPublicItemSchema = z
  .object({
    index: z.number().int().min(1).max(CERT_AGENDA_ITEM_COUNT),
    stem: z.string().min(10).max(800),
    itemType: z.literal('MCQ'),
    options: z
      .array(z.object({ label: z.enum(['A', 'B', 'C', 'D']), text: z.string().min(1).max(400) }))
      .length(4),
  })
  .strict();
export type CertAgendaPublicItem = z.infer<typeof CertAgendaPublicItemSchema>;

/** Server-only scoring shape — correctKey never exposed to students. */
export const CertAgendaScorableItemSchema = CertAgendaPublicItemSchema.extend({
  correctKey: z.enum(['A', 'B', 'C', 'D']),
});
export type CertAgendaScorableItem = z.infer<typeof CertAgendaScorableItemSchema>;

/** Server-only. Never returned on the student generate response. */
export const CertAgendaInternalItemSchema = CertAgendaPublicItemSchema.extend({
  sourceAgendaLine: z.string().min(1).max(240),
  competencyTopic: z.string().min(1).max(120),
});
export type CertAgendaInternalItem = z.infer<typeof CertAgendaInternalItemSchema>;

export const GenerateCertAgendaResponseSchema = z
  .object({
    trackCode: TrackCodeSchema,
    items: z.array(CertAgendaPublicItemSchema).length(CERT_AGENDA_ITEM_COUNT),
    promptRef: z.literal(CERT_AGENDA_PROMPT_REF),
    taxonomyVersionSnapshot: z.string().min(8).max(120),
    auditId: UuidSchema.nullable(),
  })
  .strict();
export type GenerateCertAgendaResponse = z.infer<typeof GenerateCertAgendaResponseSchema>;

export function certAgendaTaxonomySnapshot(): string {
  return `${CERT_AGENDA_PROMPT_REF}+${CERT_AGENDA_SYLLABUS_PACK_VERSION}`;
}
