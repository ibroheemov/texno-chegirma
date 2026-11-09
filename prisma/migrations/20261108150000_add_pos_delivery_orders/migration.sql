-- AlterTable
ALTER TABLE "OnlineOrder" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "saleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OnlineOrder_saleId_key" ON "OnlineOrder"("saleId");

-- AddForeignKey
ALTER TABLE "OnlineOrder" ADD CONSTRAINT "OnlineOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
