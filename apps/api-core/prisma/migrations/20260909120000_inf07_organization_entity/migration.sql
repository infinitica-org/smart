-- INF-07 Organization Entity Forward-Only Migration

-- CreateTable "organizations"
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "verification_status" "TenantVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Create UNIQUE index on domain for non-null values
CREATE UNIQUE INDEX "organizations_domain_key" ON "organizations"("domain");

-- Add organization_id column to companies
ALTER TABLE "companies" ADD COLUMN "organization_id" UUID;

-- Add organization_id and company_name_raw columns to work_experiences
ALTER TABLE "work_experiences" ADD COLUMN "organization_id" UUID;
ALTER TABLE "work_experiences" ADD COLUMN "company_name_raw" TEXT;

-- Backfill Organizations from existing Company rows
INSERT INTO "organizations" ("id", "name", "domain", "verification_status", "verification_reason", "created_at", "updated_at")
SELECT
    c."id",
    c."name",
    NULLIF(TRIM(c."website"), ''),
    c."verification_status",
    c."verification_reason",
    c."created_at",
    CURRENT_TIMESTAMP
FROM "companies" c
ON CONFLICT ("id") DO NOTHING;

-- Backfill companies.organization_id with company.id
UPDATE "companies" SET "organization_id" = "id" WHERE "organization_id" IS NULL;

-- Backfill company_name_raw for existing work_experiences
UPDATE "work_experiences" SET "company_name_raw" = "company_name" WHERE "company_name_raw" IS NULL;

-- Backfill work_experiences.organization_id for work experiences with company_id set
UPDATE "work_experiences" we
SET "organization_id" = c."organization_id"
FROM "companies" c
WHERE we."company_id" = c."id" AND we."organization_id" IS NULL;

-- Backfill work_experiences.organization_id for work experiences without company_id
WITH unlinked AS (
    SELECT DISTINCT TRIM("company_name") AS raw_name
    FROM "work_experiences"
    WHERE "organization_id" IS NULL AND "company_name" IS NOT NULL AND TRIM("company_name") != ''
),
new_orgs AS (
    INSERT INTO "organizations" ("id", "name", "verification_status", "created_at", "updated_at")
    SELECT gen_random_uuid(), raw_name, 'PENDING'::"TenantVerificationStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM unlinked
    ON CONFLICT DO NOTHING
    RETURNING "id", "name"
)
UPDATE "work_experiences" we
SET "organization_id" = o."id"
FROM "organizations" o
WHERE we."organization_id" IS NULL
  AND LOWER(TRIM(we."company_name")) = LOWER(TRIM(o."name"));

-- Create Indexes
CREATE INDEX "companies_organization_id_idx" ON "companies"("organization_id");
CREATE INDEX "work_experiences_organization_id_idx" ON "work_experiences"("organization_id");

-- Add Foreign Keys
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
