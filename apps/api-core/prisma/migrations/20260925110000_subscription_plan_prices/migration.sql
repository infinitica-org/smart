-- AlterEnum
ALTER TYPE "PlanCode" ADD VALUE 'ENTERPRISE';

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "price_inr" INTEGER,
ADD COLUMN     "is_custom_price" BOOLEAN NOT NULL DEFAULT false;
