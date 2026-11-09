-- AlterTable
ALTER TABLE "GoodsReceipt" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'som',
ADD COLUMN     "costUsd" DOUBLE PRECISION,
ADD COLUMN     "usdRate" INTEGER;
