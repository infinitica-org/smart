-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'STUDENT', 'B2B_PARTNER');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'GOOGLE', 'GITHUB', 'SAML', 'OIDC');

-- CreateEnum
CREATE TYPE "TrackCategory" AS ENUM ('TECH', 'MBA');

-- CreateEnum
CREATE TYPE "TrackLaunchStatus" AS ENUM ('DRAFT', 'AVAILABLE_NEW', 'VALIDATED_LEAD');

-- CreateEnum
CREATE TYPE "CalibrationStatus" AS ENUM ('NOT_CALIBRATED', 'PROVISIONAL', 'PANEL_CALIBRATED', 'RELIABILITY_VERIFIED');

-- CreateEnum
CREATE TYPE "DomainCode" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateEnum
CREATE TYPE "LevelFormat" AS ENUM ('MCQ', 'SANDBOX', 'AUDIO_BARS', 'DEFENSE', 'CAPSTONE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTI', 'NUMERIC_ENTRY', 'SHORT_ANSWER', 'CODE_TASK', 'SQL_TASK', 'SCENARIO_RESPONSE', 'SPOKEN_RESPONSE', 'DEFENSE_PROMPT', 'ARTIFACT_UPLOAD');

-- CreateEnum
CREATE TYPE "DifficultyTag" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATING', 'EVALUATED', 'ABANDONED', 'VOIDED');

-- CreateEnum
CREATE TYPE "IntegrityFlag" AS ENUM ('CLEAN', 'FLAGGED_TIMING', 'FLAGGED_PROCTOR', 'FLAGGED_SIMILARITY', 'FLAGGED_AUDIO', 'UNDER_REVIEW', 'CLEARED');

-- CreateEnum
CREATE TYPE "Evaluator" AS ENUM ('AUTO_MCQ', 'AUTO_NUMERIC', 'SANDBOX_CHECK', 'CHECKLIST', 'LLM_BARS', 'HUMAN_RATER', 'HYBRID');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('GOLD', 'SILVER', 'BRONZE', 'BELOW_BRONZE');

-- CreateEnum
CREATE TYPE "CertifiableTier" AS ENUM ('GOLD', 'SILVER', 'BRONZE');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING_ISSUE', 'BLOCKED_INTEGRITY', 'ISSUED', 'SUPERSEDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "JdParseStatus" AS ENUM ('PENDING', 'PARSED', 'FAILED', 'MANUALLY_CORRECTED');

