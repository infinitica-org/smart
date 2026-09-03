-- CN-T01: server-side candidate onboarding gate + persisted profile/consent.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "onboarding_details" JSONB,
  ADD COLUMN IF NOT EXISTS "dpdp_consent_at" TIMESTAMPTZ(6);
