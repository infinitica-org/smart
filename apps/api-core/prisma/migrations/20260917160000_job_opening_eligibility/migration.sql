-- Job opening academic eligibility + student backlog flag
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_active_backlog" BOOLEAN;

ALTER TABLE "job_openings" ADD COLUMN IF NOT EXISTS "min_ssc_percentage" DECIMAL(5,2);
ALTER TABLE "job_openings" ADD COLUMN IF NOT EXISTS "min_hsc_percentage" DECIMAL(5,2);
ALTER TABLE "job_openings" ADD COLUMN IF NOT EXISTS "min_college_percentage" DECIMAL(5,2);
ALTER TABLE "job_openings" ADD COLUMN IF NOT EXISTS "backlogs_allowed" BOOLEAN NOT NULL DEFAULT true;
