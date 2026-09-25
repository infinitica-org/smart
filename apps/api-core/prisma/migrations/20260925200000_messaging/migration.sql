-- COM-01 Messaging (Th6-422 .. Th6-430)

-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'MESSAGE';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'MESSAGE';

-- CreateEnum
CREATE TYPE "ConversationParticipantRole" AS ENUM ('STUDENT', 'EMPLOYER', 'ADVISOR');
CREATE TYPE "MessageModerationStatus" AS ENUM ('NONE', 'REPORTED', 'HELD');

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "pair_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conversations_pair_key_key" ON "conversations"("pair_key");
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");

CREATE TABLE "conversation_participants" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ConversationParticipantRole" NOT NULL,
    "org_id" UUID,
    "last_read_at" TIMESTAMPTZ(6),
    "muted_at" TIMESTAMPTZ(6),
    "hidden_at" TIMESTAMPTZ(6),
    "left_at" TIMESTAMPTZ(6),
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conversation_participants_conversation_id_user_id_key" ON "conversation_participants"("conversation_id", "user_id");
CREATE INDEX "conversation_participants_user_id_hidden_at_idx" ON "conversation_participants"("user_id", "hidden_at");

CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "moderation_status" "MessageModerationStatus" NOT NULL DEFAULT 'NONE',
    "idempotency_key" TEXT NOT NULL,
    -- Th6-425: full-text search, kept in sync by Postgres itself.
    "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', "body")) STORED,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_body_length" CHECK (char_length("body") <= 4000)
);
CREATE UNIQUE INDEX "messages_sender_id_idempotency_key_key" ON "messages"("sender_id", "idempotency_key");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX "messages_search_vector_idx" ON "messages" USING GIN ("search_vector");

CREATE TABLE "blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id")
);
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

CREATE TABLE "moderation_holds" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "held_until" TIMESTAMPTZ(6) NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "moderation_holds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "moderation_holds_report_id_key" ON "moderation_holds"("report_id");
CREATE INDEX "moderation_holds_message_id_idx" ON "moderation_holds"("message_id");
CREATE INDEX "moderation_holds_held_until_released_at_idx" ON "moderation_holds"("held_until", "released_at");

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_holds" ADD CONSTRAINT "moderation_holds_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
