-- STU-03: employer profile-view tracking and the student opt-in to see the count

-- AlterTable
ALTER TABLE "users" ADD COLUMN "show_employer_view_count" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "profile_views" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "viewer_id" UUID,
    "viewer_role" TEXT NOT NULL,
    "viewer_organization_id" UUID,
    "source" TEXT NOT NULL DEFAULT 'public_link',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_views_student_id_created_at_idx" ON "profile_views"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "profile_views_student_id_viewer_id_created_at_idx" ON "profile_views"("student_id", "viewer_id", "created_at");

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
