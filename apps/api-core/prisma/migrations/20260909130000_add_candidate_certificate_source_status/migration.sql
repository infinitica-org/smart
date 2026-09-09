-- CreateEnum
CREATE TYPE "CertificateSourceStatus" AS ENUM ('PENDING', 'SOURCE_VERIFIED', 'SOURCE_FAILED', 'VOIDED');

-- AlterTable
ALTER TABLE "candidate_certificates"
  ADD COLUMN "certificate_number" TEXT,
  ADD COLUMN "verification_url" TEXT,
  ADD COLUMN "source_status" "CertificateSourceStatus" NOT NULL DEFAULT 'PENDING';
