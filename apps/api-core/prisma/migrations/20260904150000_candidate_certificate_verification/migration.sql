-- CreateEnum
CREATE TYPE "CandidateCertificateStatus" AS ENUM ('DECLARED', 'UPLOADED', 'IN_VERIFICATION', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CertificateVerificationMethod" AS ENUM ('LLM', 'ENDORSEMENT');

-- CreateEnum
CREATE TYPE "CertificateProficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "CertificateEndorsementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "candidate_certificates" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "status" "CandidateCertificateStatus" NOT NULL DEFAULT 'DECLARED',
    "verification_method" "CertificateVerificationMethod",
    "certificate_file_url" TEXT,
    "certificate_file_name" TEXT,
    "file_mime_type" TEXT,
    "file_size_bytes" INTEGER,
    "learning_description" TEXT,
    "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "practical_applied" BOOLEAN,
    "practical_description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "candidate_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_certificate_skills" (
    "id" UUID NOT NULL,
    "candidate_certificate_id" UUID NOT NULL,
    "skill_code" TEXT NOT NULL,
    "self_assessed_proficiency" "CertificateProficiency" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_certificate_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_verification_events" (
    "id" UUID NOT NULL,
    "candidate_certificate_id" UUID NOT NULL,
    "status" "CandidateCertificateStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_verification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_endorsements" (
    "id" UUID NOT NULL,
    "candidate_certificate_id" UUID NOT NULL,
    "endorser_name" TEXT NOT NULL,
    "endorser_email" TEXT NOT NULL,
    "endorser_title" TEXT,
    "token_hash" TEXT NOT NULL,
    "status" "CertificateEndorsementStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "responded_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_certificates_candidate_id_status_idx" ON "candidate_certificates"("candidate_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_certificate_skills_candidate_certificate_id_skill_key" ON "candidate_certificate_skills"("candidate_certificate_id", "skill_code");

-- CreateIndex
CREATE INDEX "certificate_verification_events_candidate_certificate_id_cr_idx" ON "certificate_verification_events"("candidate_certificate_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_endorsements_token_hash_key" ON "certificate_endorsements"("token_hash");

-- CreateIndex
CREATE INDEX "certificate_endorsements_candidate_certificate_id_idx" ON "certificate_endorsements"("candidate_certificate_id");

-- AddForeignKey
ALTER TABLE "candidate_certificates" ADD CONSTRAINT "candidate_certificates_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_certificate_skills" ADD CONSTRAINT "candidate_certificate_skills_candidate_certificate_id_fkey" FOREIGN KEY ("candidate_certificate_id") REFERENCES "candidate_certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_verification_events" ADD CONSTRAINT "certificate_verification_events_candidate_certificate_id_fkey" FOREIGN KEY ("candidate_certificate_id") REFERENCES "candidate_certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_endorsements" ADD CONSTRAINT "certificate_endorsements_candidate_certificate_id_fkey" FOREIGN KEY ("candidate_certificate_id") REFERENCES "candidate_certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
