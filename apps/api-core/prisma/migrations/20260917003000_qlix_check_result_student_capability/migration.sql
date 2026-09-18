-- S6-RM-21: persist full QLIX check payloads and inferred student capabilities.

CREATE TABLE "qlix_check_results" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "check_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "similarity_index" DOUBLE PRECISION,
  "similarity_excluding_cited" DOUBLE PRECISION,
  "confidence" TEXT,
  "ai_likelihood" DOUBLE PRECISION,
  "suspicion_level" TEXT,
  "agent_summary" TEXT,
  "skills_json" JSONB,
  "smart_assessment_json" JSONB,
  "applied_proficiency_ceiling" TEXT,
  "quality_score" DOUBLE PRECISION,
  "authenticity_score" DOUBLE PRECISION,
  "relevance_score" DOUBLE PRECISION,
  "gaps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "analyzed_tokens" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qlix_check_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "qlix_check_results_project_id_key" ON "qlix_check_results"("project_id");

ALTER TABLE "qlix_check_results"
  ADD CONSTRAINT "qlix_check_results_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "student_capabilities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "student_id" UUID NOT NULL,
  "capability_label" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "confidence_score" DOUBLE PRECISION NOT NULL,
  "proficiency" TEXT NOT NULL,
  "evidence_refs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "qlix_check_id" TEXT,
  "project_id" UUID,
  "skill_code" TEXT,
  "model_version" TEXT NOT NULL,
  "assessment_verified" BOOLEAN NOT NULL DEFAULT false,
  "inferred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_capabilities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_capabilities_student_id_idx" ON "student_capabilities"("student_id");
CREATE INDEX "student_capabilities_project_id_idx" ON "student_capabilities"("project_id");

ALTER TABLE "student_capabilities"
  ADD CONSTRAINT "student_capabilities_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_capabilities"
  ADD CONSTRAINT "student_capabilities_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
