-- S6-VV-150: backfill the migration PR #305 (S6-RM-21) never shipped.
-- CorroborationSnapshot, CorroborationReviewFlag and the
-- PassiveSignalEvidence @@unique([studentId, source]) are in schema.prisma
-- but no migration created them, so DBs built with `migrate deploy` lack them.
-- Guarded DDL: a no-op on any DB that already got them via `db push`.

-- CreateTable
CREATE TABLE IF NOT EXISTS "corroboration_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "taxonomy_version" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "readouts" JSONB NOT NULL,
    "pending_flag_ids" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corroboration_snapshots_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX IF NOT EXISTS "corroboration_snapshots_user_id_key" ON "corroboration_snapshots"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "corroboration_review_flags_user_id_idx" ON "corroboration_review_flags"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "corroboration_review_flags_claim_id_skill_code_idx" ON "corroboration_review_flags"("claim_id", "skill_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "corroboration_review_flags_resolved_at_idx" ON "corroboration_review_flags"("resolved_at");

-- CreateIndex
-- Fails loudly (rather than deleting rows) if duplicate (student_id, source)
-- pairs exist. None should: before #305 app code only read this table, and
-- #305's upsert needs this index to insert at all.
CREATE UNIQUE INDEX IF NOT EXISTS "passive_signal_evidence_student_id_source_key" ON "passive_signal_evidence"("student_id", "source");

-- AddForeignKey (Postgres has no ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'corroboration_snapshots_user_id_fkey'
      AND conrelid = '"corroboration_snapshots"'::regclass
  ) THEN
    ALTER TABLE "corroboration_snapshots" ADD CONSTRAINT "corroboration_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'corroboration_review_flags_user_id_fkey'
      AND conrelid = '"corroboration_review_flags"'::regclass
  ) THEN
    ALTER TABLE "corroboration_review_flags" ADD CONSTRAINT "corroboration_review_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
