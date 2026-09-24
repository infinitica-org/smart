-- CreateEnum
CREATE TYPE "UniversityContactRequestStatus" AS ENUM ('PENDING');

-- CreateTable
CREATE TABLE "university_contact_requests" (
    "id" UUID NOT NULL,
    "student_user_id" UUID NOT NULL,
    "university_name" TEXT NOT NULL,
    "normalized_university_name" TEXT NOT NULL,
    "status" "UniversityContactRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "university_contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "university_contact_requests_student_user_id_idx" ON "university_contact_requests"("student_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "university_contact_requests_student_user_id_normalized_univ_key" ON "university_contact_requests"("student_user_id", "normalized_university_name");

-- AddForeignKey
ALTER TABLE "university_contact_requests" ADD CONSTRAINT "university_contact_requests_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
