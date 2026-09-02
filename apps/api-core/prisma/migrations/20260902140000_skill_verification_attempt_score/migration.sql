-- SE-T01/CN-T04: record the mark-weighted written-assessment score that
-- produced a skill-verification outcome, not just pass/fail.

-- AlterTable
ALTER TABLE "skill_verification_attempts" ADD COLUMN "marks_earned" DECIMAL(6,2);
ALTER TABLE "skill_verification_attempts" ADD COLUMN "marks_total" DECIMAL(6,2);
ALTER TABLE "skill_verification_attempts" ADD COLUMN "score_percent" DECIMAL(5,2);
