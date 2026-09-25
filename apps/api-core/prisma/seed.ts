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
  resolveSeedInstitutionName,
  resolveSeedPassword,
  resolveSeedTpoFullName,
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

// Matches DATABASE_URL's default in platform/config/env.ts — local Docker Compose Postgres.
const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://smart:CHANGE_ME@127.0.0.1:5433/smart?schema=public';

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });

  const PLAN_CANDIDATE_CAPACITY: Record<'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE', number | null> = {
    FREE: 100,
    BASIC: 500,
    PRO: null,
    ENTERPRISE: null,
  };
  const PLAN_PRICE_INR: Record<'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE', number | null> = {
    FREE: 0,
    BASIC: 7500,
    PRO: 20000,
    ENTERPRISE: null, // custom / negotiated — no public rate card
  };
  const plans = await Promise.all(
    (
      [
        ['FREE', 'Get Started'],
        ['BASIC', 'Find & Engage'],
        ['PRO', 'Build Talent Pipelines'],
        ['ENTERPRISE', 'Talent Intelligence Suite'],
      ] as const
    ).map(([code, name]) =>
      prisma.subscriptionPlan.upsert({
        where: { code },
        update: {
          name,
          candidateCapacity: PLAN_CANDIDATE_CAPACITY[code],
          priceInr: PLAN_PRICE_INR[code],
          isCustomPrice: code === 'ENTERPRISE',
        },
        create: {
          code,
          name,
          candidateCapacity: PLAN_CANDIDATE_CAPACITY[code],
          priceInr: PLAN_PRICE_INR[code],
          isCustomPrice: code === 'ENTERPRISE',
        },
      }),
    ),
  );
  const proPlan = plans.find((plan) => plan.code === 'PRO')!;

  // Legacy flags: enabled for every non-FREE plan (BASIC, PRO, ENTERPRISE).
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
  // ENTERPRISE inherits all PRO flags as a minimum; SA can override per-tenant.
  const tieredFlags: Array<{
    key: string;
    name: string;
    enabledFor: ReadonlySet<'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'>;
  }> = [
    {
      key: 'bulk_batch_import',
      name: 'Bulk spreadsheet batch import',
      enabledFor: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
    },
    {
      key: 'skill_verification',
      name: 'Skill verification',
      enabledFor: new Set(['BASIC', 'PRO', 'ENTERPRISE']),
    },
    {
      key: 'webhooks_outbound',
      name: 'Outbound webhooks',
      enabledFor: new Set(['PRO', 'ENTERPRISE']),
    },
    {
      key: 'proctoring_advanced',
      name: 'Advanced proctoring',
      enabledFor: new Set(['PRO', 'ENTERPRISE']),
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
  const institutionName = resolveSeedInstitutionName();
  const tpoFullName = resolveSeedTpoFullName();

  const institution = await prisma.institution.upsert({
    where: { domain: seedDomain },
    update: { name: institutionName },
    create: {
      name: institutionName,
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

  const company = await prisma.company.upsert({
    where: { domain: seedDomain },
    update: {
      name: 'SMART Pilot Employer',
      planId: proPlan.id,
      verificationStatus: 'APPROVED',
    },
    create: {
      name: 'SMART Pilot Employer',
      domain: seedDomain,
      planId: proPlan.id,
      verificationStatus: 'APPROVED',
    },
  });

  const fullstack = await prisma.track.findUniqueOrThrow({ where: { code: 'TECH_FULLSTACK' } });
  const devPasswordHash = await hashPassword(seedPassword);
  const companyPasswordHash = await hashPassword('Password123!');

  const accounts: Array<{
    email: string;
    fullName: string;
    role: 'SUPER_ADMIN' | 'INSTITUTION_ADMIN' | 'STUDENT' | 'COMPANY';
    institutionId: string | null;
    companyId: string | null;
    primaryTrackId: string | null;
    passwordHash: string;
  }> = [
    {
      email: seedEmails.admin,
      fullName: 'SMART Super Admin',
      role: 'SUPER_ADMIN',
      institutionId: null,
      companyId: null,
      primaryTrackId: null,
      passwordHash: devPasswordHash,
    },
    {
      email: seedEmails.tpo,
      fullName: tpoFullName,
      role: 'INSTITUTION_ADMIN',
      institutionId: institution.id,
      companyId: null,
      primaryTrackId: null,
      passwordHash: devPasswordHash,
    },
    {
      email: seedEmails.student,
      fullName: 'Pilot Student',
      role: 'STUDENT',
      institutionId: institution.id,
      companyId: null,
      primaryTrackId: fullstack.id,
      passwordHash: devPasswordHash,
    },
    {
      email: seedEmails.company,
      fullName: 'Pilot Recruiter',
      role: 'COMPANY',
      institutionId: null,
      companyId: company.id,
      primaryTrackId: null,
      passwordHash: companyPasswordHash,
    },
  ];

  const usersByEmail = new Map<string, { id: string }>();
  for (const account of accounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        passwordHash: account.passwordHash,
        fullName: account.fullName,
        role: account.role,
        companyId: account.companyId,
        institutionId: account.institutionId,
        emailVerified: true,
      },
      create: {
        email: account.email,
        fullName: account.fullName,
        passwordHash: account.passwordHash,
        role: account.role,
        emailVerified: true,
        institutionId: account.institutionId,
        companyId: account.companyId,
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
    `Seed complete — ${String(TRACK_DEFINITIONS.length)} tracks, ${String(TRACK_DEFINITIONS.length * 5)} levels, pilot batch "${pilotBatch.name}" seeded. Logins: student (${seedEmails.student}), company (${seedEmails.company}), tpo (${seedEmails.tpo}), admin (${seedEmails.admin}). Password: ${seedPassword}`,
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
