-- APP-02 (Th6-415 / Th6-418): pipeline statuses and an append-only transition log.
-- Stored stages (AtsStage) are kept for the university board; every event also records its status.

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StageActorType" AS ENUM ('EMPLOYER', 'STUDENT', 'SYSTEM', 'INSTITUTION');

-- The withdrawal reason / remark is now the event note.
ALTER TABLE "application_stage_events" RENAME COLUMN "reason" TO "note";

ALTER TABLE "application_stage_events"
  ADD COLUMN "org_id" UUID,
  ADD COLUMN "from_status" "ApplicationStatus",
  ADD COLUMN "to_status" "ApplicationStatus",
  ADD COLUMN "actor_type" "StageActorType",
  ADD COLUMN "source" TEXT;

-- Backfill: every existing application gets at least an initial APPLIED event (only when it has none),
-- plus one catch-up event if it has already moved on, so the timeline always ends at the current status.
INSERT INTO "application_stage_events" ("id", "application_id", "from_stage", "to_stage", "created_at", "note", "actor_id")
SELECT gen_random_uuid(), a."id", NULL, 'APPLIED', a."created_at", NULL, NULL
FROM "applications" a
WHERE NOT EXISTS (SELECT 1 FROM "application_stage_events" e WHERE e."application_id" = a."id");

INSERT INTO "application_stage_events" ("id", "application_id", "from_stage", "to_stage", "created_at", "note", "actor_id")
SELECT gen_random_uuid(), a."id", 'APPLIED', a."stage", a."updated_at", NULL, NULL
FROM "applications" a
WHERE a."stage" <> 'APPLIED'
  AND (SELECT COUNT(*) FROM "application_stage_events" e WHERE e."application_id" = a."id") = 1
  AND (SELECT e."to_stage" FROM "application_stage_events" e WHERE e."application_id" = a."id" LIMIT 1) = 'APPLIED';

-- Backfill the new columns on every row.
UPDATE "application_stage_events" e
SET "org_id" = COALESCE(j."company_id", j."institution_id"),
    "actor_type" = CASE
      WHEN e."actor_id" IS NULL THEN 'SYSTEM'::"StageActorType"
      WHEN e."actor_id" = a."student_id" THEN 'STUDENT'::"StageActorType"
      ELSE 'INSTITUTION'::"StageActorType"
    END,
    "source" = 'backfill'
FROM "applications" a
JOIN "job_openings" j ON j."id" = a."opening_id"
WHERE e."application_id" = a."id";

-- Old status values -> new statuses. SHORTLISTED and AI_VERIFIED are both "reviewing".
UPDATE "application_stage_events"
SET "to_status" = CASE "to_stage"
      WHEN 'APPLIED' THEN 'APPLIED'
      WHEN 'SHORTLISTED' THEN 'REVIEWING'
      WHEN 'AI_VERIFIED' THEN 'REVIEWING'
      WHEN 'INTERVIEW' THEN 'INTERVIEWING'
      WHEN 'OFFER' THEN 'OFFERED'
      WHEN 'HIRED' THEN 'HIRED'
      WHEN 'REJECTED' THEN 'REJECTED'
      WHEN 'WITHDRAWN' THEN 'WITHDRAWN'
    END::"ApplicationStatus",
    "from_status" = CASE "from_stage"
      WHEN 'APPLIED' THEN 'APPLIED'
      WHEN 'SHORTLISTED' THEN 'REVIEWING'
      WHEN 'AI_VERIFIED' THEN 'REVIEWING'
      WHEN 'INTERVIEW' THEN 'INTERVIEWING'
      WHEN 'OFFER' THEN 'OFFERED'
      WHEN 'HIRED' THEN 'HIRED'
      WHEN 'REJECTED' THEN 'REJECTED'
      WHEN 'WITHDRAWN' THEN 'WITHDRAWN'
    END::"ApplicationStatus";

ALTER TABLE "application_stage_events"
  ALTER COLUMN "org_id" SET NOT NULL,
  ALTER COLUMN "to_status" SET NOT NULL,
  ALTER COLUMN "actor_type" SET NOT NULL,
  ALTER COLUMN "source" SET NOT NULL;

-- CreateIndex
CREATE INDEX "application_stage_events_org_id_created_at_idx" ON "application_stage_events"("org_id", "created_at");

-- Append-only: history rows can be added but never changed. (Deleting an application still removes its
-- history through the foreign key cascade.)
CREATE FUNCTION "application_stage_events_reject_update"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'application_stage_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "application_stage_events_append_only"
BEFORE UPDATE ON "application_stage_events"
FOR EACH ROW EXECUTE FUNCTION "application_stage_events_reject_update"();
