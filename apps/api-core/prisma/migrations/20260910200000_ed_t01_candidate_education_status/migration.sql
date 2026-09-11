-- CN-T03 candidate education/language CRUD shipped without a migration for
-- these two tables; ED-T01 needs candidate_educations to exist to add its
-- verification-status columns, so both gaps are closed together here.

-- CreateTable
CREATE TABLE "candidate_educations" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "institution_name" TEXT NOT NULL,
    "degree" TEXT,
    "field_of_study" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "grade" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_languages" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "language" TEXT NOT NULL,
    "proficiency" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "candidate_languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_educations_student_id_idx" ON "candidate_educations"("student_id");

-- CreateIndex
CREATE INDEX "candidate_educations_student_id_status_idx" ON "candidate_educations"("student_id", "status");

-- CreateIndex
CREATE INDEX "candidate_languages_student_id_idx" ON "candidate_languages"("student_id");

-- AddForeignKey
ALTER TABLE "candidate_educations" ADD CONSTRAINT "candidate_educations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_languages" ADD CONSTRAINT "candidate_languages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
