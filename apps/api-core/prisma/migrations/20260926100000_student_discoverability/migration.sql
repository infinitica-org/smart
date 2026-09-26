-- S6-VV-113 (#552): a student can opt out of employer discovery. Everyone starts discoverable,
-- which keeps today's behavior.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "discoverable_to_employers" BOOLEAN NOT NULL DEFAULT true;
