-- CreateTable
CREATE TABLE "candidate_education_documents" (
    "id" UUID NOT NULL,
    "education_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_education_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_education_documents_education_id_idx" ON "candidate_education_documents"("education_id");

-- AddForeignKey
ALTER TABLE "candidate_education_documents" ADD CONSTRAINT "candidate_education_documents_education_id_fkey" FOREIGN KEY ("education_id") REFERENCES "candidate_educations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
