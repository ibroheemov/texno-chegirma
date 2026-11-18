-- CreateTable
CREATE TABLE "TelegramSession" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'browsing',
    "categoryId" TEXT,
    "cart" JSONB,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "paymentMethod" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSession_storeId_chatId_key" ON "TelegramSession"("storeId", "chatId");

-- AddForeignKey
ALTER TABLE "TelegramSession" ADD CONSTRAINT "TelegramSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
