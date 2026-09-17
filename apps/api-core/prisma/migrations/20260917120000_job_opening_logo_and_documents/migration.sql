-- Job posting company logo URL and attached document metadata (JSON array).
ALTER TABLE "job_openings" ADD COLUMN IF NOT EXISTS "company_logo_url" TEXT;
ALTER TABLE "job_openings" ADD COLUMN IF NOT EXISTS "attached_documents" JSONB;
