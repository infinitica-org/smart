-- S6-VV-115 (#554): students can request a copy of their data.

-- AlterEnum
ALTER TYPE "DataSubjectRequestType" ADD VALUE 'EXPORT';

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'ACCOUNT';

-- AlterTable
ALTER TABLE "data_subject_requests" ADD COLUMN     "export_key" TEXT;
