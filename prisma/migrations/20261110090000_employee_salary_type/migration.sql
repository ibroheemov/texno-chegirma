-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'DAILY');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "salaryType" "SalaryType" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "Employee" DROP COLUMN "hourlyRate";
