-- AlterTable
ALTER TABLE "users" ADD COLUMN "public_profile_slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_public_profile_slug_key" ON "users"("public_profile_slug");
