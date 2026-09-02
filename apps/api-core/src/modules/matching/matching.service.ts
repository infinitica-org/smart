import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CandidateMatchDtoSchema,
  JdThresholdVectorSchema,
  SKILL_CODE_SET,
  ShortlistDtoSchema,
  TIER_RANK,
  TrackCodeSchema,
  type CertifiableTier,
  type LevelNumber,
  type MatchRequest,
  type ShortlistDto,
  type TrackCode,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import {
  PROFICIENCY_RANK,
  rankCandidates,
  type ProficiencyName,
  type RankerCandidate,
  type RankerJob,
} from './rules-ranker.js';

const FALLBACK_TRACK: TrackCode = 'TECH_FULLSTACK';

@Injectable()
export class MatchingService {
  readonly owner = 'Ramansh';
  readonly purpose = 'Rules ranker (SE-T05 / ADR 0012); cosine optional later.';

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async match(institutionId: string, request: MatchRequest): Promise<ShortlistDto> {
    const job = await this.resolveJob(institutionId, request.jdId);

    const students = await this.prisma.user.findMany({
      where: {
        institutionId,
        role: 'STUDENT',
        skillClaims: { some: { status: 'VERIFIED' } },
        ...(request.cohortId ? { batchId: request.cohortId } : {}),
        ...(request.filters?.trackCodes?.length
          ? { primaryTrack: { code: { in: request.filters.trackCodes } } }
          : {}),
      },
      include: {
        primaryTrack: { select: { code: true } },
        skillClaims: {
          where: { status: 'VERIFIED' },
          include: { skill: { select: { code: true, domain: true } } },
        },
        certificates: {
          where: { status: 'ISSUED' },
          orderBy: { issuedAt: 'desc' },
          take: 1,
        },
      },
    });

    const filtered = students.filter((student) => passesOptionalFilters(student, request.filters));

    const pool: RankerCandidate[] = filtered.map((student) => ({
      studentId: student.id,
      verified: student.skillClaims.map((claim) => ({
        code: claim.skill.code,
        rank: proficiencyRank(claim.proficiency),
        domain: claim.skill.domain,
      })),
      years: null,
      location: null,
    }));

    const ranked = rankCandidates(job.ranker, pool, request.limit);
    const byId = new Map(filtered.map((student) => [student.id, student]));
    const generatedAt = new Date().toISOString();

    const candidates = ranked.map((score) => {
      const student = byId.get(score.studentId);
      if (!student) {
        throw new Error(`Ranker returned unknown student ${score.studentId}`);
      }
      const cert = student.certificates[0];
      return CandidateMatchDtoSchema.parse({
        studentId: student.id,
        studentName: student.fullName,
        trackCode: parseTrackCode(student.primaryTrack?.code),
        certificateId: cert?.id ?? null,
        highestLevelCleared: parseLevel(cert?.highestLevelCleared),
        headlineTier: parseHeadline(cert?.headlineTier),
        similarityScore: 0,
        matchScore: score.matchMp / 1000,
        method: 'RULES',
        explanation: {
          thresholdsMet: [],
          thresholdsMissed: [],
          strongCompetencies: [...score.strongCompetencies],
          gapCompetencies: [...score.gapCompetencies],
          why: score.why,
          rules: {
            skill: score.s / 1000,
            proficiency: score.p / 1000,
            domain: score.d / 1000,
            experience: score.e / 1000,
            location: score.l / 1000,
          },
        },
      });
    });

    return ShortlistDtoSchema.parse({
      shortlistId: randomUUID(),
      jdId: request.jdId,
      companyName: job.companyName,
      roleTitle: job.roleTitle,
      generatedAt,
      candidates,
      totalCandidatesConsidered: pool.length,
    });
  }

  private async resolveJob(
    institutionId: string,
    jdId: string,
  ): Promise<{ companyName: string; roleTitle: string; ranker: RankerJob }> {
    const opening = await this.prisma.jobOpening.findFirst({
      where: { id: jdId, institutionId },
      include: {
        requiredSkills: { include: { skill: { select: { code: true, domain: true } } } },
      },
    });
    if (opening) {
      return {
        companyName: opening.companyName,
        roleTitle: opening.roleTitle,
        ranker: {
          requiredSkills: opening.requiredSkills.map((row) => ({
            code: row.skill.code,
            minRank: proficiencyRank(row.minProficiency),
          })),
          domainCode: opening.domainCode ?? 'SOFTWARE_IT',
          minYearsExperience: opening.minYearsExperience,
          maxYearsExperience: opening.maxYearsExperience,
          location: opening.location,
        },
      };
    }

    const jd = await this.prisma.jobDescription.findFirst({
      where: { id: jdId, institutionId },
    });
    const parsed = jd?.thresholds ? JdThresholdVectorSchema.safeParse(jd.thresholds) : null;
    if (!jd || !parsed?.success) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job opening not found.',
        statusCode: 404,
      });
    }

    const requiredSkills = parsed.data.emphasisedCompetencies
      .filter((code) => SKILL_CODE_SET.has(code))
      .map((code) => ({ code, minRank: PROFICIENCY_RANK.BEGINNER }));
    if (requiredSkills.length === 0) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job opening not found.',
        statusCode: 404,
      });
    }

    return {
      companyName: jd.companyName,
      roleTitle: jd.roleTitle,
      ranker: {
        requiredSkills,
        domainCode: 'SOFTWARE_IT',
        minYearsExperience: null,
        maxYearsExperience: null,
        location: null,
      },
    };
  }
}

function proficiencyRank(value: string): number {
  if (value in PROFICIENCY_RANK) {
    return PROFICIENCY_RANK[value as ProficiencyName];
  }
  return PROFICIENCY_RANK.BEGINNER;
}

function parseTrackCode(code: string | undefined): TrackCode {
  const parsed = TrackCodeSchema.safeParse(code);
  return parsed.success ? parsed.data : FALLBACK_TRACK;
}

function parseLevel(value: number | undefined): LevelNumber {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) return value;
  return 1;
}

function parseHeadline(value: string | undefined): CertifiableTier {
  if (value === 'GOLD' || value === 'SILVER' || value === 'BRONZE') return value;
  return 'BRONZE';
}

function passesOptionalFilters(
  student: {
    certificates: { headlineTier: string; highestLevelCleared: number }[];
  },
  filters: MatchRequest['filters'],
): boolean {
  if (!filters) return true;
  const cert = student.certificates[0];
  const headline = parseHeadline(cert?.headlineTier);
  const level = parseLevel(cert?.highestLevelCleared);
  if (filters.minHeadlineTier && TIER_RANK[headline] < TIER_RANK[filters.minHeadlineTier]) {
    return false;
  }
  if (filters.minLevelCleared !== undefined && level < filters.minLevelCleared) {
    return false;
  }
  return true;
}