-- CreateEnum
CREATE TYPE "PlacementOutcome" AS ENUM ('NOT_SHORTLISTED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('ANTHROPIC', 'GOOGLE');

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL,
    "provider" "AuthProvider" NOT NULL DEFAULT 'PASSWORD',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "institution_id" UUID,
    "primary_track_id" UUID,
    "secondary_track_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'B2B_PARTNER',
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TrackCategory" NOT NULL,
    "launch_status" "TrackLaunchStatus" NOT NULL DEFAULT 'DRAFT',
    "calibration_status" "CalibrationStatus" NOT NULL DEFAULT 'NOT_CALIBRATED',
    "foundation_weight" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "capstone_brief" TEXT NOT NULL,
    "communication_domain" "DomainCode" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencies" (
    "id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "domain_code" "DomainCode" NOT NULL,
    "name" TEXT NOT NULL,
    "sub_domain" TEXT NOT NULL,
    "real_world_weight" DECIMAL(4,2) NOT NULL,
    "assessed_at_levels" INTEGER[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "level_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "format" "LevelFormat" NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "competency_id" UUID NOT NULL,
    "item_type" "ItemType" NOT NULL,
    "stem" TEXT NOT NULL,
    "model_answer" JSONB,
    "difficulty_tag" "DifficultyTag" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "form_code" TEXT NOT NULL DEFAULT 'A',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_options" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "item_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_panels" (
    "id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibration_panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panelists" (
    "id" UUID NOT NULL,
    "panel_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role_title" TEXT NOT NULL,
    "employer" TEXT NOT NULL,

    CONSTRAINT "panelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "angoff_estimates" (
    "id" UUID NOT NULL,
    "panel_id" UUID NOT NULL,
    "panelist_id" UUID NOT NULL,
    "tier" "CertifiableTier" NOT NULL,
    "estimate" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "angoff_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_scores" (
    "id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "tier" "CertifiableTier" NOT NULL,
    "mean" DECIMAL(5,2) NOT NULL,
    "sd" DECIMAL(5,2) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cut_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "form_code" TEXT NOT NULL DEFAULT 'A',
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "integrity_flag" "IntegrityFlag" NOT NULL DEFAULT 'CLEAN',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "answer" JSONB,
    "score" DECIMAL(5,2),
    "max_score" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "evaluated_by" "Evaluator",
    "evaluated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_results" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "raw_score" DECIMAL(5,2) NOT NULL,
    "tier_awarded" "Tier" NOT NULL,
    "confidence_band" TEXT NOT NULL,
    "borderline" BOOLEAN NOT NULL DEFAULT false,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "highest_level_cleared" INTEGER NOT NULL,
    "headline_tier" "CertifiableTier" NOT NULL,
    "tier_trail" JSONB NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING_ISSUE',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "verification_slug" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "track_id" UUID,
    "company_name" TEXT NOT NULL,
    "role_title" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "status" "JdParseStatus" NOT NULL DEFAULT 'PENDING',
    "thresholds" JSONB,
    "parse_confidence" DECIMAL(4,3),
    "manually_corrected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsed_at" TIMESTAMPTZ(6),

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "jd_id" UUID,
    "cycle" TEXT NOT NULL,
    "outcome" "PlacementOutcome" NOT NULL DEFAULT 'NOT_SHORTLISTED',
    "company_name" TEXT,
    "package_lpa" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrity_events" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "flag" "IntegrityFlag" NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integrity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "events" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_evaluation_audits" (
    "id" UUID NOT NULL,
    "response_id" UUID,
    "prompt_ref" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "used_fallback" BOOLEAN NOT NULL DEFAULT false,
    "estimated_cost_usd" DECIMAL(10,6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_evaluation_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_logs" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "policy" TEXT NOT NULL,
    "violations_count" INTEGER NOT NULL DEFAULT 1,
    "blocked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_domain_key" ON "institutions"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_institution_id_idx" ON "users"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_family_id_idx" ON "refresh_tokens"("user_id", "family_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_code_key" ON "tracks"("code");

-- CreateIndex
CREATE INDEX "competencies_track_id_domain_code_idx" ON "competencies"("track_id", "domain_code");

-- CreateIndex
CREATE UNIQUE INDEX "levels_track_id_level_number_key" ON "levels"("track_id", "level_number");

-- CreateIndex
CREATE INDEX "items_level_id_active_form_code_idx" ON "items"("level_id", "active", "form_code");

-- CreateIndex
CREATE UNIQUE INDEX "angoff_estimates_panelist_id_tier_key" ON "angoff_estimates"("panelist_id", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "cut_scores_level_id_tier_key" ON "cut_scores"("level_id", "tier");

-- CreateIndex
CREATE INDEX "attempts_user_id_status_idx" ON "attempts"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "responses_attempt_id_item_id_key" ON "responses"("attempt_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "level_results_attempt_id_key" ON "level_results"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verification_slug_key" ON "certificates"("verification_slug");

-- CreateIndex
CREATE INDEX "certificates_user_id_track_id_idx" ON "certificates"("user_id", "track_id");

-- CreateIndex
CREATE INDEX "placement_records_track_id_cycle_idx" ON "placement_records"("track_id", "cycle");

-- CreateIndex
CREATE INDEX "ai_evaluation_audits_created_at_idx" ON "ai_evaluation_audits"("created_at");

-- CreateIndex
CREATE INDEX "rate_limit_logs_identifier_created_at_idx" ON "rate_limit_logs"("identifier", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_primary_track_id_fkey" FOREIGN KEY ("primary_track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_secondary_track_id_fkey" FOREIGN KEY ("secondary_track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levels" ADD CONSTRAINT "levels_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_options" ADD CONSTRAINT "item_options_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_panels" ADD CONSTRAINT "calibration_panels_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_panels" ADD CONSTRAINT "calibration_panels_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panelists" ADD CONSTRAINT "panelists_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "calibration_panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "angoff_estimates" ADD CONSTRAINT "angoff_estimates_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "calibration_panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "angoff_estimates" ADD CONSTRAINT "angoff_estimates_panelist_id_fkey" FOREIGN KEY ("panelist_id") REFERENCES "panelists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_scores" ADD CONSTRAINT "cut_scores_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_results" ADD CONSTRAINT "level_results_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_results" ADD CONSTRAINT "level_results_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_records" ADD CONSTRAINT "placement_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_records" ADD CONSTRAINT "placement_records_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_records" ADD CONSTRAINT "placement_records_jd_id_fkey" FOREIGN KEY ("jd_id") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrity_events" ADD CONSTRAINT "integrity_events_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evaluation_audits" ADD CONSTRAINT "ai_evaluation_audits_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

