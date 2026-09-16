import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  CandidateMatchDtoSchema,
  CreateMatchRunResponseSchema,
  JdThresholdVectorSchema,
  MatchRunDtoSchema,
  PlacementMatchedDataSchema,
  SKILL_CODE_SET,
  ShortlistDtoSchema,
  SMART_TOPICS,
  TIER_RANK,
  TrackCodeSchema,
  type CertifiableTier,
  type CreateMatchRunResponse,
  type LevelNumber,
  type MatchRequest,
  type MatchRunDto,
  type ShortlistDto,
  type TrackCode,
} from '@smart/contracts';
import { Prisma } from '../../generated/prisma/index.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { MATCH_RUN_QUEUE } from '../../platform/queue/queue.names.js';
import {
  PROFICIENCY_RANK,
  rankCandidates,
  type ProficiencyName,
  type RankerCandidate,
  type RankerJob,
} from './rules-ranker.js';

const FALLBACK_TRACK: TrackCode = 'TECH_FULLSTACK';

/**
 * Internal shape shared by the sync `match()` path and the async `runMatchRun()` path — kept
 * separate from the public `MatchRequest` contract type since `runMatchRun` rebuilds this from
 * a persisted `MatchRun` row rather than a fresh request body.
 */
interface RunMatchingParams {
  jdId: string;
  batchIds: string[];
  minCgpa?: number;
  requiredSkillCodes: string[];
  filters?: MatchRequest['filters'];
  limit: number;
}

/** Prisma returns `MatchRun.minCgpa` as a `Decimal`; duck-type rather than import generated internals. */
type Decimalish = { toNumber?: () => number } | number;

function decimalToNumber(value: Decimalish | null): number | undefined {
  if (value === null) return undefined;
  return typeof value === 'number' ? value : value.toNumber?.();
}

/**
 * S6-VV-76 perf follow-up: raw row shape for the eligible-pool query. Fetched via `$queryRaw`
 * instead of a Prisma `findMany` with nested `include`s — at a few thousand eligible students
 * the nested-relation hydration cost (not the SQL itself, which runs in ~1-2ms per
 * EXPLAIN ANALYZE) dominated wall-clock time; this raw query does the same joins in Postgres
 * and returns one row per student with skills pre-aggregated as JSON, cutting that cost by
 * roughly 4-5x at 5,000 students in local benchmarking. Ranking output is unchanged.
 */
interface RawEligibleStudentRow {
  id: string;
  fullName: string;
  primaryTrackCode: string | null;
  certificateId: string | null;
  highestLevelCleared: number | null;
  headlineTier: string | null;
  skills: { code: string; domain: string; proficiency: string }[] | null;
}

interface HydratedStudent {
  id: string;
  fullName: string;
  primaryTrackCode: string | null;
  certificate: { id: string; highestLevelCleared: number; headlineTier: string } | null;
  verifiedSkills: { code: string; domain: string; proficiency: string }[];
}

/** Builds the eligible-pool query: institution + role + >=1 verified skill, plus the optional
 * batch/CGPA/required-skill/track pool-scoping filters — same semantics as the Prisma `where`
 * clause this replaced, just expressed as parameterized SQL fragments (never string
 * concatenation) so the dynamic filter lists stay injection-safe. */
