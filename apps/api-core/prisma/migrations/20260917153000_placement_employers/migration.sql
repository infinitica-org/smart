-- Institution-scoped employer profiles for TPO placement (Company Repository source of truth).

CREATE TABLE "placement_employers" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "website" TEXT,
    "linkedin_url" TEXT,
    "sector" TEXT,
    "location" TEXT,
    "about_company" TEXT,
    "company_offers" TEXT,
    "additional_company_details" TEXT,
    "logo_storage_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "placement_employers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "placement_employers_institution_id_normalized_name_key"
    ON "placement_employers"("institution_id", "normalized_name");
CREATE INDEX "placement_employers_institution_id_idx"
    ON "placement_employers"("institution_id");

ALTER TABLE "placement_employers"
    ADD CONSTRAINT "placement_employers_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_openings" ADD COLUMN "placement_employer_id" UUID;

CREATE INDEX "job_openings_placement_employer_id_idx" ON "job_openings"("placement_employer_id");

ALTER TABLE "job_openings"
    ADD CONSTRAINT "job_openings_placement_employer_id_fkey"
    FOREIGN KEY ("placement_employer_id") REFERENCES "placement_employers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
