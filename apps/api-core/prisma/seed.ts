import 'dotenv/config';
import { LEVEL_DEFINITIONS, TRACK_DEFINITIONS } from '@smart/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';

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

  console.log('Seed complete. Login as student@smart.local / ChangeMe!Dev');
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
