-- CV-T02: agenda-based cert assessment retry state + attempt log

ALTER TYPE "CertificateVerificationMethod" ADD VALUE 'ASSESSMENT';

ALTER TABLE "candidate_certificates"
  ADD COLUMN "track_code" TEXT,
  ADD COLUMN "agenda_lines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "expiry_date" TIMESTAMPTZ,
  ADD COLUMN "assessment_strikes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "assessment_locked_until" TIMESTAMPTZ,
  ADD COLUMN "last_genuine_failure_at" TIMESTAMPTZ,
  ADD COLUMN "taxonomy_version_snapshot" TEXT;

CREATE TABLE "candidate_certificate_verification_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "candidate_certificate_id" UUID NOT NULL,
  "technical_failure" BOOLEAN NOT NULL DEFAULT false,
  "passed" BOOLEAN,
  "explanation" TEXT NOT NULL,
  "marks_earned" DOUBLE PRECISION,
  "marks_total" DOUBLE PRECISION,
  "score_percent" DOUBLE PRECISION,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "candidate_certificate_verification_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "candidate_certificate_verification_attempts_candidate_certificate_fkey"
    FOREIGN KEY ("candidate_certificate_id") REFERENCES "candidate_certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "candidate_certificate_verification_attempts_candidate_certifi_idx"
  ON "candidate_certificate_verification_attempts"("candidate_certificate_id", "created_at");
