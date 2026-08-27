import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEVEL_DEFINITIONS, TRACK_DEFINITIONS } from '@smart/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';

const DATA_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../tools/content-pipeline/data',
);

interface RawOption {
  optionId: string;
  label: string;
}

interface RawItem {
  itemId: string;
  trackCode: string;
  domainCode: string;
  levelNumber: number;
  itemType: string;
  difficulty: string;
  promptText: string;
  options?: RawOption[];
  correctOptionIds?: string[];
  modelAnswer?: string;
  itemWeight: number;
}

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://smart:smart@127.0.0.1:5432/smart?schema=public';

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });

  const institution = await prisma.institution.upsert({
    where: { domain: 'smart.local' },
    update: {},
    create: { name: 'SMART Pilot Institute', domain: 'smart.local' },
  });

  for (const definition of TRACK_DEFINITIONS) {
    const track = await prisma.track.upsert({
      where: { code: definition.code },
      update: {
        name: definition.name,
        launchStatus: definition.launchStatus,
        foundationWeight: definition.foundationWeight,
        capstoneBrief: definition.capstone,
        communicationDomain: definition.communicationDomain,
      },
      create: {
        code: definition.code,
        name: definition.name,
        category: definition.category,
        launchStatus: definition.launchStatus,
        foundationWeight: definition.foundationWeight,
        capstoneBrief: definition.capstone,
        communicationDomain: definition.communicationDomain,
      },
    });

    for (const domain of definition.domains) {
      const weight = Number((domain.weight / domain.topics.length).toFixed(4));
      for (const topic of domain.topics) {
        const existing = await prisma.competency.findFirst({
          where: { trackId: track.id, name: topic, domainCode: domain.code },
        });
        if (existing) {
          await prisma.competency.update({
            where: { id: existing.id },
            data: {
              realWorldWeight: weight,
              assessedAtLevels: [...domain.assessedAtLevels],
              subDomain: domain.name,
            },
          });
        } else {
          await prisma.competency.create({
            data: {
              trackId: track.id,
              domainCode: domain.code,
              name: topic,
              subDomain: domain.name,
              realWorldWeight: weight,
              assessedAtLevels: [...domain.assessedAtLevels],
            },
          });
        }
      }
    }

    for (const level of LEVEL_DEFINITIONS) {
      await prisma.level.upsert({
        where: { trackId_levelNumber: { trackId: track.id, levelNumber: level.level } },
        update: {
          name: level.name,
          format: level.format,
          durationMinutes: level.defaultDurationMinutes,
        },
        create: {
          trackId: track.id,
          levelNumber: level.level,
          name: level.name,
          format: level.format,
          durationMinutes: level.defaultDurationMinutes,
        },
      });
    }
  }

  const fullstack = await prisma.track.findUniqueOrThrow({ where: { code: 'TECH_FULLSTACK' } });
  const passwordHash = await hashPassword('ChangeMe!Dev');

  for (const account of [
    {
      email: 'admin@smart.local',
      fullName: 'SMART Super Admin',
      role: 'SUPER_ADMIN' as const,
      primaryTrackId: null,
    },
    {
      email: 'tpo@smart.local',
      fullName: 'Pilot TPO',
      role: 'INSTITUTION_ADMIN' as const,
      primaryTrackId: null,
    },
    {
      email: 'student@smart.local',
      fullName: 'Pilot Student',
      role: 'STUDENT' as const,
      primaryTrackId: fullstack.id,
    },
  ]) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash },
      create: {
        email: account.email,
        fullName: account.fullName,
        passwordHash,
        role: account.role,
        emailVerified: true,
        institutionId: institution.id,
        primaryTrackId: account.primaryTrackId,
      },
    });
  }

  // Seed L1 item banks for the two VALIDATED_LEAD tracks
  const itemFiles = [
    path.join(DATA_DIR, 'mba-finance-l1.json'),
    path.join(DATA_DIR, 'mba-business-analytics-l1.json'),
  ];

  let itemsSeeded = 0;
  for (const filePath of itemFiles) {
    const raw = await readFile(filePath, 'utf8');
    const items: RawItem[] = JSON.parse(raw) as RawItem[];

    for (const item of items) {
      const track = await prisma.track.findUniqueOrThrow({ where: { code: item.trackCode } });
      const level = await prisma.level.findUniqueOrThrow({
        where: { trackId_levelNumber: { trackId: track.id, levelNumber: item.levelNumber } },
      });
      const competency = await prisma.competency.findFirstOrThrow({
        where: { trackId: track.id, domainCode: item.domainCode },
      });

      const existing = await prisma.item.findUnique({ where: { id: item.itemId } });
      if (!existing) {
        await prisma.item.create({
          data: {
            id: item.itemId,
            levelId: level.id,
            competencyId: competency.id,
            itemType: item.itemType,
            stem: item.promptText,
            difficultyTag: item.difficulty,
            ...(item.modelAnswer ? { modelAnswer: item.modelAnswer } : {}),
            options: item.options
              ? {
                  create: item.options.map((opt) => ({
                    label: opt.optionId,
                    text: opt.label,
                    isCorrect: (item.correctOptionIds ?? []).includes(opt.optionId),
                  })),
                }
              : undefined,
          },
        });
        itemsSeeded += 1;
      }
    }
  }

  // Verify Finance items are in DB — proof for PR review
  const financeCount = await prisma.item.count({
    where: { level: { track: { code: 'MBA_FINANCE' } } },
  });
  const sampleFinanceItem = await prisma.item.findFirst({
    where: { level: { track: { code: 'MBA_FINANCE' } } },
    select: { id: true, stem: true, itemType: true, difficultyTag: true },
  });

  console.log(
    `Seed complete — 10 tracks, 50 levels, ${String(itemsSeeded)} new item(s) seeded. Login: student@smart.local / ChangeMe!Dev`,
  );
  console.log(`MBA_FINANCE items in DB: ${String(financeCount)}`);
  console.log('Sample Finance item:', JSON.stringify(sampleFinanceItem, null, 2));
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
