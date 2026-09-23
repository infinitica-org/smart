import { z } from 'zod';
import { UuidSchema } from '../../dto/common.js';
import { LEVEL_VERIFICATION_METHOD, PROFICIENCY_LEVEL_ORDER } from '../skill-levels.js';

export const ProficiencyRequirementLevelSchema = z.enum(PROFICIENCY_LEVEL_ORDER);
export type ProficiencyRequirementLevel = z.infer<typeof ProficiencyRequirementLevelSchema>;

export const ProficiencyRequirementSchema = z.object({
  level: ProficiencyRequirementLevelSchema,
  requiredCompetencyIds: z.array(UuidSchema).max(20),
  criticalCompetencyIds: z.array(UuidSchema).max(20).default([]),
  /** Real-world application proof required before final verification at this level. */
  realWorldApplicationRequired: z.boolean().default(false),
  /** Substantial owned application (typically project-level) required at this level. */
  substantialApplicationRequired: z.boolean().default(false),
  /** Defense interview required before final verification at this level. */
  interviewRequired: z.boolean().default(false),
});
export type ProficiencyRequirement = z.infer<typeof ProficiencyRequirementSchema>;

export const ProficiencyRequirementsSchema = z.array(ProficiencyRequirementSchema).max(5);
export type ProficiencyRequirements = z.infer<typeof ProficiencyRequirementsSchema>;

export type ProficiencyVerificationFlags = {
  readonly realWorldApplicationRequired: boolean;
  readonly substantialApplicationRequired: boolean;
  readonly interviewRequired: boolean;
};

/** Resolve verification gates for a proficiency level from blueprint metadata. */
export function resolveProficiencyVerification(
  requirements: readonly ProficiencyRequirement[],
  level: ProficiencyRequirementLevel,
): ProficiencyVerificationFlags {
  const requirement = requirements.find((entry) => entry.level === level);
  if (requirement) {
    return {
      realWorldApplicationRequired: requirement.realWorldApplicationRequired,
      substantialApplicationRequired: requirement.substantialApplicationRequired,
      interviewRequired: requirement.interviewRequired,
    };
  }
  const legacy = LEVEL_VERIFICATION_METHOD[level];
  return {
    realWorldApplicationRequired: legacy.projectRequired,
    substantialApplicationRequired: legacy.projectRequired,
    interviewRequired: legacy.interviewRequired,
  };
}
