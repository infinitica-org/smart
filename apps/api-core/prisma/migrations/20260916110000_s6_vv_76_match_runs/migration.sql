-- S6-VV-76 Async batch-scoped matching — persists one row per triggered match job so a TPO
-- can poll its status (PENDING/RUNNING/SUCCEEDED/FAILED) and read back its KPIs/result once done.
CREATE TABLE "match_runs" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "jd_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "batch_ids" UUID[] NOT NULL,
    "min_cgpa" DECIMAL(4,2),
    "required_skill_codes" TEXT[] NOT NULL,
    "limit" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "eligible_pool_count" INTEGER,
    "suggested_count" INTEGER,
    "shortlist_id" UUID,
    "result_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "match_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "match_runs_institution_id_jd_id_idx" ON "match_runs"("institution_id", "jd_id");

ALTER TABLE "match_runs" ADD CONSTRAINT "match_runs_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "match_runs" ADD CONSTRAINT "match_runs_requested_by_id_fkey"
    FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
