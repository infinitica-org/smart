-- S6-VV-75 Academic scores — adds CGPA (0-10) and 10th/12th (SSC/HSC) percentage (0-100)
-- to the student profile. Nullable/additive only; existing rows get NULL and are simply
-- excluded by any downstream filter that requires a value (e.g. matching's minCgpa filter).
ALTER TABLE "users" ADD COLUMN "cgpa" DECIMAL(4,2);
ALTER TABLE "users" ADD COLUMN "ssc_percentage" DECIMAL(5,2);
ALTER TABLE "users" ADD COLUMN "hsc_percentage" DECIMAL(5,2);
