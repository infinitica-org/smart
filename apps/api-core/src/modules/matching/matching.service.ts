import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  AssessmentResultSchema,
  CandidateMatchDtoSchema,
  CreateMatchRunResponseSchema,
  JdThresholdVectorSchema,
  MatchFitDtoSchema,
  MatchRunDtoSchema,
  PlacementMatchedDataSchema,
  SKILL_CODE_SET,
  ShortlistDtoSchema,
  SMART_TOPICS,
  TIER_RANK,
  TrackCodeSchema,
  type CandidateMatchDto,
  type CertifiableTier,
  type CreateMatchRunResponse,
  type LevelNumber,
  type ListSavedCandidatesResponse,
  type MatchFeedbackResponse,
  type MatchFitDto,
  type MatchMethod,
  type JobOpeningEligibilityCriteria,
  type MatchRequest,
  type MatchRunDto,
  type SaveCandidateRequest,
  type SavedCandidateDto,
  type SearchStudentsQuery,
  type ShortlistDto,
  type SubmitMatchFeedbackRequest,
  type MatchFeedbackSummaryDto,
  type TrackCode,
} from '@smart/contracts';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Prisma } from '../../generated/prisma/index.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { MATCH_RUN_QUEUE } from '../../platform/queue/queue.names.js';
import { InstitutionsService } from '../institutions/institutions.service.js';
import type { CompetencyStatus } from '@smart/contracts';
import { mapStudentCapabilitiesToSummaries } from '../../common/competency-evidence-summary.js';
import {
  EMPLOYER_DISCOVERABLE_STUDENT_SQL,
  filterEmployerDiscoverableStudentIds,
  studentUnavailableToEmployers,
} from '../../common/employer-visibility.js';
import { QlixSmartAssessmentSchema } from '../evaluation/qlix-client.js';
import { buildSkillCapabilityJob } from './job-profile.js';
import {
  jobRequirementsFromProfile,
  mapVerifiedSkillsSummary,
  toCandidateMatchDto,
} from './matching-fit.mapper.js';
import {
  mergeMatchExplainability,
  type QlixProjectExplainability,
} from './matching-explainability.js';
import { MatchNarrativeService } from './match-narrative.service.js';
import {
  PROFICIENCY_RANK as RULES_PROFICIENCY_RANK,
  rankCandidates,
  type ProficiencyName,
  type RankerCandidate,
  type RankerJob,
} from './rules-ranker.js';
import {
  PROFICIENCY_RANK,
  SKILL_CAPABILITY_RANKER_VERSION,
  rankSkillCapabilityCandidates,
  type InferredCapabilityRow,
  type QlixCompetencyObservation,
  type SkillCapabilityCandidate,
  type SkillCapabilityJob,
} from './skill-capability-ranker.js';

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
  openingEligibility?: JobOpeningEligibilityCriteria;
  limit: number;
  minSkillCoverage: number;
  runId?: string;
}

const RULES_RANKER_FLAG = 'matching.use_rules_ranker' as const;
const NARRATIVE_TOP_N = 20;
const STUDENT_FIT_STAGES = new Set([
  'SHORTLISTED',
  'AI_VERIFIED',
  'INTERVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
]);

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
function effectiveMinCgpaForOpening(
  request: RunMatchingParams,
  openingEligibility?: JobOpeningEligibilityCriteria,
): number | undefined {
  const fromOpening =
    openingEligibility?.minCollegePercentage !== undefined
      ? openingEligibility.minCollegePercentage / 10
      : undefined;
  if (request.minCgpa !== undefined && fromOpening !== undefined) {
    return Math.max(request.minCgpa, fromOpening);
  }
  return request.minCgpa ?? fromOpening;
}

