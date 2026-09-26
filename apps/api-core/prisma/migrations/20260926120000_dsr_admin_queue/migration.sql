-- S6-VV-116 (#559): admins work the data-request queue.

-- AlterTable
ALTER TABLE "data_subject_requests" ADD COLUMN     "first_responded_at" TIMESTAMPTZ(6),
ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "resolved_by_id" UUID;

-- CreateIndex
CREATE INDEX "data_subject_requests_status_created_at_idx" ON "data_subject_requests"("status", "created_at");
