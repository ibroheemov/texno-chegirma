-- CreateEnum
CREATE TYPE "LayawayStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DELIVERED', 'CANCELED');

-- CreateTable
CREATE TABLE "LayawayOrder" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "totalCost" INTEGER NOT NULL,
    "totalUsd" DOUBLE PRECISION,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "status" "LayawayStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LayawayOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayawayPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LayawayPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LayawayOrder_storeId_status_idx" ON "LayawayOrder"("storeId", "status");

-- CreateIndex
CREATE INDEX "LayawayOrder_storeId_customerId_idx" ON "LayawayOrder"("storeId", "customerId");

-- CreateIndex
CREATE INDEX "LayawayPayment_orderId_idx" ON "LayawayPayment"("orderId");

-- AddForeignKey
ALTER TABLE "LayawayOrder" ADD CONSTRAINT "LayawayOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayawayOrder" ADD CONSTRAINT "LayawayOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayawayOrder" ADD CONSTRAINT "LayawayOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayawayPayment" ADD CONSTRAINT "LayawayPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LayawayOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
