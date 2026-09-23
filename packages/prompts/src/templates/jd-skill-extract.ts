import { z } from 'zod';
import { JdSkillExtractVectorSchema } from '@smart/contracts';
import type { PromptTemplate } from '../types.js';
import { INJECTION_GUARD, jsonOnly, untrusted } from '../shared.js';

export const JD_SKILL_EXTRACT_PROMPT_REF = 'jd-skill-extract@1' as const;

export const JdSkillExtractVariables = z.object({
  companyName: z.string().min(1),
  roleTitle: z.string().min(1),
  rawText: z.string().min(20),
  skillCatalog: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        categoryName: z.string(),
      }),
    )
    .min(1),
  competencyCatalog: z
    .array(
      z.object({
        competencyId: z.string().uuid(),
        skillCode: z.string(),
        capability: z.string(),
        role: z.enum(['critical', 'core', 'supporting']),
      }),
    )
    .min(1),
});
export type JdSkillExtractVariables = z.infer<typeof JdSkillExtractVariables>;

const OUTPUT_SHAPE = `{
  "requiredSkills": [{ "skillCode": string, "minProficiency": "BEGINNER"|"INTERMEDIATE"|"PROFICIENT"|"ADVANCED"|"PROFESSIONAL" }],
  "emphasisedCapabilities": [{
    "competencyId": string,
    "capability": string,
    "skillCode": string,
    "role": "critical"|"core"|"supporting"
  }],
  "parseConfidence": number
}`;

export const jdSkillExtractTemplate: PromptTemplate<JdSkillExtractVariables> = {
  id: 'jd-skill-extract',
  version: 1,
  purpose: 'Map employer JD prose to skill@1 codes and blueprint competency IDs.',
  modelRole: 'PRIMARY_REASONING',
  temperature: 0,
  maxOutputTokens: 2_048,
  outputSchema: JdSkillExtractVectorSchema,
  variablesSchema: JdSkillExtractVariables,
  render: (variables) => ({
    system: [
      'Extract hiring requirements from a job description into the SMART skill@1 taxonomy.',
      'Use ONLY skill codes and competencyIds from the catalogs below — never invent codes.',
      'Set minProficiency from JD language: exposure/familiarity=BEGINNER, solid/strong=INTERMEDIATE, proficient/production-ready=PROFICIENT, expert/lead=ADVANCED, principal/architect=PROFESSIONAL.',
      'Pick emphasisedCapabilities that the JD actually requires day-to-day, not nice-to-have fluff.',
      'Set parseConfidence below 0.6 when the JD is vague or spans multiple unrelated roles.',
      INJECTION_GUARD,
      jsonOnly(OUTPUT_SHAPE),
    ].join('\n'),
    user: [
      `COMPANY: ${variables.companyName}`,
      `ROLE: ${variables.roleTitle}`,
      '',
      'SKILL CATALOG (skillCode must match exactly)',
      variables.skillCatalog
        .map((skill) => `- ${skill.code} — ${skill.name} (${skill.categoryName})`)
        .join('\n'),
      '',
      'COMPETENCY CATALOG (competencyId must match exactly)',
      variables.competencyCatalog
        .map(
          (row) =>
            `- ${row.competencyId} | ${row.skillCode} | ${row.role} | ${row.capability.slice(0, 120)}`,
        )
        .join('\n'),
      '',
      'JOB DESCRIPTION',
      untrusted(variables.rawText),
    ].join('\n'),
  }),
};
