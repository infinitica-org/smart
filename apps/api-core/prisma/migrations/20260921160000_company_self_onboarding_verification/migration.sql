-- Company self-onboarding persistence (session, verification submissions, document metadata).

CREATE TYPE "CompanyOnboardingStatus" AS ENUM (
  'DRAFT',
  'EMAIL_VERIFICATION_PENDING',
  'EMAIL_VERIFIED',
  'SUBMITTED',
  'PENDING_REVIEW',
  'RESUBMISSION_ALLOWED',
  'ACCOUNT_ACTIVE',
  'WITHDRAWN',
  'EXPIRED'
);

CREATE TYPE "CompanyVerificationDocumentType" AS ENUM (
  'BUSINESS_REGISTRATION',
  'CERTIFICATE_OF_INCORPORATION',
  'TAX_DOCUMENT',
  'GOVERNMENT_ID',
  'AUTHORITY_PROOF',
  'COMPANY_LOGO',
  'OTHER'
);

CREATE TYPE "CompanyVerificationDocumentReviewStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED'
);

CREATE TYPE "CompanyVerificationDocumentUploadedBy" AS ENUM (
  'REPRESENTATIVE',
  'SUPER_ADMIN'
);

CREATE TABLE "company_onboarding_sessions" (
  "id" UUID NOT NULL,
  "company_id" UUID,
  "onboarding_status" "CompanyOnboardingStatus" NOT NULL DEFAULT 'DRAFT',
  "session_token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "representative_email" TEXT NOT NULL,
  "representative_snapshot" JSONB,
  "profile_draft" JSONB,
  "user_id" UUID,
  "email_verified_at" TIMESTAMPTZ(6),
  "email_verification_code_hash" TEXT,
  "email_verification_expires_at" TIMESTAMPTZ(6),
  "last_email_sent_at" TIMESTAMPTZ(6),
  "submitted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "company_onboarding_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_onboarding_sessions_session_token_hash_key"
  ON "company_onboarding_sessions"("session_token_hash");
CREATE INDEX "company_onboarding_sessions_company_id_idx"
  ON "company_onboarding_sessions"("company_id");
CREATE INDEX "company_onboarding_sessions_onboarding_status_idx"
  ON "company_onboarding_sessions"("onboarding_status");
CREATE INDEX "company_onboarding_sessions_expires_at_idx"
  ON "company_onboarding_sessions"("expires_at");
CREATE INDEX "company_onboarding_sessions_representative_email_idx"
  ON "company_onboarding_sessions"("representative_email");

CREATE TABLE "company_verifications" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "onboarding_session_id" UUID,
  "registration_country" CHAR(2) NOT NULL,
  "jurisdiction_code" TEXT,
  "legal_name" TEXT NOT NULL,
  "registered_address" JSONB NOT NULL,
  "business_registration_number" TEXT,
  "tax_id" TEXT,
  "registration_authority" TEXT,
  "submitted_at" TIMESTAMPTZ(6),
  "reviewed_at" TIMESTAMPTZ(6),
  "reviewed_by_id" UUID,
  "review_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "company_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "company_verifications_company_id_submitted_at_idx"
  ON "company_verifications"("company_id", "submitted_at");
CREATE INDEX "company_verifications_onboarding_session_id_idx"
  ON "company_verifications"("onboarding_session_id");
CREATE INDEX "company_verifications_tax_id_idx"
  ON "company_verifications"("tax_id");

CREATE TABLE "company_verification_documents" (
  "id" UUID NOT NULL,
  "company_verification_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "document_type" "CompanyVerificationDocumentType" NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size_bytes" INTEGER NOT NULL,
  "storage_key" TEXT NOT NULL,
  "uploaded_by" "CompanyVerificationDocumentUploadedBy" NOT NULL,
  "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "review_status" "CompanyVerificationDocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
  "review_reason" TEXT,
  "reviewed_at" TIMESTAMPTZ(6),
  "reviewed_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "company_verification_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "company_verification_documents_company_verification_id_idx"
  ON "company_verification_documents"("company_verification_id");
CREATE INDEX "company_verification_documents_company_id_review_status_idx"
  ON "company_verification_documents"("company_id", "review_status");

ALTER TABLE "company_onboarding_sessions"
  ADD CONSTRAINT "company_onboarding_sessions_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "company_onboarding_sessions"
  ADD CONSTRAINT "company_onboarding_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "company_verifications"
  ADD CONSTRAINT "company_verifications_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_verifications"
  ADD CONSTRAINT "company_verifications_onboarding_session_id_fkey"
  FOREIGN KEY ("onboarding_session_id") REFERENCES "company_onboarding_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "company_verifications"
  ADD CONSTRAINT "company_verifications_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "company_verification_documents"
  ADD CONSTRAINT "company_verification_documents_company_verification_id_fkey"
  FOREIGN KEY ("company_verification_id") REFERENCES "company_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_verification_documents"
  ADD CONSTRAINT "company_verification_documents_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_verification_documents"
  ADD CONSTRAINT "company_verification_documents_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