function buildEligibleStudentsQuery(
  institutionId: string,
  request: Pick<RunMatchingParams, 'batchIds' | 'minCgpa' | 'requiredSkillCodes' | 'filters'>,
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`u.institution_id = ${institutionId}::uuid`,
    Prisma.sql`u.role = 'STUDENT'`,
    Prisma.sql`EXISTS (SELECT 1 FROM skill_claims sc_any WHERE sc_any.student_id = u.id AND sc_any.status = 'VERIFIED')`,
  ];
  if (request.batchIds.length) {
    conditions.push(Prisma.sql`u.batch_id = ANY(${request.batchIds}::uuid[])`);
  }
  if (request.minCgpa !== undefined) {
    conditions.push(Prisma.sql`u.cgpa >= ${request.minCgpa}`);
  }
  // Every required skill must be held VERIFIED (AND) — one EXISTS per code, not a single
  // `IN (...)`, which would only require ANY one of them and under-filter the pool.
  for (const code of request.requiredSkillCodes) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM skill_claims sc_req
      JOIN skills sk_req ON sk_req.id = sc_req.skill_id
      WHERE sc_req.student_id = u.id AND sc_req.status = 'VERIFIED' AND sk_req.code = ${code}
    )`);
  }
  if (request.filters?.trackCodes?.length) {
    conditions.push(Prisma.sql`t.code = ANY(${request.filters.trackCodes}::text[])`);
  }

  return Prisma.sql`
    SELECT
      u.id,
      u.full_name AS "fullName",
      t.code AS "primaryTrackCode",
      c.id AS "certificateId",
      c.highest_level_cleared AS "highestLevelCleared",
      c.headline_tier AS "headlineTier",
      COALESCE(sc_agg.skills, '[]'::json) AS skills
    FROM users u
    LEFT JOIN tracks t ON t.id = u.primary_track_id
    LEFT JOIN LATERAL (
      SELECT id, highest_level_cleared, headline_tier
      FROM certificates
      WHERE user_id = u.id AND status = 'ISSUED'
      ORDER BY issued_at DESC
      LIMIT 1
    ) c ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object('code', sk.code, 'domain', sk.domain, 'proficiency', sc.proficiency)) AS skills
      FROM skill_claims sc
      JOIN skills sk ON sk.id = sc.skill_id
      WHERE sc.student_id = u.id AND sc.status = 'VERIFIED'
    ) sc_agg ON true
    WHERE ${Prisma.join(conditions, ' AND ')}
  `;
}

@Injectable()
export class MatchingService {
  readonly owner = 'Ramansh';
  readonly purpose = 'Rules ranker (SE-T05 / ADR 0012); cosine optional later.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @InjectQueue(MATCH_RUN_QUEUE) private readonly matchRunQueue: Queue<{ matchRunId: string }>,
  ) {}

  /** @deprecated use `createMatchRun` + polling — kept for one release for backward compat. */
  async match(institutionId: string, request: MatchRequest): Promise<ShortlistDto> {
    return this.runMatching(institutionId, {
      jdId: request.jdId,
      batchIds: request.batchIds ?? (request.cohortId ? [request.cohortId] : []),
      minCgpa: request.minCgpa,
      requiredSkillCodes: request.requiredSkillCodes ?? [],
      filters: request.filters,
      limit: request.limit,
    });
  }

  /** S6-VV-76 — creates a PENDING `MatchRun` row and enqueues the background job. */
  async createMatchRun(
    institutionId: string,
    userId: string,
    request: MatchRequest,
  ): Promise<CreateMatchRunResponse> {
    await this.resolveJob(institutionId, request.jdId); // fail fast on an unknown/foreign jdId

    const batchIds = request.batchIds ?? (request.cohortId ? [request.cohortId] : []);
    const run = await this.prisma.matchRun.create({
      data: {
        institutionId,
        jdId: request.jdId,
        requestedById: userId,
        batchIds,
        minCgpa: request.minCgpa ?? null,
        requiredSkillCodes: request.requiredSkillCodes ?? [],
        limit: request.limit,
      },
    });

    await this.matchRunQueue.add('run-match', { matchRunId: run.id });

    return CreateMatchRunResponseSchema.parse({ runId: run.id, status: run.status });
  }

  /** Invoked by `MatchRunProcessor`. Never throws without first recording `FAILED` on the row. */
  async runMatchRun(matchRunId: string): Promise<void> {
    const run = await this.prisma.matchRun.findUnique({ where: { id: matchRunId } });
    if (!run) return;

    await this.prisma.matchRun.update({ where: { id: matchRunId }, data: { status: 'RUNNING' } });

    try {
      const shortlist = await this.runMatching(run.institutionId, {
        jdId: run.jdId,
        batchIds: run.batchIds,
        minCgpa: decimalToNumber(run.minCgpa),
        requiredSkillCodes: run.requiredSkillCodes,
        limit: run.limit,
      });

      await this.prisma.matchRun.update({
        where: { id: matchRunId },
        data: {
          status: 'SUCCEEDED',
          eligiblePoolCount: shortlist.eligiblePoolCount,
          suggestedCount: shortlist.candidates.length,
          shortlistId: shortlist.shortlistId,
          resultSnapshot: shortlist as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.matchRun.update({
        where: { id: matchRunId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
      // Rethrow so DlqAwareProcessor's 'failed' handler still DLQs once retries exhaust.
      throw error;
    }
  }

  async getMatchRun(institutionId: string, runId: string): Promise<MatchRunDto> {
    const run = await this.prisma.matchRun.findFirst({ where: { id: runId, institutionId } });
    if (!run) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Match run not found.',
        statusCode: 404,
      });
    }
    return MatchRunDtoSchema.parse({
      runId: run.id,
      jdId: run.jdId,
      status: run.status,
      eligiblePoolCount: run.eligiblePoolCount,
      suggestedCount: run.suggestedCount,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      shortlist: run.resultSnapshot as ShortlistDto | null,
    });
  }

  private async runMatching(
    institutionId: string,
    request: RunMatchingParams,
  ): Promise<ShortlistDto> {
    const job = await this.resolveJob(institutionId, request.jdId);

    const rows = await this.prisma.$queryRaw<RawEligibleStudentRow[]>(
      buildEligibleStudentsQuery(institutionId, request),
    );
    const students: HydratedStudent[] = rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      primaryTrackCode: row.primaryTrackCode,
      certificate: row.certificateId
        ? {
            id: row.certificateId,
            highestLevelCleared: row.highestLevelCleared ?? 1,
            headlineTier: row.headlineTier ?? 'BRONZE',
          }
        : null,
      verifiedSkills: row.skills ?? [],
    }));

    const filtered = students.filter((student) => passesOptionalFilters(student, request.filters));

    const pool: RankerCandidate[] = filtered.map((student) => ({
      studentId: student.id,
      verified: student.verifiedSkills.map((claim) => ({
        code: claim.code,
        rank: proficiencyRank(claim.proficiency),
        domain: claim.domain,
      })),
      years: null,
      location: null,
    }));

    const ranked = rankCandidates(job.ranker, pool, request.limit);
    const byId = new Map(filtered.map((student) => [student.id, student]));
    const generatedAt = new Date().toISOString();
    const shortlistId = randomUUID();

    const candidates = ranked.map((score) => {
      const student = byId.get(score.studentId);
      if (!student) {
        throw new Error(`Ranker returned unknown student ${score.studentId}`);
      }
      const cert = student.certificate;
      return CandidateMatchDtoSchema.parse({
        studentId: student.id,
        studentName: student.fullName,
        trackCode: parseTrackCode(student.primaryTrackCode ?? undefined),
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

    await this.publishPlacementMatched({
      shortlistId,
      jdId: request.jdId,
      institutionId,
      companyName: job.companyName,
      roleTitle: job.roleTitle,
      studentIds: candidates.map((candidate) => candidate.studentId),
      generatedAt,
    });

    return ShortlistDtoSchema.parse({
      shortlistId,
      jdId: request.jdId,
      companyName: job.companyName,
      roleTitle: job.roleTitle,
      generatedAt,
      candidates,
      totalCandidatesConsidered: pool.length,
      eligiblePoolCount: filtered.length,
    });
  }

  private async publishPlacementMatched(params: {
    shortlistId: string;
    jdId: string;
    institutionId: string;
    companyName: string;
    roleTitle: string;
    studentIds: string[];
    generatedAt: string;
  }): Promise<void> {
    const data = PlacementMatchedDataSchema.parse({
      shortlistId: params.shortlistId,
      jdId: params.jdId,
      institutionId: params.institutionId,
      companyName: params.companyName,
      roleTitle: params.roleTitle,
      matchedCount: params.studentIds.length,
      studentIds: params.studentIds,
      generatedAt: params.generatedAt,
    });
    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.placementMatched,
      partitionKey: params.jdId,
      eventType: SMART_TOPICS.placementMatched,
      source: 'placement',
      data,
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
  student: { certificate: { headlineTier: string; highestLevelCleared: number } | null },
  filters: MatchRequest['filters'],
): boolean {
  if (!filters) return true;
  const cert = student.certificate;
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
