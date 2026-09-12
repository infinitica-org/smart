import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEVEL_DEFINITIONS,
  SKILL_CODES,
  SKILL_DEFINITIONS,
  TRACK_DEFINITIONS,
} from '@smart/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import {
  resolveSeedEmailDomain,
  resolveSeedPassword,
  seedAccountEmails,
} from '../src/platform/prisma/seed-accounts.js';

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

  const PLAN_CANDIDATE_CAPACITY: Record<'FREE' | 'BASIC' | 'PRO', number | null> = {
    FREE: 100,
    BASIC: 500,
    PRO: null,
  };
  const plans = await Promise.all(
    (
      [
        ['FREE', 'Free'],
        ['BASIC', 'Basic'],
        ['PRO', 'Pro'],
      ] as const
    ).map(([code, name]) =>
      prisma.subscriptionPlan.upsert({
        where: { code },
        update: { name, candidateCapacity: PLAN_CANDIDATE_CAPACITY[code] },
        create: { code, name, candidateCapacity: PLAN_CANDIDATE_CAPACITY[code] },
      }),
    ),
  );
  const proPlan = plans.find((plan) => plan.code === 'PRO')!;

  // Legacy flags: enabled for every non-FREE plan.
  const legacyFlagKeys = [
    ['ats_kanban', 'ATS Kanban'],
    ['public_profile', 'Public verified profile'],
    ['project_verification', 'Project verification'],
  ] as const;
  for (const [key, name] of legacyFlagKeys) {
    const flag = await prisma.featureFlag.upsert({
      where: { key },
      update: { name },
      create: { key, name },
    });
    for (const plan of plans) {
      await prisma.planEntitlement.upsert({
        where: { planId_featureFlagId: { planId: plan.id, featureFlagId: flag.id } },
        update: { enabled: plan.code !== 'FREE' },
        create: { planId: plan.id, featureFlagId: flag.id, enabled: plan.code !== 'FREE' },
      });
    }
  }

  // Tier-specific flags, each with an explicit per-plan-code entitlement set.
  const tieredFlags: Array<{
    key: string;
    name: string;
    enabledFor: ReadonlySet<'FREE' | 'BASIC' | 'PRO'>;
  }> = [
    {
      key: 'bulk_batch_import',
      name: 'Bulk spreadsheet batch import',
      enabledFor: new Set(['BASIC', 'PRO']),
    },
    {
      key: 'skill_verification',
      name: 'Skill verification',
      enabledFor: new Set(['BASIC', 'PRO']),
    },
    {
      key: 'webhooks_outbound',
      name: 'Outbound webhooks',
      enabledFor: new Set(['PRO']),
    },
    {
      key: 'proctoring_advanced',
      name: 'Advanced proctoring',
      enabledFor: new Set(['PRO']),
    },
  ];
  for (const { key, name, enabledFor } of tieredFlags) {
    const flag = await prisma.featureFlag.upsert({
      where: { key },
      update: { name },
      create: { key, name },
    });
    for (const plan of plans) {
      const enabled = enabledFor.has(plan.code);
      await prisma.planEntitlement.upsert({
        where: { planId_featureFlagId: { planId: plan.id, featureFlagId: flag.id } },
        update: { enabled },
        create: { planId: plan.id, featureFlagId: flag.id, enabled },
      });
    }
  }

  await prisma.skillClaim.deleteMany({
    where: { skill: { code: { notIn: [...SKILL_CODES] } } },
  });
  await prisma.jobOpeningSkill.deleteMany({
    where: { skill: { code: { notIn: [...SKILL_CODES] } } },
  });
  await prisma.skill.deleteMany({
    where: { code: { notIn: [...SKILL_CODES] } },
  });
  for (const skill of SKILL_DEFINITIONS) {
    await prisma.skill.upsert({
      where: { code: skill.code },
      update: { name: skill.name, domain: skill.domain, active: true },
      create: { code: skill.code, name: skill.name, domain: skill.domain, active: true },
    });
  }

  const seedDomain = resolveSeedEmailDomain();
  const seedPassword = resolveSeedPassword();
  const seedEmails = seedAccountEmails(seedDomain);

  const institution = await prisma.institution.upsert({
    where: { domain: seedDomain },
    update: {},
    create: {
      name: 'SMART Pilot Institute',
      domain: seedDomain,
      planId: proPlan.id,
    },
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
  const passwordHash = await hashPassword(seedPassword);

  const accounts: Array<{
    email: string;
    fullName: string;
    role: 'SUPER_ADMIN' | 'INSTITUTION_ADMIN' | 'STUDENT';
    primaryTrackId: string | null;
  }> = [
    {
      email: seedEmails.admin,
      fullName: 'SMART Super Admin',
      role: 'SUPER_ADMIN',
      primaryTrackId: null,
    },
    {
      email: seedEmails.tpo,
      fullName: 'Pilot TPO',
      role: 'INSTITUTION_ADMIN',
      primaryTrackId: null,
    },
    {
      email: seedEmails.student,
      fullName: 'Pilot Student',
      role: 'STUDENT',
      primaryTrackId: fullstack.id,
    },
  ];

  const usersByEmail = new Map<string, { id: string }>();
  for (const account of accounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash },
      create: {
        email: account.email,
        fullName: account.fullName,
        passwordHash,
        role: account.role,
        emailVerified: true,
        institutionId: account.role === 'SUPER_ADMIN' ? null : institution.id,
        primaryTrackId: account.primaryTrackId,
      },
    });
    usersByEmail.set(account.email, user);
  }

  const tpo = usersByEmail.get(seedEmails.tpo);
  if (!tpo) throw new Error('Seed failed: tpo user missing');

  const pilotBatch = await prisma.batch.upsert({
    where: {
      institutionId_name: {
        institutionId: institution.id,
        name: 'Pilot Batch 2026',
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      name: 'Pilot Batch 2026',
      code: 'PILOT-2026',
      createdById: tpo.id,
    },
  });

  await prisma.user.update({
    where: { email: seedEmails.student },
    data: {
      batchId: pilotBatch.id,
      groupLabel: 'Section A',
    },
  });

  console.log(
    `Seed complete — ${String(TRACK_DEFINITIONS.length)} tracks, ${String(TRACK_DEFINITIONS.length * 5)} levels, pilot batch "${pilotBatch.name}" seeded. Login as ${seedEmails.student} (password from SEED_PASSWORD or dest default)`,
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
