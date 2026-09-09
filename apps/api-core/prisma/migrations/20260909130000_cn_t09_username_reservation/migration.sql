-- CN-T09 Username Reservation + Visibility Toggle + Blocked-Word List

-- CreateEnum
CREATE TYPE "UsernameStatus" AS ENUM ('RESERVED', 'ACTIVE');

-- Add username/visibility columns to users
ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "users" ADD COLUMN "username_normalized" TEXT;
ALTER TABLE "users" ADD COLUMN "username_status" "UsernameStatus";
ALTER TABLE "users" ADD COLUMN "username_reserved_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "username_activated_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "username_failed_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "username_cooldown_until" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "profile_visible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "show_in_progress_items" BOOLEAN NOT NULL DEFAULT false;

-- Case-insensitive uniqueness is enforced by always writing the lowercased/trimmed
-- form into username_normalized and uniquely indexing that column, not "username" itself.
CREATE UNIQUE INDEX "users_username_normalized_key" ON "users"("username_normalized");

-- CreateTable "blocked_words"
CREATE TABLE "blocked_words" (
    "id" UUID NOT NULL,
    "word" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_words_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blocked_words_word_key" ON "blocked_words"("word");
