-- UNI-04 (Th6-444): explicit, expiring grants for interview recordings. Default is deny.

-- CreateTable
CREATE TABLE "recording_access_grants" (
    "id" UUID NOT NULL,
    "recording_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "granted_to_user_id" UUID NOT NULL,
    "granted_by_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recording_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recording_access_grants_recording_id_granted_to_user_id_idx" ON "recording_access_grants"("recording_id", "granted_to_user_id");

-- CreateIndex
CREATE INDEX "recording_access_grants_student_id_idx" ON "recording_access_grants"("student_id");

-- AddForeignKey
ALTER TABLE "recording_access_grants" ADD CONSTRAINT "recording_access_grants_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recording_access_grants" ADD CONSTRAINT "recording_access_grants_granted_to_user_id_fkey" FOREIGN KEY ("granted_to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recording_access_grants" ADD CONSTRAINT "recording_access_grants_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
