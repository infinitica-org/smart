/**
 * Seeds a small verified-skill cohort + job opening, then runs the matching engine (sync + async).
 *
 * Prerequisites:
 *   - Postgres (and Redis for async match-run queue) per local `.env`
 *   - Base taxonomy seed: `pnpm db:seed`
 *
 * Usage:
 *   pnpm --filter @smart/api-core match:e2e
 */
import 'reflect-metadata';
import '../src/platform/config/load-dotenv.bootstrap.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { MatchingService } from '../src/modules/matching/matching.service.js';
import { PlacementService } from '../src/modules/placement/placement.service.js';
import {
  resolveSeedEmailDomain,
  resolveSeedPassword,
  resolveSeedTpoFullName,
  seedAccountEmails,
} from '../src/platform/prisma/seed-accounts.js';
import { PrismaService } from '../src/platform/prisma/prisma.service.js';

const DEMO_COMPANY = 'Match E2E Demo Co';
const DEMO_ROLE = 'Backend Engineer (match e2e)';

type DemoStudent = {
  email: string;
  fullName: string;
  skills: Array<{ code: string; proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' }>;
};

const DEMO_STUDENTS: DemoStudent[] = [
  {
    email: 'match-full@demo.local',
    fullName: 'Match Demo Full',
    skills: [
      { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', proficiency: 'INTERMEDIATE' },
      { code: 'SQL_QUERY_OPTIMIZATION', proficiency: 'BEGINNER' },
      { code: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION', proficiency: 'BEGINNER' },
    ],
  },
  {
    email: 'match-strong-partial@demo.local',
    fullName: 'Match Demo Strong Partial',
    skills: [
      { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', proficiency: 'ADVANCED' },
      { code: 'SQL_QUERY_OPTIMIZATION', proficiency: 'BEGINNER' },
    ],
  },
  {
    email: 'match-thin@demo.local',
    fullName: 'Match Demo Thin',
    skills: [{ code: 'SQL_QUERY_OPTIMIZATION', proficiency: 'BEGINNER' }],
  },
  {
    email: 'match-unrelated@demo.local',
    fullName: 'Match Demo Unrelated',
    skills: [{ code: 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING', proficiency: 'INTERMEDIATE' }],
  },
];

const OPENING_SKILLS = [
  {
    skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' as const,
    minProficiency: 'INTERMEDIATE' as const,
  },
  { skillCode: 'SQL_QUERY_OPTIMIZATION' as const, minProficiency: 'BEGINNER' as const },
  {
    skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION' as const,
    minProficiency: 'BEGINNER' as const,
  },
];

function log(title: string, detail: unknown): void {
  console.log(`\n=== ${title} ===`);
  console.log(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
}

async function upsertVerifiedSkills(
  prisma: PrismaService,
  studentId: string,
  skills: DemoStudent['skills'],
): Promise<void> {
  for (const row of skills) {
    const skill = await prisma.skill.findUniqueOrThrow({ where: { code: row.code } });
    await prisma.skillClaim.upsert({
      where: { studentId_skillId: { studentId, skillId: skill.id } },
      update: {
        status: 'VERIFIED',
        proficiency: row.proficiency,
        finalProficiency: row.proficiency,
        verifiedUntil: null,
      },
      create: {
        studentId,
        skillId: skill.id,
        status: 'VERIFIED',
        proficiency: row.proficiency,
        finalProficiency: row.proficiency,
        source: 'MANUAL',
      },
    });
  }
}

async function seedDemoCohort(prisma: PrismaService): Promise<{
  institutionId: string;
  tpoId: string;
  batchId: string;
}> {
  const domain = resolveSeedEmailDomain();
  const emails = seedAccountEmails(domain);
  const passwordHash = await hashPassword(resolveSeedPassword());

  const institution = await prisma.institution.findFirstOrThrow({
    where: { domain },
  });
  const fullstack = await prisma.track.findUniqueOrThrow({ where: { code: 'TECH_FULLSTACK' } });

  const tpo = await prisma.user.upsert({
    where: { email: emails.tpo },
    update: { passwordHash, institutionId: institution.id },
    create: {
      email: emails.tpo,
      fullName: resolveSeedTpoFullName(),
      passwordHash,
      role: 'INSTITUTION_ADMIN',
      emailVerified: true,
      institutionId: institution.id,
    },
  });

  const batch = await prisma.batch.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: 'Match E2E Batch' } },
    update: {},
    create: {
      institutionId: institution.id,
      name: 'Match E2E Batch',
      code: 'MATCH-E2E',
      createdById: tpo.id,
    },
  });

  for (const demo of DEMO_STUDENTS) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        fullName: demo.fullName,
        passwordHash,
        institutionId: institution.id,
        batchId: batch.id,
        primaryTrackId: fullstack.id,
      },
      create: {
        email: demo.email,
        fullName: demo.fullName,
        passwordHash,
        role: 'STUDENT',
        emailVerified: true,
        institutionId: institution.id,
        batchId: batch.id,
        primaryTrackId: fullstack.id,
      },
    });
    await upsertVerifiedSkills(prisma, user.id, demo.skills);
  }

  const pilot = await prisma.user.findUnique({ where: { email: emails.student } });
  if (pilot) {
    await prisma.user.update({
      where: { id: pilot.id },
      data: { batchId: batch.id },
    });
    await upsertVerifiedSkills(prisma, pilot.id, [
      { code: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT', proficiency: 'INTERMEDIATE' },
      { code: 'SQL_QUERY_OPTIMIZATION', proficiency: 'BEGINNER' },
    ]);
  }

  return { institutionId: institution.id, tpoId: tpo.id, batchId: batch.id };
}

