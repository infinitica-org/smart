-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hidden_sections" TEXT[] DEFAULT ARRAY[]::TEXT[];
