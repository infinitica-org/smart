-- AlterTable
ALTER TABLE "qlix_check_results" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_capabilities" ALTER COLUMN "id" DROP DEFAULT;
