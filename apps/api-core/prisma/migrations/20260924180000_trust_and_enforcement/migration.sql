-- CreateEnum
CREATE TYPE "TrustCaseStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'ACTION_TAKEN', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TrustCaseSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EnforcementActionType" AS ENUM ('DISMISS', 'WARN', 'RESTRICT_ASSESSMENTS', 'SUSPEND_VERIFICATION', 'VOID_CREDENTIAL', 'VOID_ATTEMPT', 'BAN_ACCOUNT');

-- CreateEnum
CREATE TYPE "EnforcementStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVERSED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'UPHELD', 'REJECTED');

-- CreateEnum
CREATE TYPE "TrustReportStatus" AS ENUM ('RECEIVED', 'INVESTIGATING', 'ACTION_TAKEN', 'DISMISSED_INVALID');

-- CreateEnum
CREATE TYPE "TrustReportCategory" AS ENUM ('FRAUD', 'IMPERSONATION', 'PLAGIARISM', 'SPAM', 'OTHER');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'TRUST_ENFORCEMENT';

-- CreateTable
CREATE TABLE "trust_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "status" "TrustCaseStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "TrustCaseSeverity" NOT NULL DEFAULT 'MEDIUM',
    "summary" VARCHAR(500) NOT NULL,
    "assigned_admin_id" UUID,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_account_holds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "trust_case_id" UUID,
    "reason" VARCHAR(500) NOT NULL,
    "placed_by" UUID NOT NULL,
    "placed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "lifted_at" TIMESTAMPTZ(6),
    "lifted_by" UUID,
    "lift_reason" VARCHAR(500),

    CONSTRAINT "user_account_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enforcement_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trust_case_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "action_type" "EnforcementActionType" NOT NULL,
    "status" "EnforcementStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT NOT NULL,
    "applied_by" UUID NOT NULL,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "reversed_at" TIMESTAMPTZ(6),
    "reversed_by" UUID,
    "reversal_reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "enforcement_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "viewer_id" UUID,
    "viewer_ip" TEXT NOT NULL,
    "user_agent" TEXT,
    "accessed_slug" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_appeals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enforcement_action_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "supporting_doc_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "AppealStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewed_by" UUID,
    "review_notes" TEXT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "trust_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID,
    "reporter_email" TEXT,
    "target_user_id" UUID,
    "target_resource_type" TEXT,
    "target_resource_id" TEXT,
    "category" "TrustReportCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "evidence_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TrustReportStatus" NOT NULL DEFAULT 'RECEIVED',
    "trust_case_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_summary" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_reports_pkey" PRIMARY KEY ("id")
);

-- AlterTable CorroborationReviewFlag
ALTER TABLE "corroboration_review_flags" ADD COLUMN IF NOT EXISTS "trust_case_id" UUID;

-- Indexes
CREATE INDEX "trust_cases_candidate_id_idx" ON "trust_cases"("candidate_id");
CREATE INDEX "trust_cases_status_idx" ON "trust_cases"("status");
CREATE INDEX "trust_cases_severity_idx" ON "trust_cases"("severity");

CREATE INDEX "user_account_holds_user_id_lifted_at_idx" ON "user_account_holds"("user_id", "lifted_at");

CREATE INDEX "enforcement_actions_candidate_id_status_idx" ON "enforcement_actions"("candidate_id", "status");
CREATE INDEX "enforcement_actions_trust_case_id_idx" ON "enforcement_actions"("trust_case_id");

CREATE INDEX "profile_access_logs_candidate_id_created_at_idx" ON "profile_access_logs"("candidate_id", "created_at");
CREATE INDEX "profile_access_logs_viewer_ip_created_at_idx" ON "profile_access_logs"("viewer_ip", "created_at");

CREATE INDEX "trust_appeals_enforcement_action_id_idx" ON "trust_appeals"("enforcement_action_id");
CREATE INDEX "trust_appeals_candidate_id_status_idx" ON "trust_appeals"("candidate_id", "status");

CREATE INDEX "trust_reports_target_user_id_idx" ON "trust_reports"("target_user_id");
CREATE INDEX "trust_reports_status_idx" ON "trust_reports"("status");

-- Foreign Keys
ALTER TABLE "trust_cases" ADD CONSTRAINT "trust_cases_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trust_cases" ADD CONSTRAINT "trust_cases_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_account_holds" ADD CONSTRAINT "user_account_holds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_account_holds" ADD CONSTRAINT "user_account_holds_trust_case_id_fkey" FOREIGN KEY ("trust_case_id") REFERENCES "trust_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enforcement_actions" ADD CONSTRAINT "enforcement_actions_trust_case_id_fkey" FOREIGN KEY ("trust_case_id") REFERENCES "trust_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enforcement_actions" ADD CONSTRAINT "enforcement_actions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profile_access_logs" ADD CONSTRAINT "profile_access_logs_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_access_logs" ADD CONSTRAINT "profile_access_logs_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "trust_appeals" ADD CONSTRAINT "trust_appeals_enforcement_action_id_fkey" FOREIGN KEY ("enforcement_action_id") REFERENCES "enforcement_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trust_appeals" ADD CONSTRAINT "trust_appeals_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trust_reports" ADD CONSTRAINT "trust_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trust_reports" ADD CONSTRAINT "trust_reports_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trust_reports" ADD CONSTRAINT "trust_reports_trust_case_id_fkey" FOREIGN KEY ("trust_case_id") REFERENCES "trust_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "corroboration_review_flags" ADD CONSTRAINT "corroboration_review_flags_trust_case_id_fkey" FOREIGN KEY ("trust_case_id") REFERENCES "trust_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
