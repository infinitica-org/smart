import 'dotenv/config';
import { SKILL_DEFINITIONS } from '@smart/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';

/**
 * JOB-02 — demo openings so the student Jobs page has real data to browse. Seed data only: this is
 * not a posting flow (job posting is Th6-356–362).
 *
 * Requires the base seed (pnpm db:seed): it needs the institution, its TPO user and the verified
 * SMART Pilot Employer. Idempotent: an opening is recognised by (institution, company name, title).
 *
 * It seeds both kinds of job the Jobs page must handle, plus rows that must never be listed:
 *   - company jobs from a VERIFIED company (badge shown)
 *   - the university's own postings (no company, no badge)
 *   - an UNVERIFIED company's job, a CLOSED job and an EXPIRED job (never listed)
 */

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://smart:smart@127.0.0.1:5432/smart?schema=public';
const INSTITUTION_DOMAIN = process.env['TEST_DATA_INSTITUTION_DOMAIN'] ?? 'smart.local';

type Proficiency = 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'ADVANCED' | 'PROFESSIONAL';

interface SeedJob {
  company: 'VERIFIED' | 'UNVERIFIED' | 'UNIVERSITY';
  companyName: string;
  roleTitle: string;
  location: string;
  employmentType: 'FULL_TIME' | 'INTERNSHIP' | 'PART_TIME' | 'CONTRACT';
  workMode: 'ONSITE' | 'HYBRID' | 'REMOTE' | null;
  status?: 'OPEN' | 'CLOSED';
  daysToDeadline?: number | null;
  skills: { index: number; min: Proficiency }[];
  details: string;
}

const JOBS: SeedJob[] = [
  {
    company: 'VERIFIED',
    companyName: 'SMART Pilot Employer',
    roleTitle: 'Junior Frontend Engineer',
    location: 'Bengaluru',
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    daysToDeadline: 14,
    skills: [{ index: 0, min: 'INTERMEDIATE' }],
    details: 'Build real-time collaboration dashboards with a small product team.',
  },
  {
    company: 'VERIFIED',
    companyName: 'SMART Pilot Employer',
    roleTitle: 'Backend Engineering Intern',
    location: 'Pune',
    employmentType: 'INTERNSHIP',
    workMode: 'REMOTE',
    daysToDeadline: 30,
    skills: [
      { index: 0, min: 'BEGINNER' },
      { index: 1, min: 'INTERMEDIATE' },
    ],
    details: 'Six-month internship on our API platform, mentored by senior engineers.',
  },
  {
    company: 'VERIFIED',
    companyName: 'SMART Pilot Employer',
    roleTitle: 'Platform Engineer',
    location: 'Hyderabad',
    employmentType: 'FULL_TIME',
    workMode: 'ONSITE',
    daysToDeadline: null,
    skills: [
      { index: 0, min: 'ADVANCED' },
      { index: 1, min: 'ADVANCED' },
      { index: 2, min: 'PROFICIENT' },
    ],
    details: 'Own the reliability of our deployment and observability stack.',
  },
  {
    company: 'UNIVERSITY',
    companyName: 'Campus Placement Partner',
    roleTitle: 'Graduate Trainee (Campus Drive)',
    location: 'Pune',
    employmentType: 'FULL_TIME',
    workMode: null,
    daysToDeadline: 21,
    skills: [{ index: 0, min: 'BEGINNER' }],
    details: 'On-campus drive run by the placement cell. Bring your student ID.',
  },
  {
    company: 'UNIVERSITY',
    companyName: 'Regional Software Consortium',
    roleTitle: 'Software Engineer',
    location: 'Chennai',
    employmentType: 'CONTRACT',
    workMode: 'HYBRID',
    daysToDeadline: 10,
    skills: [
      { index: 1, min: 'INTERMEDIATE' },
      { index: 3, min: 'BEGINNER' },
    ],
    details: 'Contract role for a consortium of mid-size software companies.',
  },
  {
    company: 'UNIVERSITY',
    companyName: 'Campus Placement Partner',
    roleTitle: 'Part-time Support Analyst',
    location: 'Pune',
    employmentType: 'PART_TIME',
    workMode: 'ONSITE',
    daysToDeadline: 7,
    skills: [],
    details: 'Evening shifts alongside your studies.',
  },
  // Never listed:
  {
    company: 'UNVERIFIED',
    companyName: 'Unverified Startup',
    roleTitle: 'Growth Hacker (unverified company)',
    location: 'Remote',
    employmentType: 'FULL_TIME',
    workMode: 'REMOTE',
    daysToDeadline: 30,
    skills: [{ index: 0, min: 'BEGINNER' }],
    details: 'Should never appear: the company is not verified.',
  },
  {
    company: 'VERIFIED',
    companyName: 'SMART Pilot Employer',
    roleTitle: 'Data Analyst (closed)',
    location: 'Pune',
    employmentType: 'FULL_TIME',
    workMode: 'ONSITE',
    status: 'CLOSED',
    daysToDeadline: 30,
    skills: [{ index: 0, min: 'BEGINNER' }],
    details: 'Should not be listed: the opening is closed.',
  },
  {
    company: 'VERIFIED',
    companyName: 'SMART Pilot Employer',
    roleTitle: 'QA Engineer (expired)',
    location: 'Pune',
    employmentType: 'FULL_TIME',
    workMode: 'ONSITE',
    daysToDeadline: -5,
    skills: [{ index: 0, min: 'BEGINNER' }],
    details: 'Should not be listed: the deadline has passed.',
  },
];

