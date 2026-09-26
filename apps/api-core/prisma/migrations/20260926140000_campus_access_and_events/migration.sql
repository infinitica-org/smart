-- UNI-05 (Th6-445..451): campus access requests, university-employer access, career events, registrations.

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'CAMPUS_ACCESS';
ALTER TYPE "NotificationKind" ADD VALUE 'EVENT';

-- CreateEnum
CREATE TYPE "CampusAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'REVOKED');
CREATE TYPE "CampusAccessStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "CareerEventAudience" AS ENUM ('STUDENTS', 'EMPLOYERS', 'BOTH');
CREATE TYPE "CareerEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');
CREATE TYPE "EventRegistrationStatus" AS ENUM ('REGISTERED', 'WAITLISTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "campus_access_requests" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "message" TEXT,
    "status" "CampusAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" UUID NOT NULL,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campus_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "university_employer_access" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "status" "CampusAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "approved_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by_id" UUID,

    CONSTRAINT "university_employer_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_events" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "timezone" TEXT NOT NULL,
    "location" TEXT,
    "online_url" TEXT,
    "capacity" INTEGER,
    "audience" "CareerEventAudience" NOT NULL DEFAULT 'STUDENTS',
    "employer_registration" BOOLEAN NOT NULL DEFAULT false,
    "status" "CareerEventStatus" NOT NULL DEFAULT 'DRAFT',
    "cancel_reason" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "career_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_registrations" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID,
    "status" "EventRegistrationStatus" NOT NULL,
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campus_access_requests_institution_id_status_created_at_idx" ON "campus_access_requests"("institution_id", "status", "created_at");
CREATE INDEX "campus_access_requests_company_id_institution_id_idx" ON "campus_access_requests"("company_id", "institution_id");
-- Only one PENDING request per (company, institution). Prisma cannot express a partial index.
CREATE UNIQUE INDEX "campus_access_requests_one_pending_idx" ON "campus_access_requests"("company_id", "institution_id") WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX "university_employer_access_institution_id_company_id_key" ON "university_employer_access"("institution_id", "company_id");
CREATE INDEX "university_employer_access_company_id_status_idx" ON "university_employer_access"("company_id", "status");

CREATE INDEX "career_events_institution_id_status_starts_at_idx" ON "career_events"("institution_id", "status", "starts_at");

CREATE UNIQUE INDEX "event_registrations_event_id_user_id_key" ON "event_registrations"("event_id", "user_id");
CREATE INDEX "event_registrations_event_id_status_registered_at_idx" ON "event_registrations"("event_id", "status", "registered_at");
CREATE INDEX "event_registrations_user_id_status_idx" ON "event_registrations"("user_id", "status");

-- AddForeignKey
ALTER TABLE "campus_access_requests" ADD CONSTRAINT "campus_access_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campus_access_requests" ADD CONSTRAINT "campus_access_requests_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "university_employer_access" ADD CONSTRAINT "university_employer_access_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "university_employer_access" ADD CONSTRAINT "university_employer_access_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "career_events" ADD CONSTRAINT "career_events_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "career_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: the campus-access rule now hides an employer's jobs from a campus that has not approved them.
-- Every (institution, company) pair that already has a job keeps seeing it; campuses can revoke afterwards.
INSERT INTO "university_employer_access" ("id", "institution_id", "company_id", "status", "approved_at")
SELECT gen_random_uuid(), j."institution_id", j."company_id", 'ACTIVE', CURRENT_TIMESTAMP
FROM "job_openings" j
WHERE j."company_id" IS NOT NULL
GROUP BY j."institution_id", j."company_id";
