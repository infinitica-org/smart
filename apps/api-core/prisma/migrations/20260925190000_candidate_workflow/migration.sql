-- CreateEnum
CREATE TYPE "OfferOutcome" AS ENUM ('ACCEPTED', 'DECLINED', 'WITHDRAWN_BY_COMPANY');
CREATE TYPE "JoiningOutcome" AS ENUM ('JOINED', 'NO_SHOW', 'DEFERRED');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN "assignee_id" UUID;
CREATE INDEX "applications_assignee_id_idx" ON "applications"("assignee_id");

-- CreateTable
CREATE TABLE "application_notes" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "application_notes_application_id_created_at_idx" ON "application_notes"("application_id", "created_at");
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "application_outcomes" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "offer_outcome" "OfferOutcome",
    "joining_outcome" "JoiningOutcome",
    "joining_date" DATE,
    "note" TEXT,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "application_outcomes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "application_outcomes_application_id_key" ON "application_outcomes"("application_id");
CREATE INDEX "application_outcomes_org_id_idx" ON "application_outcomes"("org_id");
ALTER TABLE "application_outcomes" ADD CONSTRAINT "application_outcomes_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
