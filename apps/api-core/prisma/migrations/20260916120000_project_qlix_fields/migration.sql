-- S6-RM-21: pinned commit + active QLIX check for project verification idempotency.
ALTER TABLE "projects" ADD COLUMN "snapshot_sha" TEXT;
ALTER TABLE "projects" ADD COLUMN "qlix_check_id" TEXT;
