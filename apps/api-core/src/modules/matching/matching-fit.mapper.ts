import {
  CandidateMatchDtoSchema,
  MatchFitDtoSchema,
  SKILL_DEFINITIONS,
  type CandidateMatchDto,
  type MatchFitDto,
  type MatchMethod,
  type SkillRequirement,
  type VerifiedSkillSummary,
} from '@smart/contracts';
import type { SkillCapabilityScore } from './skill-capability-ranker.js';

const skillNameByCode = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));

export function mapVerifiedSkillsSummary(
  skills: readonly { code: string; proficiency: string }[],
): VerifiedSkillSummary[] {
  return skills.map((skill) => ({
    skillCode: skill.code as VerifiedSkillSummary['skillCode'],
    skillName: skillNameByCode.get(skill.code) ?? skill.code,
    proficiency: skill.proficiency as VerifiedSkillSummary['proficiency'],
  }));
}

export function toCandidateMatchDto(input: {
  score: SkillCapabilityScore;
  studentName: string;
  trackCode: CandidateMatchDto['trackCode'];
  certificateId: string | null;
  highestLevelCleared: CandidateMatchDto['highestLevelCleared'];
  headlineTier: CandidateMatchDto['headlineTier'];
  verifiedSkills: readonly { code: string; proficiency: string }[];
  method: MatchMethod;
  recruiterSummary?: string;
  studentSummary?: string;
}): CandidateMatchDto {
  return CandidateMatchDtoSchema.parse({
    studentId: input.score.studentId,
    studentName: input.studentName,
    trackCode: input.trackCode,
    certificateId: input.certificateId,
    highestLevelCleared: input.highestLevelCleared,
    headlineTier: input.headlineTier,
    similarityScore: 0,
    matchScore: input.score.matchScore,
    method: input.method,
    explanation: {
      thresholdsMet: [],
      thresholdsMissed: [],
      strongCompetencies: [...input.score.strongCompetencies],
      gapCompetencies: [...input.score.gapCompetencies],
      why: input.score.why,
      skillCoveragePct: input.score.skillCoveragePct,
      capabilityCoveragePct: input.score.capabilityCoveragePct,
      potentialFit: input.score.potentialFit,
      skillFit: [...input.score.skillFit],
      capabilityFit: [...input.score.capabilityFit],
      recruiterSummary: input.recruiterSummary,
      studentSummary: input.studentSummary,
      skillCapability: {
        skill: input.score.skillScore,
        proficiency: input.score.skillScore,
        capability: input.score.capabilityScore,
      },
      verifiedSkills: mapVerifiedSkillsSummary(input.verifiedSkills),
    },
  });
}

export function toMatchFitDto(input: {
  score: SkillCapabilityScore;
  roleTitle: string;
  companyName: string;
  method: MatchMethod;
  openingId?: string;
  applicationId?: string;
  runId?: string;
  recruiterSummary?: string;
  studentSummary?: string;
}): MatchFitDto {
  return MatchFitDtoSchema.parse({
    studentId: input.score.studentId,
    openingId: input.openingId,
    applicationId: input.applicationId,
    runId: input.runId,
    roleTitle: input.roleTitle,
    companyName: input.companyName,
    matchScore: input.score.matchScore,
    method: input.method,
    skillCoveragePct: input.score.skillCoveragePct,
    capabilityCoveragePct: input.score.capabilityCoveragePct,
    potentialFit: input.score.potentialFit,
    skillFit: [...input.score.skillFit],
    capabilityFit: [...input.score.capabilityFit],
    skillGaps: input.score.skillFit.filter((row) => row.status !== 'MET'),
    competencyGaps: input.score.capabilityFit.filter((row) => row.hitScore < 0.5),
    strongCompetencies: [...input.score.strongCompetencies],
    gapCompetencies: [...input.score.gapCompetencies],
    why: input.score.why,
    recruiterSummary: input.recruiterSummary,
    studentSummary: input.studentSummary,
  });
}

export function jobRequirementsFromProfile(job: {
  requiredSkills: readonly { code: string; minProficiency: string }[];
  requiredCapabilities: readonly {
    competencyId: string;
    capability: string;
    skillCode: string;
    role: 'critical' | 'core' | 'supporting';
  }[];
}): {
  skills: SkillRequirement[];
  capabilities: {
    competencyId: string;
    capability: string;
    skillCode: SkillRequirement['skillCode'];
    role: 'critical' | 'core' | 'supporting';
  }[];
} {
  return {
    skills: job.requiredSkills.map((skill) => ({
      skillCode: skill.code as SkillRequirement['skillCode'],
      minProficiency: skill.minProficiency as SkillRequirement['minProficiency'],
    })),
    capabilities: job.requiredCapabilities.map((cap) => ({
      competencyId: cap.competencyId,
      capability: cap.capability,
      skillCode: cap.skillCode as SkillRequirement['skillCode'],
      role: cap.role,
    })),
  };
}
