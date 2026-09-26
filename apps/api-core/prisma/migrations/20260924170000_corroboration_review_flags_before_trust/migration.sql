-- S6-VV-151: `20260924180000_trust_and_enforcement` alters "corroboration_review_flags",
-- but that table is only created by `20260925120000_corroboration_tables_and_passive_signal_unique`
-- (S6-VV-150), which sorts later. On any database built with `migrate deploy` from scratch
-- (CI, a fresh VPS, a restore drill), trust_and_enforcement fails with 42P01.
-- This creates the table just before it. The DDL is copied from S6-VV-150's migration and
-- guarded, so it is a no-op where the table already exists, and S6-VV-150's own guarded DDL
-- then skips it.

-- CreateTable
CREATE TABLE IF NOT EXISTS "corroboration_review_flags" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "institution_id" UUID,
    "claim_id" UUID,
    "skill_code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "passive_score" DECIMAL(5,4) NOT NULL,
    "assessment_score" DECIMAL(5,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_note" TEXT,

    CONSTRAINT "corroboration_review_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "corroboration_review_flags_user_id_idx" ON "corroboration_review_flags"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "corroboration_review_flags_claim_id_skill_code_idx" ON "corroboration_review_flags"("claim_id", "skill_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "corroboration_review_flags_resolved_at_idx" ON "corroboration_review_flags"("resolved_at");

-- AddForeignKey (Postgres has no ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'corroboration_review_flags_user_id_fkey'
      AND conrelid = '"corroboration_review_flags"'::regclass
  ) THEN
    ALTER TABLE "corroboration_review_flags" ADD CONSTRAINT "corroboration_review_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
