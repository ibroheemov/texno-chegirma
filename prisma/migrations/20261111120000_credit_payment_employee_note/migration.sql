-- AlterTable
ALTER TABLE "CreditPayment" ADD COLUMN "employeeId" TEXT;
ALTER TABLE "CreditPayment" ADD COLUMN "note" TEXT;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
