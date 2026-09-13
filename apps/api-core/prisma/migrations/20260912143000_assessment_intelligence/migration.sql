-- Assessment intelligence persistence on skill verification attempts
ALTER TABLE "skill_verification_attempts"
ADD COLUMN IF NOT EXISTS "assessment_result_json" JSONB;
