-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'APPLICATION';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN "cover_note" TEXT;

-- AlterTable
ALTER TABLE "application_stage_events" ADD COLUMN "reason" TEXT,
ADD COLUMN "actor_id" UUID;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" TEXT;

-- CreateTable
CREATE TABLE "application_snapshots" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "profile_json" JSONB NOT NULL,
    "skills_json" JSONB NOT NULL,
    "evidence_refs" JSONB NOT NULL,
    "fit_json" JSONB,
    "serializer_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_snapshots_application_id_key" ON "application_snapshots"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- AddForeignKey
ALTER TABLE "application_snapshots" ADD CONSTRAINT "application_snapshots_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
