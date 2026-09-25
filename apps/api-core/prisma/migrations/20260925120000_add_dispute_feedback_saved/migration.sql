-- I319, I377, I378, I401: evidence-skill disputes, match feedback, and saved candidates

-- CreateTable
CREATE TABLE "evidence_skill_disputes" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "skill_code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNDER_REVIEW',
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewer_id" UUID,
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_skill_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "opening_id" UUID,
    "student_id" UUID,
    "run_id" UUID,
    "target_type" TEXT NOT NULL DEFAULT 'STUDENT',
    "rating" TEXT NOT NULL,
    "feedback_text" TEXT,
    "irrelevant_reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_candidates" (
    "id" UUID NOT NULL,
    "saved_by" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "opening_id" UUID,
    "note" TEXT,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_skill_disputes_student_id_idx" ON "evidence_skill_disputes"("student_id");
CREATE INDEX "evidence_skill_disputes_evidence_id_idx" ON "evidence_skill_disputes"("evidence_id");
CREATE INDEX "evidence_skill_disputes_status_idx" ON "evidence_skill_disputes"("status");

-- CreateIndex
CREATE INDEX "match_feedback_user_id_idx" ON "match_feedback"("user_id");
CREATE INDEX "match_feedback_opening_id_idx" ON "match_feedback"("opening_id");
CREATE INDEX "match_feedback_student_id_idx" ON "match_feedback"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_candidates_saved_by_student_id_opening_id_key" ON "saved_candidates"("saved_by", "student_id", "opening_id");
CREATE INDEX "saved_candidates_saved_by_idx" ON "saved_candidates"("saved_by");
CREATE INDEX "saved_candidates_student_id_idx" ON "saved_candidates"("student_id");

-- AddForeignKey
ALTER TABLE "evidence_skill_disputes" ADD CONSTRAINT "evidence_skill_disputes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_skill_disputes" ADD CONSTRAINT "evidence_skill_disputes_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_skill_disputes" ADD CONSTRAINT "evidence_skill_disputes_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_feedback" ADD CONSTRAINT "match_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_feedback" ADD CONSTRAINT "match_feedback_opening_id_fkey" FOREIGN KEY ("opening_id") REFERENCES "job_openings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "match_feedback" ADD CONSTRAINT "match_feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_saved_by_fkey" FOREIGN KEY ("saved_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_opening_id_fkey" FOREIGN KEY ("opening_id") REFERENCES "job_openings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
