-- WE-T03: Manager Endorsement fields and table

ALTER TABLE "work_experiences"
  ADD COLUMN IF NOT EXISTS "doc_ok" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "completed_confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "overall_verified" BOOLEAN NOT NULL DEFAULT false;

DROP TABLE IF EXISTS "work_experience_manager_endorsements";

CREATE TABLE "work_experience_manager_endorsements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "experience_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "manager_email" TEXT NOT NULL,
  "manager_name" TEXT,
  "resolved_domain" TEXT,
  "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "responded_at" TIMESTAMPTZ(6),
  "reminder_sent_at" TIMESTAMPTZ(6),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "confirmed" BOOLEAN,
  "skill_ratings" JSONB,
  "comments" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "work_experience_manager_endorsements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_experience_manager_endorsements_experience_id_fkey"
    FOREIGN KEY ("experience_id") REFERENCES "work_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "work_experience_manager_endorsements_token_hash_key"
  ON "work_experience_manager_endorsements"("token_hash");

CREATE INDEX "work_experience_manager_endorsements_experience_id_idx"
  ON "work_experience_manager_endorsements"("experience_id");

CREATE INDEX "work_experience_manager_endorsements_manager_email_idx"
  ON "work_experience_manager_endorsements"("manager_email");
