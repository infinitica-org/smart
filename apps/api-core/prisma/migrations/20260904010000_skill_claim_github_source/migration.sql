-- CreateEnum
CREATE TYPE "SkillClaimSource" AS ENUM ('MANUAL', 'GITHUB_DERIVED');

-- AlterTable
ALTER TABLE "skill_claims" ADD COLUMN "source" "SkillClaimSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "skill_claims" ADD COLUMN "source_metadata" JSONB;
