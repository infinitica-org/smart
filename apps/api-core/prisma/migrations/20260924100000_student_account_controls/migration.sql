-- STU-02: student account controls (messaging preference, deactivation, data-subject requests)

-- CreateEnum
CREATE TYPE "DataSubjectRequestType" AS ENUM ('CORRECTION', 'DELETION');

-- CreateEnum
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "allow_employer_messages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deactivated_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "data_subject_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "DataSubjectRequestType" NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'OPEN',
    "details" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_subject_requests_user_id_type_status_idx" ON "data_subject_requests"("user_id", "type", "status");

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
