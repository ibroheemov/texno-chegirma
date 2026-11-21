-- AlterTable
ALTER TABLE "Store" DROP COLUMN "fxRegexPattern";
ALTER TABLE "Store" ADD COLUMN "fxKeyword" TEXT;
ALTER TABLE "Store" ADD COLUMN "fxNumberIndex" INTEGER;
