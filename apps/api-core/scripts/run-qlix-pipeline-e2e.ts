/**
 * One-shot E2E runner: QLIX verify → capability inference → matching → recalibration.
 * Usage: pnpm --filter @smart/api-core exec tsx scripts/run-qlix-pipeline-e2e.ts
 */
import 'reflect-metadata';
import '../src/platform/config/load-dotenv.bootstrap.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { CapabilityInferenceService } from '../src/modules/evaluation/capability-inference.service.js';
import { ProjectVerifyRunnerService } from '../src/modules/evaluation/project-verify-runner.service.js';
import { QlixPollService } from '../src/modules/evaluation/qlix-poll.service.js';
import { QlixRecalibrationService } from '../src/modules/evaluation/qlix-recalibration.service.js';
import { MatchingService } from '../src/modules/matching/matching.service.js';
import { PlacementService } from '../src/modules/placement/placement.service.js';
import { PrismaService } from '../src/platform/prisma/prisma.service.js';

/** VerifiAI — known-good GitHub snapshot on this laptop (Ram9012/VerifiAI). */
const PROJECT_ID = '7cf5e6c9-621d-4dae-a94b-0053f952d890';
const STUDENT_ID = 'b9fe13ea-bb6a-47e1-9f5c-d7cb9bcf8eb4';
const INSTITUTION_ID = 'd6429aed-cc96-45b5-a339-b7eecc91870f';
const PRIMARY_SKILL = 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING';
const POLL_MS = 15_000;
const MAX_WAIT_MS = 25 * 60_000;

