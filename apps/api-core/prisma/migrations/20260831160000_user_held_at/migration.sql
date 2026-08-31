ALTER TABLE "users" ADD COLUMN "held_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN "held_reason" TEXT;
