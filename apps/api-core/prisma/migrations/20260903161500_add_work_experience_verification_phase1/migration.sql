-- Phase 1 Work Experience Verification data model: models, enums, relations, and indexes.

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "WorkExperienceVerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExperienceDocumentType" AS ENUM ('OFFER_LETTER', 'EXPERIENCE_LETTER', 'PAYSLIP', 'RELIEVING_LETTER', 'FORM_16', 'OTHER');

-- CreateTable
CREATE TABLE "work_experiences" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "company_id" UUID,
    "company_name" TEXT NOT NULL,
    "company_website" TEXT,
    "company_linkedin_url" TEXT,
    "role" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "department" TEXT,
    "domain" TEXT,
    "work_location" TEXT,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "responsibilities" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projects" JSONB,
    "candidate_linkedin" TEXT,
    "verifier_name" TEXT,
    "verifier_email" TEXT,
    "verifier_designation" TEXT,
    "verifier_phone" TEXT,
    "status" "WorkExperienceVerificationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_experience_documents" (
    "id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "document_type" "ExperienceDocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_experience_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_experiences_student_id_status_idx" ON "work_experiences"("student_id", "status");

-- CreateIndex
CREATE INDEX "work_experiences_company_id_idx" ON "work_experiences"("company_id");

-- CreateIndex
CREATE INDEX "work_experience_documents_experience_id_idx" ON "work_experience_documents"("experience_id");

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_experience_documents" ADD CONSTRAINT "work_experience_documents_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "work_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
