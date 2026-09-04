-- AlterEnum
ALTER TYPE "WorkExperienceVerificationStatus" ADD VALUE IF NOT EXISTS 'PENDING_EMPLOYER';
ALTER TYPE "WorkExperienceVerificationStatus" ADD VALUE IF NOT EXISTS 'VERIFIED';
ALTER TYPE "WorkExperienceVerificationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- CreateTable
CREATE TABLE "work_experience_verification_attempts" (
    "id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "verifier_email" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "responded_at" TIMESTAMPTZ(6),
    "reminder_sent_at" TIMESTAMPTZ(6),
    "approved" BOOLEAN,
    "comments" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_experience_verification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_experience_verification_attempts_token_hash_key" ON "work_experience_verification_attempts"("token_hash");

-- CreateIndex
CREATE INDEX "work_experience_verification_attempts_experience_id_idx" ON "work_experience_verification_attempts"("experience_id");

-- AddForeignKey
ALTER TABLE "work_experience_verification_attempts" ADD CONSTRAINT "work_experience_verification_attempts_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "work_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
