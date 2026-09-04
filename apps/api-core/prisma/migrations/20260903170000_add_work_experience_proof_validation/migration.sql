-- AlterTable
ALTER TABLE "work_experience_documents" ADD COLUMN "validation_status" TEXT,
ADD COLUMN "validation_result" JSONB;
