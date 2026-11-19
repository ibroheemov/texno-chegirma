-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "telegramChatId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_storeId_telegramChatId_key" ON "Customer"("storeId", "telegramChatId");
