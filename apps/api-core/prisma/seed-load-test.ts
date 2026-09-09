import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';

/**
 * Adds N additional STUDENT accounts on top of the base `pnpm db:seed` data,
 * for k6 load testing — never adjusts TEST_DATA_USERS worth of unique rows in
 * the base seed itself, which is meant to stay small and hand-curated.
 *
 * Requires the base seed to have already run (needs an existing institution,
 * plan, batch, and the target track/level/item bank).
 *
 * Idempotent: re-running with a larger TEST_DATA_USERS only adds the delta
 * (upsert on email); it never deletes existing load-test users. Every row
 * this script creates is identifiable — and therefore safely deletable — by
 * the `LOAD_TEST_EMAIL_PREFIX` pattern.
 *
 * Owner: perf-testing (tools/load-tests).
 */

const OUTPUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../tools/load-tests/src/data',
);

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://smart:smart@127.0.0.1:5432/smart?schema=public';

const USER_COUNT = Number(process.env['TEST_DATA_USERS'] ?? '200');
const TRACK_CODE = process.env['TEST_DATA_TRACK_CODE'] ?? 'TECH_FULLSTACK';
const INSTITUTION_DOMAIN = process.env['TEST_DATA_INSTITUTION_DOMAIN'] ?? 'smart.local';
const PASSWORD = process.env['TEST_PASSWORD'] ?? 'LoadTest!2026';
export const LOAD_TEST_EMAIL_PREFIX = 'loadtest.student.';
const EMAIL_DOMAIN = 'smart.local';

function emailFor(index: number): string {
  return `${LOAD_TEST_EMAIL_PREFIX}${String(index).padStart(5, '0')}@${EMAIL_DOMAIN}`;
}

async function main(): Promise<void> {
  if (!Number.isFinite(USER_COUNT) || USER_COUNT <= 0) {
    throw new Error(
      `TEST_DATA_USERS must be a positive integer, got: ${process.env['TEST_DATA_USERS']}`,
    );
  }
  if (PASSWORD.length < 8) {
    throw new Error(
      'TEST_PASSWORD must be at least 8 characters (matches the API password schema).',
    );
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

  const institution = await prisma.institution.findUnique({
    where: { domain: INSTITUTION_DOMAIN },
  });
  if (!institution) {
    throw new Error(
      `No institution with domain "${INSTITUTION_DOMAIN}" — run "pnpm db:seed" first (apps/api-core).`,
    );
  }
  const track = await prisma.track.findUnique({ where: { code: TRACK_CODE } });
  if (!track) {
    throw new Error(`No track "${TRACK_CODE}" — run "pnpm db:seed" first (apps/api-core).`);
  }
  const batch = await prisma.batch.findFirst({ where: { institutionId: institution.id } });

  // Hashed once, reused for every load-test account — matches apps/api-core/prisma/seed.ts's
  // own pattern (scrypt is deliberately slow; N distinct hashes buys no real test value here).
  const passwordHash = await hashPassword(PASSWORD);

  console.log(`Seeding ${String(USER_COUNT)} load-test student accounts on track ${TRACK_CODE}...`);
  const emails: string[] = [];
  for (let i = 1; i <= USER_COUNT; i += 1) {
    const email = emailFor(i);
    emails.push(email);
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        fullName: `Load Test Student ${String(i).padStart(5, '0')}`,
        passwordHash,
        role: 'STUDENT',
        emailVerified: true,
        institutionId: institution.id,
        primaryTrackId: track.id,
        batchId: batch?.id,
      },
    });
    if (i % 50 === 0 || i === USER_COUNT) {
      process.stdout.write(`  ${String(i)}/${String(USER_COUNT)}\r`);
    }
  }
  console.log(`\nDone. Login pattern: ${emailFor(1)} .. ${emailFor(USER_COUNT)} / "${PASSWORD}"`);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outFile = path.join(OUTPUT_DIR, 'users.json');
  // Emails only — never the password — so this file is safe to commit as a
  // fixture and to load into k6 via SharedArray without embedding a secret.
  await writeFile(outFile, JSON.stringify({ trackCode: TRACK_CODE, emails }, null, 2));
  console.log(`Wrote ${outFile} (${String(emails.length)} accounts).`);

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