function addDays(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
  try {
    const institution = await prisma.institution.findUnique({
      where: { domain: INSTITUTION_DOMAIN },
    });
    if (!institution) {
      throw new Error(`Run pnpm db:seed first: no institution for ${INSTITUTION_DOMAIN}.`);
    }
    const tpo = await prisma.user.findFirst({
      where: { institutionId: institution.id, role: 'INSTITUTION_ADMIN' },
    });
    if (!tpo) throw new Error('Run pnpm db:seed first: no TPO user found.');
    const verified = await prisma.company.findUnique({ where: { domain: INSTITUTION_DOMAIN } });
    if (!verified) throw new Error('Run pnpm db:seed first: no verified company found.');

    const unverified = await prisma.company.upsert({
      where: { domain: 'unverified-startup.example' },
      update: { verificationStatus: 'PENDING' },
      create: {
        name: 'Unverified Startup',
        domain: 'unverified-startup.example',
        planId: verified.planId,
        verificationStatus: 'PENDING',
      },
    });

    const definitions = SKILL_DEFINITIONS.slice(0, 4);
    const skillRows = await prisma.skill.findMany({
      where: { code: { in: definitions.map((definition) => definition.code) } },
    });
    const skillByIndex = definitions.map((definition) =>
      skillRows.find((row) => row.code === definition.code),
    );

    let created = 0;
    for (const job of JOBS) {
      const existing = await prisma.jobOpening.findFirst({
        where: {
          institutionId: institution.id,
          companyName: job.companyName,
          roleTitle: job.roleTitle,
        },
        select: { id: true },
      });
      if (existing) continue;

      const requiredSkills = job.skills.flatMap((skill) => {
        const row = skillByIndex[skill.index];
        return row ? [{ skillId: row.id, minProficiency: skill.min }] : [];
      });
      await prisma.jobOpening.create({
        data: {
          institutionId: institution.id,
          companyId:
            job.company === 'VERIFIED'
              ? verified.id
              : job.company === 'UNVERIFIED'
                ? unverified.id
                : null,
          companyName: job.companyName,
          roleTitle: job.roleTitle,
          location: job.location,
          employmentType: job.employmentType,
          workMode: job.workMode,
          status: job.status ?? 'OPEN',
          lastDateToApply:
            job.daysToDeadline === null || job.daysToDeadline === undefined
              ? null
              : addDays(job.daysToDeadline),
          roleDetails: job.details,
          aboutCompany: `${job.companyName} — demo posting for student job discovery.`,
          createdById: tpo.id,
          requiredSkills: { create: requiredSkills },
        },
      });
      created += 1;
    }
    console.log(
      `seed-jobs: ${created} opening(s) created, ${JOBS.length - created} already present.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
