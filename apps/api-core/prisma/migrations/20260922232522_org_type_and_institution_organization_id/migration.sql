-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('UNIVERSITY', 'EMPLOYER');

-- AlterTable
ALTER TABLE "institutions" ADD COLUMN     "organization_id" UUID;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "org_type" "OrganizationType" NOT NULL DEFAULT 'EMPLOYER';

-- CreateIndex
CREATE INDEX "institutions_organization_id_idx" ON "institutions"("organization_id");

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
