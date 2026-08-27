-- S1-VG-03: add exposure_count to items for parallel-form rotation and retirement
ALTER TABLE "items" ADD COLUMN "exposure_count" INTEGER NOT NULL DEFAULT 0;