async function ensureDemoOpening(
  prisma: PrismaService,
  placement: PlacementService,
  institutionId: string,
  tpoId: string,
): Promise<string> {
  const existing = await prisma.jobOpening.findFirst({
    where: { institutionId, companyName: DEMO_COMPANY, roleTitle: DEMO_ROLE },
    select: { id: true },
  });
  if (existing) return existing.id;

  const opening = await placement.createOpening(institutionId, tpoId, {
    companyName: DEMO_COMPANY,
    roleTitle: DEMO_ROLE,
    domain: 'SOFTWARE_IT',
    requiredSkills: [...OPENING_SKILLS],
    minYearsExperience: 0,
    maxYearsExperience: 5,
    location: 'Remote',
    employmentType: 'FULL_TIME',
    headcount: 3,
  });
  return opening.openingId;
}

function summarizeShortlist(shortlist: Awaited<ReturnType<MatchingService['match']>>): unknown {
  return {
    jdId: shortlist.jdId,
    eligiblePoolCount: shortlist.eligiblePoolCount,
    candidatesScoredCount: shortlist.candidatesScoredCount,
    returned: shortlist.candidates.length,
    matchMethod: shortlist.matchMethod,
    ranking: shortlist.candidates.map((row, index) => ({
      rank: index + 1,
      studentName: row.studentName,
      matchScore: row.matchScore,
      potentialFit: row.explanation.potentialFit,
      held: row.explanation.requiredSkillsHeld,
      missing: row.explanation.requiredSkillsMissing,
      why: row.explanation.why,
      transferSkills: row.explanation.transferSkills?.map((skill) => skill.skillName) ?? [],
    })),
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const matching = app.get(MatchingService);
  const placement = app.get(PlacementService);

  try {
    const { institutionId, tpoId, batchId } = await seedDemoCohort(prisma);
    log('Seeded cohort', {
      institutionId,
      batchId,
      students: DEMO_STUDENTS.map((row) => row.email),
      pilotStudent: `student@${resolveSeedEmailDomain()} (2 verified skills, same batch)`,
    });

    const openingId = await ensureDemoOpening(prisma, placement, institutionId, tpoId);
    log('Job opening', { openingId, requiredSkills: OPENING_SKILLS });

    const syncShortlist = await matching.match(institutionId, {
      jdId: openingId,
      batchIds: [batchId],
      limit: 20,
    });
    log('Sync match (POST /placement/match)', summarizeShortlist(syncShortlist));

    const run = await matching.createMatchRun(institutionId, tpoId, {
      jdId: openingId,
      batchIds: [batchId],
      limit: 20,
    });
    await matching.runMatchRun(run.runId);
    const asyncRun = await matching.getMatchRun(institutionId, run.runId);
    log('Async match run', {
      runId: run.runId,
      status: asyncRun.status,
      eligiblePoolCount: asyncRun.eligiblePoolCount,
      suggestedCount: asyncRun.suggestedCount,
      shortlist: asyncRun.shortlist ? summarizeShortlist(asyncRun.shortlist) : null,
    });
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
