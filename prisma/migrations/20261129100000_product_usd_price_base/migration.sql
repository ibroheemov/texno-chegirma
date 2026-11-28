-- Exact dollar-denominated selling prices for dollar-priced products (see schema.prisma).
ALTER TABLE "Product" ADD COLUMN "priceUsd" DOUBLE PRECISION,
ADD COLUMN "salePriceUsd" DOUBLE PRECISION,
ADD COLUMN "barcodePriceUsd" DOUBLE PRECISION;
