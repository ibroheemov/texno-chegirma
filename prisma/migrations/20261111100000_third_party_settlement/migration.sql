-- AlterTable
ALTER TABLE "Store" ADD COLUMN "deferredPaymentMethods" JSONB;

-- CreateTable
CREATE TABLE "ThirdPartySettlement" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "received" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "receivedMethod" "PaymentMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThirdPartySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThirdPartySettlement_storeId_received_idx" ON "ThirdPartySettlement"("storeId", "received");

-- CreateIndex
CREATE INDEX "ThirdPartySettlement_saleId_idx" ON "ThirdPartySettlement"("saleId");

-- AddForeignKey
ALTER TABLE "ThirdPartySettlement" ADD CONSTRAINT "ThirdPartySettlement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThirdPartySettlement" ADD CONSTRAINT "ThirdPartySettlement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
