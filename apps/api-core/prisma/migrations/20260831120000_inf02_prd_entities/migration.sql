-- INF-02: companies, skills, claims, verification attempts, projects,
-- jobs/applications/ATS, cognitive/comm profiles, audit logs, plans, flags.

-- CreateEnum
CREATE TYPE "TenantVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "CompanyMode" AS ENUM ('SERVICE', 'PRODUCT');
CREATE TYPE "SkillProficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "SkillClaimStatus" AS ENUM ('DECLARED', 'VERIFIED', 'BEGINNER_REATTEMPT', 'LOCKED');
CREATE TYPE "JobOpeningStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');
CREATE TYPE "AtsStage" AS ENUM ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "ProjectStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'UNDER_REVIEW', 'REJECTED');
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'BASIC', 'PRO');

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

INSERT INTO "subscription_plans" ("id", "code", "name") VALUES
    (gen_random_uuid(), 'FREE', 'Free'),
    (gen_random_uuid(), 'BASIC', 'Basic'),
    (gen_random_uuid(), 'PRO', 'Pro');

ALTER TABLE "institutions"
    ADD COLUMN "taxonomy_domain" TEXT,
    ADD COLUMN "verification_status" "TenantVerificationStatus" NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN "verification_reason" TEXT,
    ADD COLUMN "deactivated_at" TIMESTAMPTZ(6),
    ADD COLUMN "plan_id" UUID;

UPDATE "institutions"
SET "plan_id" = (SELECT "id" FROM "subscription_plans" WHERE "code" = 'PRO' LIMIT 1)
WHERE "plan_id" IS NULL;

ALTER TABLE "institutions" ALTER COLUMN "plan_id" SET NOT NULL;

ALTER TABLE "institutions"
    ADD CONSTRAINT "institutions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "gstin" TEXT,
    "website" TEXT,
    "linkedin_url" TEXT,
    "sector" TEXT,
    "mode" "CompanyMode",
    "taxonomy_domain" TEXT,
    "size_band" TEXT,
    "location" TEXT,
    "verification_status" "TenantVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_reason" TEXT,
    "deactivated_at" TIMESTAMPTZ(6),
    "plan_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_domain_key" ON "companies"("domain");

ALTER TABLE "companies"
    ADD CONSTRAINT "companies_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users" ADD COLUMN "company_id" UUID;
CREATE INDEX "users_company_id_idx" ON "users"("company_id");
ALTER TABLE "users"
    ADD CONSTRAINT "users_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "cooldown_days" INTEGER NOT NULL DEFAULT 60,
    "validity_days" INTEGER NOT NULL DEFAULT 180,
    "beginner_pass_threshold" DECIMAL(5,2) NOT NULL DEFAULT 60,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skills_code_key" ON "skills"("code");
CREATE INDEX "skills_domain_active_idx" ON "skills"("domain", "active");

CREATE TABLE "skill_claims" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "proficiency" "SkillProficiency" NOT NULL,
    "status" "SkillClaimStatus" NOT NULL DEFAULT 'DECLARED',
    "strikes" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "verified_until" TIMESTAMPTZ(6),
    "last_attempt_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "skill_claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_claims_student_id_skill_id_key" ON "skill_claims"("student_id", "skill_id");
CREATE INDEX "skill_claims_status_idx" ON "skill_claims"("status");

ALTER TABLE "skill_claims"
    ADD CONSTRAINT "skill_claims_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "skill_claims_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "skill_verification_attempts" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "assessment_attempt_id" UUID,
    "claimed_proficiency" "SkillProficiency" NOT NULL,
    "technical_failure" BOOLEAN NOT NULL DEFAULT false,
    "passed" BOOLEAN,
    "explanation" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_verification_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "skill_verification_attempts_claim_id_created_at_idx" ON "skill_verification_attempts"("claim_id", "created_at");

ALTER TABLE "skill_verification_attempts"
    ADD CONSTRAINT "skill_verification_attempts_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "skill_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "skill_verification_attempts_assessment_attempt_id_fkey" FOREIGN KEY ("assessment_attempt_id") REFERENCES "attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "stack" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "loom_url" TEXT,
    "github_url" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "projects_student_id_status_idx" ON "projects"("student_id", "status");

