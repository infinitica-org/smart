-- RM matching: JD text + parse metadata on job_openings (schema fields without prior migration).
ALTER TABLE "job_openings"
  ADD COLUMN IF NOT EXISTS "raw_text" TEXT,
  ADD COLUMN IF NOT EXISTS "jd_parse_status" "JdParseStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "parse_confidence" DECIMAL(4, 3),
  ADD COLUMN IF NOT EXISTS "parsed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "parsed_requirements" JSONB;
