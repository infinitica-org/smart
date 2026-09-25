-- CreateEnum
CREATE TYPE "CompanyMemberRole" AS ENUM ('OWNER', 'RECRUITER');

-- CreateEnum
CREATE TYPE "CompanyEmployeeCount" AS ENUM ('E_1_10', 'E_11_50', 'E_51_200', 'E_201_500', 'E_501_1000', 'E_1000_PLUS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "company_role" "CompanyMemberRole";

-- Every company representative provisioned before EMP-02 is the company's owner.
UPDATE "users" SET "company_role" = 'OWNER' WHERE "role" = 'COMPANY' AND "company_id" IS NOT NULL;

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN "company_id" UUID,
ADD COLUMN "company_role" "CompanyMemberRole";

-- CreateIndex
CREATE INDEX "invitations_company_id_status_idx" ON "invitations"("company_id", "status");

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "logo_file_id" TEXT,
    "website" TEXT,
    "about" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "industry" TEXT,
    "employee_count" "CompanyEmployeeCount",
    "headquarters" TEXT,
    "additional_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_company_id_key" ON "company_profiles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_slug_key" ON "company_profiles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_user_id_scope_key_key" ON "idempotency_records"("user_id", "scope", "key");

-- CreateIndex
CREATE INDEX "idempotency_records_created_at_idx" ON "idempotency_records"("created_at");

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
