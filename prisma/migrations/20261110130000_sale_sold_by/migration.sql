-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "soldById" TEXT;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