function buildEligibleStudentsQuery(
  institutionId: string,
  request: Pick<
    RunMatchingParams,
    'batchIds' | 'minCgpa' | 'requiredSkillCodes' | 'filters' | 'openingEligibility'
  >,
): Prisma.Sql {
  /**
   * MAT-01 / I374: Exclusion of protected attributes from matching pipeline.
   * Demographic fields (gender, caste, religion, age, disability, photo) are explicitly excluded
   * from query conditions, ranking inputs, and scoring weights. Matching relies exclusively on
   * verified competencies, proctored evaluation scores, and academic batch criteria.
   */
  const conditions: Prisma.Sql[] = [
    Prisma.sql`u.institution_id = ${institutionId}::uuid`,
    Prisma.sql`u.role = 'STUDENT'`,
    EMPLOYER_DISCOVERABLE_STUDENT_SQL,
    Prisma.sql`EXISTS (SELECT 1 FROM skill_claims sc_any WHERE sc_any.student_id = u.id AND sc_any.status = 'VERIFIED')`,
  ];
  if (request.batchIds.length) {
    conditions.push(Prisma.sql`u.batch_id = ANY(${request.batchIds}::uuid[])`);
  }
  if (request.minCgpa !== undefined) {
    conditions.push(Prisma.sql`u.cgpa >= ${request.minCgpa}`);
  }
  const eligibility = request.openingEligibility;
  if (eligibility?.minSscPercentage !== undefined) {
    conditions.push(
      Prisma.sql`u.ssc_percentage IS NOT NULL AND u.ssc_percentage >= ${eligibility.minSscPercentage}`,
    );
  }
  if (eligibility?.minHscPercentage !== undefined) {
    conditions.push(
      Prisma.sql`u.hsc_percentage IS NOT NULL AND u.hsc_percentage >= ${eligibility.minHscPercentage}`,
    );
  }
  if (eligibility?.minCollegePercentage !== undefined && request.minCgpa === undefined) {
    const minCgpaFromPercent = eligibility.minCollegePercentage / 10;
    conditions.push(Prisma.sql`u.cgpa IS NOT NULL AND u.cgpa >= ${minCgpaFromPercent}`);
  }
  if (eligibility?.backlogsAllowed === false) {
    conditions.push(Prisma.sql`u.has_active_backlog IS DISTINCT FROM TRUE`);
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
  if (request.filters?.graduationYear !== undefined) {
    conditions.push(Prisma.sql`u.graduation_year = ${request.filters.graduationYear}`);
  }
  if (request.filters?.minHeadlineTier !== undefined) {
    conditions.push(Prisma.sql`c.headline_tier = ${request.filters.minHeadlineTier}`);
  }
  if (request.filters?.minLevelCleared !== undefined) {
    conditions.push(Prisma.sql`c.highest_level_cleared >= ${request.filters.minLevelCleared}`);
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
      SELECT json_agg(json_build_object(
        'code', sk.code,
        'domain', sk.domain,
        'proficiency', COALESCE(sc.final_proficiency::text, sc.proficiency::text)
      )) AS skills
      FROM skill_claims sc
      JOIN skills sk ON sk.id = sc.skill_id
      WHERE sc.student_id = u.id
        AND sc.status = 'VERIFIED'
        AND (sc.verified_until IS NULL OR sc.verified_until > NOW())
    ) sc_agg ON true
    WHERE ${Prisma.join(conditions, ' AND ')}
  `;
}

@Injectable()
export class MatchingService {
  readonly owner = 'Ramansh';
  readonly purpose = 'Skill+capability ranker (default) with rules-ranker rollback flag.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(InstitutionsService) private readonly institutions: InstitutionsService,
    @Inject(MatchNarrativeService) private readonly narratives: MatchNarrativeService,
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
      minSkillCoverage: request.minSkillCoverage ?? 0.6,
    });
  }

  /** S6-VV-76 — creates a PENDING `MatchRun` row and enqueues the background job. */
  async createMatchRun(
    institutionId: string,
    userId: string,
    request: MatchRequest,
  ): Promise<CreateMatchRunResponse> {
    await this.resolveOpeningJob(institutionId, request.jdId); // fail fast on an unknown/foreign jdId

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
        minSkillCoverage: request.minSkillCoverage ?? 0.6,
        rankerVersion: SKILL_CAPABILITY_RANKER_VERSION,
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
        minSkillCoverage: decimalToNumber(run.minSkillCoverage) ?? 0.6,
        runId: run.id,
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
      rankerVersion: run.rankerVersion ?? SKILL_CAPABILITY_RANKER_VERSION,
      eligiblePoolCount: run.eligiblePoolCount,
      suggestedCount: run.suggestedCount,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      shortlist: await this.withoutHiddenCandidates(run.resultSnapshot as ShortlistDto | null),
    });
  }

  /**
   * S6-VV-148 — a stored shortlist was computed before any later deactivation
   * or hold, so re-check visibility every time it is served.
   */
  private async withoutHiddenCandidates(
    shortlist: ShortlistDto | null,
  ): Promise<ShortlistDto | null> {
    if (!shortlist) return null;
    const visible = await filterEmployerDiscoverableStudentIds(
      this.prisma,
      shortlist.candidates.map((row) => row.studentId),
    );
    return {
      ...shortlist,
      candidates: shortlist.candidates.filter((row) => visible.has(row.studentId)),
    };
  }

  async getCandidateFit(
    institutionId: string,
    runId: string,
    studentId: string,
  ): Promise<MatchFitDto> {
    const run = await this.prisma.matchRun.findFirst({
      where: { id: runId, institutionId, status: 'SUCCEEDED' },
    });
    if (!run?.resultSnapshot) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Match run not found.',
        statusCode: 404,
      });
    }
    const shortlist = ShortlistDtoSchema.parse(run.resultSnapshot);
    const candidate = shortlist.candidates.find((row) => row.studentId === studentId);
    if (candidate) {
      const visible = await filterEmployerDiscoverableStudentIds(this.prisma, [studentId]);
      if (!visible.has(studentId)) throw studentUnavailableToEmployers();
    }
    if (!candidate) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Candidate not found in this match run.',
        statusCode: 404,
      });
    }
    return MatchFitDtoSchema.parse({
      studentId: candidate.studentId,
      openingId: shortlist.jdId,
      runId,
      roleTitle: shortlist.roleTitle,
      companyName: shortlist.companyName,
      matchScore: candidate.matchScore,
      method: candidate.method,
      skillCoveragePct: candidate.explanation.skillCoveragePct ?? 0,
      capabilityCoveragePct: candidate.explanation.capabilityCoveragePct ?? 0,
      potentialFit: candidate.explanation.potentialFit ?? 'STRETCH',
      skillFit: candidate.explanation.skillFit ?? [],
      capabilityFit: candidate.explanation.capabilityFit ?? [],
      skillGaps: (candidate.explanation.skillFit ?? []).filter((row) => row.status !== 'MET'),
      competencyGaps: (candidate.explanation.capabilityFit ?? []).filter(
        (row) => row.hitScore < 0.5,
      ),
      strongCompetencies: candidate.explanation.strongCompetencies,
      gapCompetencies: candidate.explanation.gapCompetencies,
      why: candidate.explanation.why,
      recruiterSummary: candidate.explanation.recruiterSummary,
      studentSummary: candidate.explanation.studentSummary,
    });
  }

  async getApplicationFit(studentId: string, applicationId: string): Promise<MatchFitDto> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, studentId },
      include: {
        opening: {
          select: { id: true, institutionId: true, companyName: true, roleTitle: true },
        },
      },
    });
    if (!application) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Application not found.',
        statusCode: 404,
      });
    }
    if (!STUDENT_FIT_STAGES.has(application.stage)) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Fit details are available after shortlisting.',
        statusCode: 403,
      });
    }

    const latestRun = await this.prisma.matchRun.findFirst({
      where: {
        jdId: application.openingId,
        institutionId: application.opening.institutionId,
        status: 'SUCCEEDED',
      },
      orderBy: { completedAt: 'desc' },
    });
    if (latestRun) {
      try {
        return await this.getCandidateFit(
          application.opening.institutionId,
          latestRun.id,
          studentId,
        );
      } catch (error) {
        if (!(error instanceof NotFoundException)) throw error;
      }
    }

    const shortlist = await this.runMatching(application.opening.institutionId, {
      jdId: application.openingId,
      batchIds: [],
      requiredSkillCodes: [],
      limit: 500,
      minSkillCoverage: decimalToNumber(latestRun?.minSkillCoverage ?? null) ?? 0.6,
    });
    const candidate = shortlist.candidates.find((row) => row.studentId === studentId);
    if (!candidate) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'No fit computed for this application.',
        statusCode: 404,
      });
    }
    return MatchFitDtoSchema.parse({
      studentId: candidate.studentId,
      openingId: application.openingId,
      applicationId,
      roleTitle: shortlist.roleTitle,
      companyName: shortlist.companyName,
      matchScore: candidate.matchScore,
      method: candidate.method,
      skillCoveragePct: candidate.explanation.skillCoveragePct ?? 0,
      capabilityCoveragePct: candidate.explanation.capabilityCoveragePct ?? 0,
      potentialFit: candidate.explanation.potentialFit ?? 'STRETCH',
      skillFit: candidate.explanation.skillFit ?? [],
      capabilityFit: candidate.explanation.capabilityFit ?? [],
      skillGaps: (candidate.explanation.skillFit ?? []).filter((row) => row.status !== 'MET'),
      competencyGaps: (candidate.explanation.capabilityFit ?? []).filter(
        (row) => row.hitScore < 0.5,
      ),
      strongCompetencies: candidate.explanation.strongCompetencies,
      gapCompetencies: candidate.explanation.gapCompetencies,
      why: candidate.explanation.why,
      recruiterSummary: candidate.explanation.recruiterSummary,
      studentSummary: candidate.explanation.studentSummary,
    });
  }

  private async runMatching(
    institutionId: string,
    request: RunMatchingParams,
  ): Promise<ShortlistDto> {
    const resolved = await this.resolveOpeningJob(institutionId, request.jdId);
    const useRules = await this.useRulesRanker(institutionId);
    if (useRules && resolved.ranker) {
      return this.runRulesMatching(institutionId, request, resolved);
    }
    return this.runSkillCapabilityMatching(institutionId, request, resolved);
  }

  private async runSkillCapabilityMatching(
    institutionId: string,
    request: RunMatchingParams,
    resolved: ResolvedOpeningJob,
  ): Promise<ShortlistDto> {
    const job = resolved.skillCapabilityJob;
    const rows = await this.prisma.$queryRaw<RawEligibleStudentRow[]>(
      buildEligibleStudentsQuery(institutionId, {
        ...request,
        minCgpa: effectiveMinCgpaForOpening(request, resolved.openingEligibility),
        openingEligibility: resolved.openingEligibility,
      }),
    );
    const students = hydrateStudents(rows);
    const filtered = students.filter((student) => passesOptionalFilters(student, request.filters));
    const studentIds = filtered.map((student) => student.id);
    const evidence = await this.loadSkillCapabilityEvidence(studentIds);

    const pool: SkillCapabilityCandidate[] = filtered.map((student) => ({
      studentId: student.id,
      verified: student.verifiedSkills.map((claim) => ({
        code: claim.code,
        rank: proficiencyRank(claim.proficiency),
        proficiency: claim.proficiency,
      })),
      competencyResults: evidence.competencyResultsByStudent.get(student.id) ?? [],
      inferredCapabilities: evidence.inferredByStudent.get(student.id) ?? [],
      qlixObservations: evidence.qlixByStudent.get(student.id) ?? [],
    }));

    const { ranked, candidatesScoredCount } = rankSkillCapabilityCandidates(
      job,
      pool,
      request.limit,
    );
    const byId = new Map(filtered.map((student) => [student.id, student]));
    const generatedAt = new Date().toISOString();
    const shortlistId = randomUUID();
    const method: MatchMethod = 'SKILL_CAPABILITY';
    const jobRequirements = jobRequirementsFromProfile({
      requiredSkills: job.requiredSkills.map((skill) => ({
        code: skill.code,
        minProficiency: skill.minProficiency,
      })),
      requiredCapabilities: job.requiredCapabilities,
    });

    const rankedStudentIds = ranked.map((score) => score.studentId);
    const explainability = await this.loadExplainabilityContext(rankedStudentIds);

    const candidates = [];
    for (const [index, score] of ranked.entries()) {
      const student = byId.get(score.studentId);
      if (!student) continue;
      const cert = student.certificate;
      let recruiterSummary: string | undefined;
      let studentSummary: string | undefined;
      if (index < NARRATIVE_TOP_N) {
        const narrative = await this.narratives.summarize({
          roleTitle: resolved.roleTitle,
          companyName: resolved.companyName,
          matchFacts: {
            matchScore: score.matchScore,
            skillCoveragePct: score.skillCoveragePct,
            capabilityCoveragePct: score.capabilityCoveragePct,
            potentialFit: score.potentialFit,
            skillFit: score.skillFit,
            capabilityFit: score.capabilityFit.filter((row) => row.hitScore > 0),
            gaps: score.gapCompetencies,
          },
        });
        recruiterSummary = narrative?.recruiterSummary;
        studentSummary = narrative?.studentSummary;
      }
      candidates.push(
        toCandidateMatchDto({
          score,
          studentName: student.fullName,
          trackCode: parseTrackCode(student.primaryTrackCode ?? undefined),
          certificateId: cert?.id ?? null,
          highestLevelCleared: parseLevel(cert?.highestLevelCleared),
          headlineTier: parseHeadline(cert?.headlineTier),
          verifiedSkills: student.verifiedSkills,
          method,
          recruiterSummary,
          studentSummary,
          competencyEvidenceSummaries: mapStudentCapabilitiesToSummaries(
            explainability.capabilitiesByStudent.get(student.id) ?? [],
          ),
        }),
      );
    }

    await this.publishPlacementMatched({
      shortlistId,
      runId: request.runId,
      jdId: request.jdId,
      institutionId,
      companyName: resolved.companyName,
      roleTitle: resolved.roleTitle,
      studentIds: candidates.map((candidate) => candidate.studentId),
      generatedAt,
      matchMethod: method,
    });

    return ShortlistDtoSchema.parse({
      shortlistId,
      jdId: request.jdId,
      companyName: resolved.companyName,
      roleTitle: resolved.roleTitle,
      generatedAt,
      candidates,
      totalCandidatesConsidered: pool.length,
      eligiblePoolCount: filtered.length,
      candidatesScoredCount,
      matchMethod: method,
      minSkillCoverageApplied: request.minSkillCoverage,
      jobRequirements,
    });
  }

  private async runRulesMatching(
    institutionId: string,
    request: RunMatchingParams,
    resolved: ResolvedOpeningJob,
  ): Promise<ShortlistDto> {
    const ranker = resolved.ranker;
    if (!ranker) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job opening not found.',
        statusCode: 404,
      });
    }
    const rows = await this.prisma.$queryRaw<RawEligibleStudentRow[]>(
      buildEligibleStudentsQuery(institutionId, {
        ...request,
        minCgpa: effectiveMinCgpaForOpening(request, resolved.openingEligibility),
        openingEligibility: resolved.openingEligibility,
      }),
    );
    const students = hydrateStudents(rows);
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

    const ranked = rankCandidates(ranker, pool, request.limit);
    const byId = new Map(filtered.map((student) => [student.id, student]));
    const generatedAt = new Date().toISOString();
    const shortlistId = randomUUID();
    const rankedStudentIds = ranked.map((score) => score.studentId);
    const explainability = await this.loadExplainabilityContext(rankedStudentIds);

    const candidates = ranked.map((score) => {
      const student = byId.get(score.studentId);
      if (!student) {
        throw new Error(`Ranker returned unknown student ${score.studentId}`);
      }
      const cert = student.certificate;
      const verifiedSkillCodes = student.verifiedSkills.map((skill) => skill.code);
      const mergedExplanation = mergeMatchExplainability(
        {
          strongCompetencies: score.strongCompetencies,
          gapCompetencies: score.gapCompetencies,
          why: score.why,
        },
        {
          verifiedSkillCodes,
          capabilityRows: explainability.capabilitiesByStudent.get(student.id) ?? [],
          qlixProjects: explainability.qlixProjectsByStudent.get(student.id) ?? [],
        },
      );
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
          strongCompetencies: mergedExplanation.strongCompetencies,
          gapCompetencies: mergedExplanation.gapCompetencies,
          why: mergedExplanation.why,
          verifiedSkills: mapVerifiedSkillsSummary(student.verifiedSkills),
          competencyEvidenceSummaries: mapStudentCapabilitiesToSummaries(
            explainability.capabilitiesByStudent.get(student.id) ?? [],
          ),
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
      runId: request.runId,
      jdId: request.jdId,
      institutionId,
      companyName: resolved.companyName,
      roleTitle: resolved.roleTitle,
      studentIds: candidates.map((candidate) => candidate.studentId),
      generatedAt,
      matchMethod: 'RULES',
    });

    return ShortlistDtoSchema.parse({
      shortlistId,
      jdId: request.jdId,
      companyName: resolved.companyName,
      roleTitle: resolved.roleTitle,
      generatedAt,
      candidates,
      totalCandidatesConsidered: pool.length,
      eligiblePoolCount: filtered.length,
      matchMethod: 'RULES',
    });
  }

  private async useRulesRanker(institutionId: string): Promise<boolean> {
    const resolved = await this.institutions.resolveInstitutionEntitlements(institutionId);
    return resolved.flags.find((flag) => flag.key === RULES_RANKER_FLAG)?.enabled ?? false;
  }

  private async loadSkillCapabilityEvidence(studentIds: readonly string[]): Promise<{
    competencyResultsByStudent: Map<string, SkillCapabilityCandidate['competencyResults']>;
    inferredByStudent: Map<string, SkillCapabilityCandidate['inferredCapabilities']>;
    qlixByStudent: Map<string, SkillCapabilityCandidate['qlixObservations']>;
  }> {
    const competencyResultsByStudent = new Map<
      string,
      SkillCapabilityCandidate['competencyResults']
    >();
    const inferredByStudent = new Map<string, InferredCapabilityRow[]>();
    const qlixByStudent = new Map<string, QlixCompetencyObservation[]>();

    if (studentIds.length === 0) {
      return { competencyResultsByStudent, inferredByStudent, qlixByStudent };
    }

    const [attempts, inferred, projects] = await Promise.all([
      this.prisma.skillVerificationAttempt.findMany({
        where: {
          passed: true,
          claim: { studentId: { in: [...studentIds] }, status: 'VERIFIED' },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          assessmentResultJson: true,
          claim: { select: { studentId: true } },
        },
      }),
      this.prisma.studentCapability.findMany({
        where: {
          studentId: { in: [...studentIds] },
          OR: [{ projectId: null }, { project: { isActive: true } }],
        },
        select: {
          studentId: true,
          capabilityLabel: true,
          skillCode: true,
          confidenceScore: true,
          assessmentVerified: true,
        },
      }),
      this.prisma.project.findMany({
        where: {
          studentId: { in: [...studentIds] },
          isActive: true,
          qlixCheckResult: { isNot: null },
        },
        include: { qlixCheckResult: { select: { smartAssessmentJson: true } } },
      }),
    ]);

    const competencyStatusRank = (status: CompetencyStatus): number => {
      switch (status) {
        case 'DEMONSTRATED':
          return 4;
        case 'PARTIALLY_DEMONSTRATED':
          return 3;
        case 'UNCERTAIN':
          return 2;
        case 'NOT_DEMONSTRATED':
          return 1;
        default:
          return 0;
      }
    };

    const mergedByStudent = new Map<
      string,
      Map<string, { competencyId: string; status: CompetencyStatus }>
    >();

    for (const attempt of attempts) {
      const studentId = attempt.claim.studentId;
      const parsed = AssessmentResultSchema.safeParse(attempt.assessmentResultJson);
      if (!parsed.success) continue;
      const byCompetency = mergedByStudent.get(studentId) ?? new Map();
      for (const row of parsed.data.competencyResults) {
        const existing = byCompetency.get(row.competencyId);
        if (!existing || competencyStatusRank(row.status) > competencyStatusRank(existing.status)) {
          byCompetency.set(row.competencyId, {
            competencyId: row.competencyId,
            status: row.status,
          });
        }
      }
      mergedByStudent.set(studentId, byCompetency);
    }

    for (const [studentId, byCompetency] of mergedByStudent) {
      competencyResultsByStudent.set(studentId, [...byCompetency.values()]);
    }

    for (const row of inferred) {
      const bucket = inferredByStudent.get(row.studentId) ?? [];
      bucket.push({
        capabilityLabel: row.capabilityLabel,
        skillCode: row.skillCode,
        confidenceScore: row.confidenceScore,
        assessmentVerified: row.assessmentVerified,
      });
      inferredByStudent.set(row.studentId, bucket);
    }

    for (const project of projects) {
      const parsed = QlixSmartAssessmentSchema.safeParse(
        project.qlixCheckResult?.smartAssessmentJson,
      );
      if (!parsed.success) continue;
      const bucket = qlixByStudent.get(project.studentId) ?? [];
      for (const obs of parsed.data.competencyObservations ?? []) {
        bucket.push({
          competencyId: obs.competencyId,
          status: obs.status,
        });
      }
      qlixByStudent.set(project.studentId, bucket);
    }

    return { competencyResultsByStudent, inferredByStudent, qlixByStudent };
  }

  private async publishPlacementMatched(params: {
    shortlistId: string;
    runId?: string;
    jdId: string;
    institutionId: string;
    companyName: string;
    roleTitle: string;
    studentIds: string[];
    generatedAt: string;
    matchMethod: MatchMethod;
  }): Promise<void> {
    const data = PlacementMatchedDataSchema.parse({
      shortlistId: params.shortlistId,
      ...(params.runId ? { runId: params.runId } : {}),
      jdId: params.jdId,
      institutionId: params.institutionId,
      companyName: params.companyName,
      roleTitle: params.roleTitle,
      matchedCount: params.studentIds.length,
      matchMethod: params.matchMethod,
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

  private async loadExplainabilityContext(studentIds: readonly string[]): Promise<{
    capabilitiesByStudent: Map<
      string,
      Array<{
        capabilityLabel: string;
        skillCode: string | null;
        assessmentVerified: boolean;
        confidenceScore: number;
        proficiency: string;
        evidenceRefs: string[];
      }>
    >;
    qlixProjectsByStudent: Map<string, QlixProjectExplainability[]>;
  }> {
    const capabilitiesByStudent = new Map<
      string,
      Array<{
        capabilityLabel: string;
        skillCode: string | null;
        assessmentVerified: boolean;
        confidenceScore: number;
        proficiency: string;
        evidenceRefs: string[];
      }>
    >();
    const qlixProjectsByStudent = new Map<string, QlixProjectExplainability[]>();

    if (studentIds.length === 0) {
      return { capabilitiesByStudent, qlixProjectsByStudent };
    }

    const [capabilities, projects] = await Promise.all([
      this.prisma.studentCapability.findMany({
        where: {
          studentId: { in: [...studentIds] },
          OR: [{ projectId: null }, { project: { isActive: true } }],
        },
        select: {
          studentId: true,
          capabilityLabel: true,
          skillCode: true,
          assessmentVerified: true,
          confidenceScore: true,
          proficiency: true,
          evidenceRefs: true,
        },
      }),
      this.prisma.project.findMany({
        where: {
          studentId: { in: [...studentIds] },
          isActive: true,
          qlixCheckResult: { isNot: null },
        },
        include: {
          skillMappings: { select: { skillCode: true } },
          qlixCheckResult: {
            select: {
              gaps: true,
              smartAssessmentJson: true,
            },
          },
        },
      }),
    ]);

    for (const row of capabilities) {
      const bucket = capabilitiesByStudent.get(row.studentId) ?? [];
      bucket.push({
        capabilityLabel: row.capabilityLabel,
        skillCode: row.skillCode,
        assessmentVerified: row.assessmentVerified,
        confidenceScore: row.confidenceScore,
        proficiency: row.proficiency,
        evidenceRefs: row.evidenceRefs,
      });
      capabilitiesByStudent.set(row.studentId, bucket);
    }

    for (const project of projects) {
      if (!project.qlixCheckResult) continue;
      const bucket = qlixProjectsByStudent.get(project.studentId) ?? [];
      bucket.push({
        skillCodes: project.skillMappings.map((mapping) => mapping.skillCode),
        gaps: project.qlixCheckResult.gaps,
        smartAssessmentJson: project.qlixCheckResult.smartAssessmentJson,
      });
      qlixProjectsByStudent.set(project.studentId, bucket);
    }

    return { capabilitiesByStudent, qlixProjectsByStudent };
  }

  private async resolveOpeningJob(
    institutionId: string,
    jdId: string,
  ): Promise<ResolvedOpeningJob> {
    const opening = await this.prisma.jobOpening.findFirst({
      where: { id: jdId, institutionId },
      include: {
        requiredSkills: { include: { skill: { select: { code: true, domain: true } } } },
      },
    });
    if (opening) {
      const openingEligibility: JobOpeningEligibilityCriteria = {
        minSscPercentage: opening.minSscPercentage ? Number(opening.minSscPercentage) : undefined,
        minHscPercentage: opening.minHscPercentage ? Number(opening.minHscPercentage) : undefined,
        minCollegePercentage: opening.minCollegePercentage
          ? Number(opening.minCollegePercentage)
          : undefined,
        backlogsAllowed: opening.backlogsAllowed,
      };
      const requiredSkills = opening.requiredSkills.map((row) => ({
        skillCode: row.skill.code,
        minProficiency: row.minProficiency,
      }));
      const skillCapabilityJob = buildSkillCapabilityJob({
        requiredSkills,
        parsedRequirements: opening.parsedRequirements,
      });
      return {
        companyName: opening.companyName,
        roleTitle: opening.roleTitle,
        openingEligibility,
        skillCapabilityJob,
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
      .map((code) => ({
        skillCode: code,
        minProficiency: 'BEGINNER' as const,
      }));
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
      skillCapabilityJob: buildSkillCapabilityJob({ requiredSkills }),
      ranker: {
        requiredSkills: requiredSkills.map((skill) => ({
          code: skill.skillCode,
          minRank: RULES_PROFICIENCY_RANK.BEGINNER,
        })),
        domainCode: 'SOFTWARE_IT',
        minYearsExperience: null,
        maxYearsExperience: null,
        location: null,
      },
    };
  }

  async recordMatchFeedback(
    userId: string,
    targetType: 'STUDENT' | 'EMPLOYER',
    body: SubmitMatchFeedbackRequest,
  ): Promise<MatchFeedbackResponse> {
    const feedback = await this.prisma.matchFeedback.create({
      data: {
        userId,
        targetType,
        openingId: body.openingId,
        studentId: body.studentId,
        runId: body.runId,
        rating: body.rating,
        feedbackText: body.feedbackText,
        irrelevantReasons: body.irrelevantReasons ?? [],
      },
    });

    return {
      feedbackId: feedback.id,
      submittedAt: feedback.createdAt.toISOString(),
      status: 'RECORDED',
    };
  }

  async getMatchFeedbackSummary(filters?: {
    openingId?: string;
    targetType?: 'STUDENT' | 'EMPLOYER';
  }): Promise<MatchFeedbackSummaryDto> {
    const where: Prisma.MatchFeedbackWhereInput = {};
    if (filters?.openingId) {
      where.openingId = filters.openingId;
    }
    if (filters?.targetType) {
      where.targetType = filters.targetType;
    }

    const feedbacks = await this.prisma.matchFeedback.findMany({
      where,
      select: {
        rating: true,
        irrelevantReasons: true,
      },
    });

    const ratingBreakdown = {
      EXCELLENT: 0,
      RELEVANT: 0,
      PARTIALLY_RELEVANT: 0,
      NOT_RELEVANT: 0,
      POOR: 0,
    };

    const reasonCountMap: Record<string, number> = {};

    let relevantCount = 0;
    let notRelevantCount = 0;

    for (const fb of feedbacks) {
      const rating = fb.rating as keyof typeof ratingBreakdown;
      if (ratingBreakdown[rating] !== undefined) {
        ratingBreakdown[rating]++;
      }
      if (rating === 'EXCELLENT' || rating === 'RELEVANT') {
        relevantCount++;
      } else if (rating === 'NOT_RELEVANT' || rating === 'POOR') {
        notRelevantCount++;
      }

      if (Array.isArray(fb.irrelevantReasons)) {
        for (const reason of fb.irrelevantReasons) {
          const reasonStr = String(reason).trim();
          if (reasonStr) {
            reasonCountMap[reasonStr] = (reasonCountMap[reasonStr] ?? 0) + 1;
          }
        }
      }
    }

    const totalFeedbacks = feedbacks.length;
    const satisfactionRate =
      totalFeedbacks > 0
        ? Math.round(
            ((relevantCount + ratingBreakdown.PARTIALLY_RELEVANT * 0.5) / totalFeedbacks) * 100,
          ) / 100
        : 1.0;

    const commonIrrelevantReasons = Object.entries(reasonCountMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalFeedbacks,
      relevantCount,
      notRelevantCount,
      satisfactionRate,
      ratingBreakdown,
      commonIrrelevantReasons,
    };
  }

  async listSavedCandidates(userId: string): Promise<ListSavedCandidatesResponse> {
    const saved = await this.prisma.savedCandidate.findMany({
      where: { savedBy: userId },
      orderBy: { savedAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            primaryTrack: { select: { code: true } },
            certificates: {
              where: { status: 'ISSUED' },
              orderBy: { issuedAt: 'desc' },
              take: 1,
              select: { highestLevelCleared: true, headlineTier: true },
            },
          },
        },
      },
    });

    return {
      savedCandidates: saved.map((row) => ({
        id: row.id,
        savedBy: row.savedBy,
        studentId: row.studentId,
        openingId: row.openingId,
        note: row.note,
        savedAt: row.savedAt.toISOString(),
        student: row.student
          ? {
              id: row.student.id,
              fullName: row.student.fullName,
              email: row.student.email,
              primaryTrackCode: row.student.primaryTrack?.code
                ? parseTrackCode(row.student.primaryTrack.code)
                : undefined,
              highestLevelCleared: parseLevel(row.student.certificates[0]?.highestLevelCleared),
              headlineTier: parseHeadline(row.student.certificates[0]?.headlineTier),
            }
          : undefined,
      })),
      total: saved.length,
    };
  }

  async saveCandidate(userId: string, body: SaveCandidateRequest): Promise<SavedCandidateDto> {
    const include = {
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    } as const;

    let record;
    if (body.openingId) {
      record = await this.prisma.savedCandidate.upsert({
        where: {
          savedBy_studentId_openingId: {
            savedBy: userId,
            studentId: body.studentId,
            openingId: body.openingId,
          },
        },
        update: { note: body.note },
        create: {
          savedBy: userId,
          studentId: body.studentId,
          openingId: body.openingId,
          note: body.note,
        },
        include,
      });
    } else {
      const existing = await this.prisma.savedCandidate.findFirst({
        where: { savedBy: userId, studentId: body.studentId, openingId: null },
      });
      record = existing
        ? await this.prisma.savedCandidate.update({
            where: { id: existing.id },
            data: { note: body.note },
            include,
          })
        : await this.prisma.savedCandidate.create({
            data: {
              savedBy: userId,
              studentId: body.studentId,
              openingId: null,
              note: body.note,
            },
            include,
          });
    }

    return {
      id: record.id,
      savedBy: record.savedBy,
      studentId: record.studentId,
      openingId: record.openingId,
      note: record.note,
      savedAt: record.savedAt.toISOString(),
      student: record.student
        ? {
            id: record.student.id,
            fullName: record.student.fullName,
            email: record.student.email,
          }
        : undefined,
    };
  }

  async removeSavedCandidate(userId: string, studentId: string): Promise<{ success: boolean }> {
    await this.prisma.savedCandidate.deleteMany({
      where: {
        savedBy: userId,
        studentId,
      },
    });
    return { success: true };
  }

  async searchStudents(
    user: RequestUser,
    query: SearchStudentsQuery,
  ): Promise<CandidateMatchDto[]> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`u.role = 'STUDENT'`,
      Prisma.sql`u.profile_visible = TRUE`,
      // I402 / S6-VV-113 — deactivated, held or opted-out students never appear in employer search.
      EMPLOYER_DISCOVERABLE_STUDENT_SQL,
    ];

    if (user.inst) {
      conditions.push(Prisma.sql`u.institution_id = ${user.inst}::uuid`);
    }

    if (query.university?.trim()) {
      const uPattern = `%${query.university.trim()}%`;
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM institutions inst
          WHERE inst.id = u.institution_id
            AND (inst.name ILIKE ${uPattern} OR inst.domain ILIKE ${uPattern})
        )`,
      );
    }

    if (query.gradYear && query.gradYear !== 'Any Year') {
      const year = parseInt(query.gradYear, 10);
      if (!Number.isNaN(year)) {
        conditions.push(Prisma.sql`u.graduation_year = ${year}`);
      }
    }

    if (query.availability && query.availability !== 'Any Availability') {
      const avail = query.availability.trim().toLowerCase();
      if (avail.includes('immediate')) {
        const currentYear = new Date().getFullYear();
        conditions.push(
          Prisma.sql`(u.graduation_year <= ${currentYear} OR u.onboarding_details->'jobPreferences'->>'availability' ILIKE '%immediate%')`,
        );
      } else if (avail.includes('1 month')) {
        conditions.push(
          Prisma.sql`(u.onboarding_details->'jobPreferences'->>'availability' ILIKE '%1 month%' OR u.onboarding_details->'jobPreferences'->>'availability' ILIKE '%immediate%')`,
        );
      } else {
        const aPattern = `%${query.availability.trim()}%`;
        conditions.push(
          Prisma.sql`(u.onboarding_details->'jobPreferences'->>'availability' ILIKE ${aPattern})`,
        );
      }
    }

    if (query.minLevel && query.minLevel !== 'Any Level') {
      const levelMatch = query.minLevel.match(/\d+/);
      if (levelMatch) {
        const minLvl = parseInt(levelMatch[0], 10);
        conditions.push(Prisma.sql`c.highest_level_cleared >= ${minLvl}`);
      }
    }

    if (query.skillCode?.trim()) {
      const sPattern = `%${query.skillCode.trim()}%`;
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM skill_claims sc_req
        JOIN skills sk_req ON sk_req.id = sc_req.skill_id
        WHERE sc_req.student_id = u.id AND sc_req.status = 'VERIFIED'
          AND (sk_req.code ILIKE ${sPattern} OR sk_req.name ILIKE ${sPattern})
      )`);
    }

    if (query.verificationType && query.verificationType !== 'all') {
      const vType = query.verificationType.toLowerCase().replace(/\s+/g, '_');
      if (vType.includes('project') || vType.includes('defense') || vType === 'ai_defense') {
        // A defended project is one whose verification settled as VERIFIED.
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1 FROM projects p_def
          WHERE p_def.student_id = u.id AND p_def.status = 'VERIFIED'
        )`);
      } else if (vType.includes('endors') || vType.includes('experience')) {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1 FROM work_experience_manager_endorsements weme
          JOIN work_experiences we ON we.id = weme.experience_id
          WHERE we.student_id = u.id AND weme.status = 'CONFIRMED'
        )`);
      } else if (vType.includes('cert')) {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1 FROM candidate_certificates cc
          WHERE cc.candidate_id = u.id AND cc.status = 'VERIFIED'
        )`);
      } else if (vType === 'diagnostic' || vType === 'direct') {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1 FROM skill_verification_attempts sva
          WHERE sva.student_id = u.id AND sva.passed = TRUE
        )`);
      }
    }

    if (query.scopedJobId?.trim()) {
      const scopedOpeningId = query.scopedJobId.trim();
      // Never resurface a candidate who already rejected the scoped opening.
      conditions.push(Prisma.sql`NOT EXISTS (
        SELECT 1 FROM applications a_scoped
        WHERE a_scoped.student_id = u.id
          AND a_scoped.opening_id = ${scopedOpeningId}::uuid
          AND a_scoped.stage IN ('REJECTED', 'OFFER_DECLINED')
      )`);
      // I404 — job-relevant scoping: keep candidates with at least one verified skill
      // the opening requires (openings with no declared skills match everyone).
      conditions.push(Prisma.sql`(
        NOT EXISTS (
          SELECT 1 FROM job_opening_skills jos_req
          WHERE jos_req.opening_id = ${scopedOpeningId}::uuid
        )
        OR EXISTS (
          SELECT 1 FROM job_opening_skills jos_req
          JOIN skill_claims sc_scoped ON sc_scoped.skill_id = jos_req.skill_id
            AND sc_scoped.student_id = u.id AND sc_scoped.status = 'VERIFIED'
          WHERE jos_req.opening_id = ${scopedOpeningId}::uuid
        )
      )`);
    }

    if (query.q?.trim()) {
      const qPattern = `%${query.q.trim()}%`;
      conditions.push(
        Prisma.sql`(u.full_name ILIKE ${qPattern} OR t.code ILIKE ${qPattern} OR t.name ILIKE ${qPattern})`,
      );
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        fullName: string;
        primaryTrackCode: string | null;
        certificateId: string | null;
        highestLevelCleared: number | null;
        headlineTier: string | null;
        skills: Array<{ code: string; domain?: string; proficiency?: string }> | null;
      }>
    >(Prisma.sql`
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
        SELECT json_agg(json_build_object(
          'code', sk.code,
          'domain', sk.domain,
          'proficiency', COALESCE(sc.final_proficiency::text, sc.proficiency::text)
        )) AS skills
        FROM skill_claims sc
        JOIN skills sk ON sk.id = sc.skill_id
        WHERE sc.student_id = u.id
          AND sc.status = 'VERIFIED'
          AND (sc.verified_until IS NULL OR sc.verified_until > NOW())
      ) sc_agg ON true
      WHERE ${Prisma.join(conditions, ' AND ')}
      LIMIT 100
    `);

    return rows.map((r) => {
      const highestLevel = (r.highestLevelCleared ?? 1) as LevelNumber;
      const tier = (r.headlineTier as CertifiableTier) || 'BRONZE';
      const verified = (r.skills ?? []).map((s) => ({
        skillCode: s.code,
      }));
      return CandidateMatchDtoSchema.parse({
        studentId: r.id,
        studentName: r.fullName,
        trackCode: r.primaryTrackCode || 'TECH_BACKEND',
        certificateId: r.certificateId,
        highestLevelCleared: highestLevel,
        headlineTier: tier,
        similarityScore: 0,
        matchScore: 0.85,
        method: 'RULES',
        explanation: {
          thresholdsMet: [],
          thresholdsMissed: [],
          strongCompetencies: verified.slice(0, 3).map((v) => v.skillCode),
          gapCompetencies: [],
          why: `Verified ${r.primaryTrackCode || 'technology'} specialist with Level ${highestLevel} credentials.`,
          verifiedSkills: verified,
        },
      });
    });
  }
}

interface ResolvedOpeningJob {
  companyName: string;
  roleTitle: string;
  openingEligibility?: JobOpeningEligibilityCriteria;
  skillCapabilityJob: SkillCapabilityJob;
  ranker: RankerJob;
}

function hydrateStudents(rows: RawEligibleStudentRow[]): HydratedStudent[] {
  return rows.map((row) => ({
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
