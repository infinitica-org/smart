/** Finish Phase 4 steps after main pipeline (certificate seed + outcome + recalibration). */
import 'reflect-metadata';
import '../src/platform/config/load-dotenv.bootstrap.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { QlixRecalibrationService } from '../src/modules/evaluation/qlix-recalibration.service.js';
import { PlacementService } from '../src/modules/placement/placement.service.js';
import { PrismaService } from '../src/platform/prisma/prisma.service.js';

const STUDENT_ID = 'b9fe13ea-bb6a-47e1-9f5c-d7cb9bcf8eb4';
const INSTITUTION_ID = 'd6429aed-cc96-45b5-a339-b7eecc91870f';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const placement = app.get(PlacementService);
  const recalibration = app.get(QlixRecalibrationService);

  try {
    const existing = await prisma.certificate.findFirst({
      where: { userId: STUDENT_ID, status: 'ISSUED' },
    });
    if (!existing) {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: STUDENT_ID },
        select: { primaryTrackId: true },
      });
      if (!user.primaryTrackId) throw new Error('Student has no primary track');
      await prisma.certificate.create({
        data: {
          userId: STUDENT_ID,
          trackId: user.primaryTrackId,
          highestLevelCleared: 3,
          headlineTier: 'SILVER',
          tierTrail: [],
          status: 'ISSUED',
          verificationSlug: `e2e-${Date.now()}`,
          issuedAt: new Date(),
        },
      });
      console.log('Seeded ISSUED certificate for E2E');
    }

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
    console.log('\n=== Placement outcome ===\n', JSON.stringify(outcome, null, 2));

    const recalReport = await recalibration.runBatch();
    console.log('\n=== Recalibration ===\n', JSON.stringify(recalReport, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
