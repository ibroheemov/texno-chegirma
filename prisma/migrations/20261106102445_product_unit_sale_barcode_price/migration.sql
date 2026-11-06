-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcodePrice" INTEGER,
ADD COLUMN     "onSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salePrice" INTEGER,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'dona';
