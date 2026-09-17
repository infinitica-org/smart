-- S6-SV-78 — extended TPO job posting copy and drive metadata on existing job_openings rows.
ALTER TABLE "job_openings"
  ADD COLUMN "category_code" TEXT,
  ADD COLUMN "about_company" TEXT,
  ADD COLUMN "company_offers" TEXT,
  ADD COLUMN "additional_company_details" TEXT,
  ADD COLUMN "role_details" TEXT,
  ADD COLUMN "salary_details" TEXT,
  ADD COLUMN "round_details" TEXT,
  ADD COLUMN "hiring_details" TEXT,
  ADD COLUMN "drive_spoc" TEXT,
  ADD COLUMN "drive_date" DATE,
  ADD COLUMN "last_date_to_apply" DATE;
