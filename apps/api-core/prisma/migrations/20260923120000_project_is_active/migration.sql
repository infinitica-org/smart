-- Project replacement keeps the row and its verification status.
-- is_active = false removes the project from current portfolio and evidence.
ALTER TABLE "projects" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "projects_student_id_is_active_idx" ON "projects"("student_id", "is_active");
