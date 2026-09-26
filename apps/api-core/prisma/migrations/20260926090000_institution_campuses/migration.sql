-- S6-VV-112 (#163): institutions can have several campuses; a batch belongs to one.

-- CreateTable
CREATE TABLE "campuses" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "city" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "campus_id" UUID;

-- CreateIndex
CREATE INDEX "campuses_institution_id_idx" ON "campuses"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "campuses_institution_id_name_key" ON "campuses"("institution_id", "name");

-- CreateIndex
CREATE INDEX "batches_campus_id_idx" ON "batches"("campus_id");

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing institution gets one primary campus, and its batches move onto it.
INSERT INTO "campuses" ("id", "institution_id", "name", "is_primary")
SELECT gen_random_uuid(), "id", 'Main campus', true FROM "institutions";

UPDATE "batches" AS b
SET "campus_id" = c."id"
FROM "campuses" AS c
WHERE c."institution_id" = b."institution_id" AND c."is_primary" AND b."campus_id" IS NULL;