function log(step: string, detail: unknown): void {
  console.log(`\n=== ${step} ===`);
  console.log(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetProject(prisma: PrismaService): Promise<void> {
  await prisma.studentCapability.deleteMany({ where: { projectId: PROJECT_ID } });
  await prisma.qlixCheckResult.deleteMany({ where: { projectId: PROJECT_ID } });
  await prisma.projectVerificationReport.deleteMany({ where: { projectId: PROJECT_ID } });
  await prisma.projectSkillMapping.deleteMany({
    where: { projectId: PROJECT_ID, skillCode: { not: PRIMARY_SKILL } },
  });
  await prisma.projectSkillMapping.updateMany({
    where: { projectId: PROJECT_ID },
    data: {
      skillCode: PRIMARY_SKILL,
      specificContribution:
        'Built PyTorch training loops, exported ONNX graphs, and documented model evaluation metrics for a CNN-based route ETA predictor.',
      componentWorkedOn: 'model training and export pipeline',
      actionsPerformed: ['Implemented DataLoader', 'Trained CNN', 'Exported ONNX'],
      decisionsMade: ['Chose ResNet18 over custom CNN for stability'],
      constraintsHandled: ['Limited GPU memory on training laptop'],
    },
  });
  const mappingCount = await prisma.projectSkillMapping.count({ where: { projectId: PROJECT_ID } });
  if (mappingCount === 0) {
    await prisma.projectSkillMapping.create({
      data: {
        projectId: PROJECT_ID,
        skillCode: PRIMARY_SKILL,
        specificContribution:
          'Built PyTorch training loops, exported ONNX graphs, and documented model evaluation metrics for a CNN-based route ETA predictor.',
        componentWorkedOn: 'model training and export pipeline',
        actionsPerformed: ['Implemented DataLoader', 'Trained CNN', 'Exported ONNX'],
        decisionsMade: ['Chose ResNet18 over custom CNN for stability'],
        constraintsHandled: ['Limited GPU memory on training laptop'],
      },
    });
  }
  await prisma.project.update({
    where: { id: PROJECT_ID },
    data: { status: 'SUBMITTED', qlixCheckId: null, snapshotSha: null },
  });
}

async function driveQlixPoll(
  prisma: PrismaService,
  pollService: QlixPollService,
  studentId: string,
): Promise<void> {
  const started = Date.now();
  let startedAtMs = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    const qlix = await prisma.qlixCheckResult.findUnique({ where: { projectId: PROJECT_ID } });
    const report = await prisma.projectVerificationReport.findUnique({
      where: { projectId: PROJECT_ID },
    });
    if (report && qlix) {
      log('QLIX poll complete', {
        reportScore: report.score,
        qlixStatus: qlix.status,
        ceiling: qlix.appliedProficiencyCeiling,
        gaps: qlix.gaps,
        analyzedTokens: qlix.analyzedTokens,
        similarity: qlix.similarityIndex,
      });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: PROJECT_ID },
      select: { qlixCheckId: true, status: true },
    });
    if (project?.qlixCheckId) {
      await pollService.handlePoll({
        projectId: PROJECT_ID,
        studentId,
        checkId: project.qlixCheckId,
        startedAtMs,
      });
    }

    log('Waiting for QLIX', {
      elapsedSec: Math.round((Date.now() - started) / 1000),
      qlixCheckId: project?.qlixCheckId,
      status: project?.status,
      hasReport: Boolean(report),
    });
    await sleep(POLL_MS);
  }
  throw new Error('Timed out waiting for QLIX verification');
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const verifyRunner = app.get(ProjectVerifyRunnerService);
  const pollService = app.get(QlixPollService);
  const capabilityInference = app.get(CapabilityInferenceService);
  const matching = app.get(MatchingService);
  const placement = app.get(PlacementService);
  const recalibration = app.get(QlixRecalibrationService);

  try {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: PROJECT_ID },
      select: { title: true, githubUrl: true, studentId: true },
    });
    log('Project under test', project);

    await resetProject(prisma);
    log(
      'Reset',
      'Cleared prior verify/QLIX rows; primary skill set to DEEP_LEARNING (verified claim).',
    );

    await verifyRunner.runForProject(PROJECT_ID, STUDENT_ID);
    log('Verify runner', 'Submitted to QLIX; BullMQ poll queue should be processing.');

    await driveQlixPoll(prisma, pollService, STUDENT_ID);

    const inferred = await capabilityInference.inferForProject(PROJECT_ID, STUDENT_ID);
    const capabilities = await prisma.studentCapability.findMany({
      where: { projectId: PROJECT_ID },
    });
    log('Capability inference', { inferredCount: inferred, capabilities });

    const opening = await placement.createOpening(INSTITUTION_ID, STUDENT_ID, {
      companyName: 'Pipeline Test Co',
      roleTitle: 'ML Engineer',
      domain: 'SOFTWARE_IT',
      requiredSkills: [{ skillCode: PRIMARY_SKILL, minProficiency: 'INTERMEDIATE' }],
      minYearsExperience: 0,
      maxYearsExperience: 3,
      location: 'Remote',
      employmentType: 'FULL_TIME',
      headcount: 1,
    });
    log('Job opening created', { openingId: opening.openingId });

    const shortlist = await matching.match(INSTITUTION_ID, { jdId: opening.openingId, limit: 10 });
    const candidate = shortlist.candidates.find((c) => c.studentId === STUDENT_ID);
    log('Matching explainability', {
      totalCandidates: shortlist.candidates.length,
      studentMatch: candidate
        ? {
            matchScore: candidate.matchScore,
            strongCompetencies: candidate.explanation.strongCompetencies,
            gapCompetencies: candidate.explanation.gapCompetencies,
            why: candidate.explanation.why,
          }
        : null,
    });

    const outcome = await placement.recordOutcome(INSTITUTION_ID, {
      studentId: STUDENT_ID,
      trackCode: 'TECH_FULLSTACK',
      placementCycle: '2026-AUTUMN',
      companyName: 'Pipeline Test Co',
      outcome: 'OFFERED',
      interviewOffered: true,
      jobOffered: true,
      offeredPackageLpa: 14,
    });
    log('Placement outcome recorded', outcome);

    const recalReport = await recalibration.runBatch();
    log('Recalibration batch', recalReport);

    log('DONE', 'Full pipeline executed against live stack.');
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
