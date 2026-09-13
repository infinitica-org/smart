/*
  Warnings:

  - The values [PENDING,SOURCE_VERIFIED,SOURCE_FAILED,VOIDED] on the enum `CertificateSourceStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('WORK_EXPERIENCE', 'PROJECT', 'CREDENTIAL', 'PASSIVE_SIGNAL', 'ASSESSMENT', 'INTERVIEW', 'ARTIFACT', 'SELF_REPORT');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('CANDIDATE', 'EMPLOYER', 'ISSUER', 'PLATFORM', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EvidenceVerificationStatus" AS ENUM ('PENDING', 'PROVISIONAL', 'VERIFIED', 'DISPUTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationDecisionOutcome" AS ENUM ('VERIFIED', 'PROVISIONAL', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "CertificateSourceStatus_new" AS ENUM ('pending', 'source_verified', 'source_failed', 'voided');
ALTER TABLE "public"."candidate_certificates" ALTER COLUMN "source_status" DROP DEFAULT;
ALTER TABLE "candidate_certificates" ALTER COLUMN "source_status" TYPE "CertificateSourceStatus_new" USING ("source_status"::text::"CertificateSourceStatus_new");
ALTER TYPE "CertificateSourceStatus" RENAME TO "CertificateSourceStatus_old";
ALTER TYPE "CertificateSourceStatus_new" RENAME TO "CertificateSourceStatus";
DROP TYPE "public"."CertificateSourceStatus_old";
ALTER TABLE "candidate_certificates" ALTER COLUMN "source_status" SET DEFAULT 'pending';
COMMIT;

-- AlterTable
ALTER TABLE "candidate_certificate_verification_attempts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "candidate_certificates" ADD COLUMN     "expiry_date" TEXT,
ADD COLUMN     "issue_date" TEXT,
ALTER COLUMN "source_status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "candidate_role" TEXT,
ADD COLUMN     "components" JSONB,
ADD COLUMN     "constraints" JSONB,
ADD COLUMN     "decisions" JSONB,
ADD COLUMN     "nda_status" TEXT,
ADD COLUMN     "project_type" TEXT,
ADD COLUMN     "requirements" TEXT,
ADD COLUMN     "structured_outcomes" JSONB,
ADD COLUMN     "target_users" TEXT,
ADD COLUMN     "team_contribution" TEXT,
ADD COLUMN     "team_size" INTEGER;

-- AlterTable
ALTER TABLE "skill_claims" ADD COLUMN     "claim_confidence" DECIMAL(5,4),
ADD COLUMN     "evidence_summary" JSONB,
ADD COLUMN     "final_proficiency" "SkillProficiency",
ADD COLUMN     "interview_id" UUID,
ADD COLUMN     "target_proficiency" "SkillProficiency";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "career_domain_id" TEXT,
ADD COLUMN     "target_role_id" TEXT;

-- AlterTable
ALTER TABLE "work_experience_manager_endorsements" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_experiences" ADD COLUMN     "deliverables_structured" JSONB,
ADD COLUMN     "employment_verification" JSONB,
ADD COLUMN     "personal_contributions" JSONB;

-- CreateTable
CREATE TABLE "career_domains" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "skill_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "role_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "career_domain_id" UUID NOT NULL,
    "recommended_skill_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "optional_skill_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "target_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_evidence_profiles" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "career_domain_id" TEXT,
    "target_role_id" TEXT,
    "selected_skill_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "candidate_evidence_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_records" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "evidence_type" "EvidenceType" NOT NULL,
    "source" "EvidenceSource" NOT NULL,
    "source_owner" TEXT,
    "source_reference" TEXT,
    "evidence_date" TEXT,
    "submission_date" TIMESTAMPTZ(6),
    "claim" TEXT,
    "context" TEXT,
    "provenance" JSONB,
    "accessibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "related_skill_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verification_status" "EvidenceVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "evidence_strength" TEXT,
    "evidence_reliability" TEXT,
    "freshness" JSONB,
    "source_entity_id" UUID,
    "source_payload" JSONB,
    "verification_metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "evidence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_artifacts" (
    "id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "artifact_type" TEXT NOT NULL,
    "artifact_reference" TEXT NOT NULL,
    "owner" TEXT,
    "created_date" TEXT,
    "related_skill_code" TEXT,
    "related_contribution" TEXT,
    "related_component" TEXT,
    "contribution_supported" TEXT,
    "accessibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "integrity_status" TEXT NOT NULL DEFAULT 'UNCHECKED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_contradictions" (
    "id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "related_evidence_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detected_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "evidence_contradictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_claim_evidence_links" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "weight" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_claim_evidence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_decisions" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "evidence_summary" TEXT,
    "assessment_summary" TEXT,
    "interview_summary" TEXT,
    "decision" "VerificationDecisionOutcome" NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewer_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_experience_responsibilities" (
    "id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "task" TEXT NOT NULL,
    "skill_code" TEXT,
    "personal_contribution" TEXT NOT NULL,
    "responsibility_level" TEXT NOT NULL,
    "independence" TEXT,
    "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "decision" TEXT,
    "constraint_text" TEXT,
    "outcome" TEXT,
    "artifact_id" UUID,
    "activity" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_experience_responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_skill_mappings" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "skill_code" TEXT NOT NULL,
    "specific_contribution" TEXT NOT NULL,
    "component_worked_on" TEXT,
    "actions_performed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "decisions_made" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "constraints_handled" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "artifact_id" UUID,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "activity" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_skill_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_credentials" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "issuer" TEXT NOT NULL,
    "credential_name" TEXT NOT NULL,
    "credential_type" TEXT NOT NULL,
    "external_credential_id" TEXT,
    "issue_date" TEXT,
    "expiry_date" TEXT,
    "jurisdiction" TEXT,
    "scope" TEXT,
    "verification_source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "assessment_type" TEXT,
    "practical_component" BOOLEAN NOT NULL DEFAULT false,
    "covered_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "covered_skill_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "application_evidence" JSONB,
    "verification_method" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "professional_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passive_signal_evidence" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "account_reference" TEXT NOT NULL,
    "activity" JSONB,
    "activity_period_start" TIMESTAMPTZ(6),
    "activity_period_end" TIMESTAMPTZ(6),
    "relevant_artifact_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skill_mappings" JSONB,
    "signal_strength" DECIMAL(5,4),
    "reliability" TEXT,
    "anomalies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "passive_signal_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "career_domains_code_key" ON "career_domains"("code");

-- CreateIndex
CREATE UNIQUE INDEX "target_roles_code_key" ON "target_roles"("code");

-- CreateIndex
CREATE INDEX "target_roles_career_domain_id_idx" ON "target_roles"("career_domain_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_evidence_profiles_student_id_key" ON "candidate_evidence_profiles"("student_id");

-- CreateIndex
CREATE INDEX "evidence_records_student_id_evidence_type_idx" ON "evidence_records"("student_id", "evidence_type");

-- CreateIndex
CREATE INDEX "evidence_records_student_id_verification_status_idx" ON "evidence_records"("student_id", "verification_status");

-- CreateIndex
CREATE INDEX "evidence_artifacts_evidence_id_idx" ON "evidence_artifacts"("evidence_id");

-- CreateIndex
CREATE INDEX "evidence_contradictions_evidence_id_idx" ON "evidence_contradictions"("evidence_id");

-- CreateIndex
CREATE INDEX "skill_claim_evidence_links_evidence_id_idx" ON "skill_claim_evidence_links"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_claim_evidence_links_claim_id_evidence_id_key" ON "skill_claim_evidence_links"("claim_id", "evidence_id");

-- CreateIndex
CREATE INDEX "verification_decisions_claim_id_created_at_idx" ON "verification_decisions"("claim_id", "created_at");

-- CreateIndex
CREATE INDEX "work_experience_responsibilities_experience_id_idx" ON "work_experience_responsibilities"("experience_id");

-- CreateIndex
CREATE INDEX "project_skill_mappings_project_id_idx" ON "project_skill_mappings"("project_id");

-- CreateIndex
CREATE INDEX "professional_credentials_student_id_idx" ON "professional_credentials"("student_id");

-- CreateIndex
CREATE INDEX "passive_signal_evidence_student_id_source_idx" ON "passive_signal_evidence"("student_id", "source");

-- RenameForeignKey
ALTER TABLE "candidate_certificate_verification_attempts" RENAME CONSTRAINT "candidate_certificate_verification_attempts_candidate_certifica" TO "candidate_certificate_verification_attempts_candidate_cert_fkey";

-- AddForeignKey
ALTER TABLE "target_roles" ADD CONSTRAINT "target_roles_career_domain_id_fkey" FOREIGN KEY ("career_domain_id") REFERENCES "career_domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_evidence_profiles" ADD CONSTRAINT "candidate_evidence_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_contradictions" ADD CONSTRAINT "evidence_contradictions_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_claim_evidence_links" ADD CONSTRAINT "skill_claim_evidence_links_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "skill_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_claim_evidence_links" ADD CONSTRAINT "skill_claim_evidence_links_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_decisions" ADD CONSTRAINT "verification_decisions_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "skill_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_experience_responsibilities" ADD CONSTRAINT "work_experience_responsibilities_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "work_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skill_mappings" ADD CONSTRAINT "project_skill_mappings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passive_signal_evidence" ADD CONSTRAINT "passive_signal_evidence_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "candidate_certificate_verification_attempts_candidate_certifi_i" RENAME TO "candidate_certificate_verification_attempts_candidate_certi_idx";
