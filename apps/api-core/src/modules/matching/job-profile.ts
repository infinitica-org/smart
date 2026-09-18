import {
  JdSkillExtractVectorSchema,
  SKILL_DEFINITIONS,
  getSkillBlueprint,
  type EmphasisedCapability,
  type SkillRequirement,
} from '@smart/contracts';
import {
  PROFICIENCY_RANK,
  type SkillCapabilityJob,
  type SkillCapabilityRequiredCapability,
  type SkillCapabilityRequiredSkill,
} from './skill-capability-ranker.js';

const skillNameByCode = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));

function proficiencyRank(value: string): number {
  if (value in PROFICIENCY_RANK) {
    return PROFICIENCY_RANK[value as keyof typeof PROFICIENCY_RANK];
  }
  return PROFICIENCY_RANK.BEGINNER;
}

function toRequiredSkill(requirement: SkillRequirement): SkillCapabilityRequiredSkill {
  return {
    code: requirement.skillCode,
    name: skillNameByCode.get(requirement.skillCode) ?? requirement.skillCode,
    minRank: proficiencyRank(requirement.minProficiency),
    minProficiency: requirement.minProficiency,
  };
}

function capabilitiesFromSkills(
  skills: readonly SkillRequirement[],
  parsedCaps: readonly EmphasisedCapability[],
): SkillCapabilityRequiredCapability[] {
  const byId = new Map<string, SkillCapabilityRequiredCapability>();

  for (const cap of parsedCaps) {
    byId.set(cap.competencyId, {
      competencyId: cap.competencyId,
      capability: cap.capability,
      skillCode: cap.skillCode,
      role: cap.role,
    });
  }

  for (const skill of skills) {
    const blueprint = getSkillBlueprint(skill.skillCode);
    for (const row of blueprint?.competencyModel ?? []) {
      if (byId.has(row.competencyId)) continue;
      if (row.role === 'critical' || row.role === 'core') {
        byId.set(row.competencyId, {
          competencyId: row.competencyId,
          capability: row.capability,
          skillCode: row.skillCode,
          role: row.role,
        });
      }
    }
  }

  return [...byId.values()].slice(0, 30);
}

export function buildSkillCapabilityJob(input: {
  requiredSkills: readonly SkillRequirement[];
  parsedRequirements?: unknown;
}): SkillCapabilityJob {
  const parsed = input.parsedRequirements
    ? JdSkillExtractVectorSchema.safeParse(input.parsedRequirements)
    : null;

  const mergedSkills = new Map<string, SkillRequirement>();
  for (const skill of input.requiredSkills) {
    mergedSkills.set(skill.skillCode, skill);
  }
  if (parsed?.success) {
    for (const skill of parsed.data.requiredSkills) {
      if (!mergedSkills.has(skill.skillCode)) {
        mergedSkills.set(skill.skillCode, skill);
      }
    }
  }

  const skills = [...mergedSkills.values()].map(toRequiredSkill);
  const parsedCaps = parsed?.success ? parsed.data.emphasisedCapabilities : [];
  const skillRequirements = [...mergedSkills.values()];

  return {
    requiredSkills: skills,
    requiredCapabilities: capabilitiesFromSkills(skillRequirements, parsedCaps),
  };
}