ALTER TABLE "projects"
    ADD CONSTRAINT "projects_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "project_verification_reports" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "plagiarism_flag" BOOLEAN NOT NULL DEFAULT false,
    "tech_age_flag" BOOLEAN NOT NULL DEFAULT false,
    "relevance_score" DECIMAL(5,2) NOT NULL,
    "explanation" TEXT NOT NULL,
    "routed_to_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_verification_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_verification_reports_project_id_key" ON "project_verification_reports"("project_id");

ALTER TABLE "project_verification_reports"
    ADD CONSTRAINT "project_verification_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_openings" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "company_id" UUID,
    "company_name" TEXT NOT NULL,
    "role_title" TEXT NOT NULL,
    "domain_code" TEXT,
    "min_years_experience" INTEGER,
    "location" TEXT,
    "employment_type" TEXT,
    "headcount" INTEGER,
    "status" "JobOpeningStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_openings_institution_id_status_idx" ON "job_openings"("institution_id", "status");
CREATE INDEX "job_openings_company_id_idx" ON "job_openings"("company_id");

ALTER TABLE "job_openings"
    ADD CONSTRAINT "job_openings_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "job_openings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "job_openings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "job_opening_skills" (
    "id" UUID NOT NULL,
    "opening_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "min_proficiency" "SkillProficiency" NOT NULL,

    CONSTRAINT "job_opening_skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_opening_skills_opening_id_skill_id_key" ON "job_opening_skills"("opening_id", "skill_id");

ALTER TABLE "job_opening_skills"
    ADD CONSTRAINT "job_opening_skills_opening_id_fkey" FOREIGN KEY ("opening_id") REFERENCES "job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "job_opening_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "opening_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "stage" "AtsStage" NOT NULL DEFAULT 'APPLIED',
    "match_score" DECIMAL(4,3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "applications_opening_id_student_id_key" ON "applications"("opening_id", "student_id");
CREATE INDEX "applications_opening_id_stage_idx" ON "applications"("opening_id", "stage");
CREATE INDEX "applications_student_id_stage_idx" ON "applications"("student_id", "stage");

ALTER TABLE "applications"
    ADD CONSTRAINT "applications_opening_id_fkey" FOREIGN KEY ("opening_id") REFERENCES "job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "application_stage_events" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "from_stage" "AtsStage",
    "to_stage" "AtsStage" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_stage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_stage_events_application_id_created_at_idx" ON "application_stage_events"("application_id", "created_at");

ALTER TABLE "application_stage_events"
    ADD CONSTRAINT "application_stage_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cognitive_profiles" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "narrative" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "score" DECIMAL(5,2),
    "refreshed_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cognitive_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cognitive_profiles_student_id_key" ON "cognitive_profiles"("student_id");

ALTER TABLE "cognitive_profiles"
    ADD CONSTRAINT "cognitive_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "communication_profiles" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "narrative" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "score" DECIMAL(5,2),
    "refreshed_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "communication_profiles_student_id_key" ON "communication_profiles"("student_id");

ALTER TABLE "communication_profiles"
    ADD CONSTRAINT "communication_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "reason_code" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

CREATE TABLE "plan_entitlements" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "feature_flag_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plan_entitlements_plan_id_feature_flag_id_key" ON "plan_entitlements"("plan_id", "feature_flag_id");

ALTER TABLE "plan_entitlements"
    ADD CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "plan_entitlements_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "feature_flag_overrides" (
    "id" UUID NOT NULL,
    "feature_flag_id" UUID NOT NULL,
    "institution_id" UUID,
    "company_id" UUID,
    "enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feature_flag_overrides_institution_id_idx" ON "feature_flag_overrides"("institution_id");
CREATE INDEX "feature_flag_overrides_company_id_idx" ON "feature_flag_overrides"("company_id");

ALTER TABLE "feature_flag_overrides"
    ADD CONSTRAINT "feature_flag_overrides_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "feature_flag_overrides_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "feature_flag_overrides_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
