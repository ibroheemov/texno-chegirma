ALTER TABLE "Sale" ADD COLUMN "layawayOrderId" TEXT;

WITH candidates AS (
    SELECT
        o."id" AS "orderId",
        s."id" AS "saleId",
        COUNT(*) OVER (PARTITION BY o."id") AS "orderMatches",
        COUNT(*) OVER (PARTITION BY s."id") AS "saleMatches"
    FROM "LayawayOrder" o
    JOIN "Sale" s
      ON s."storeId" = o."storeId"
     AND s."customerId" = o."customerId"
     AND s."total" = o."totalCost"
     AND s."paymentMethod" = 'CUSTOM'
     AND s."cashAmount" = 0
     AND s."cardAmount" = 0
     AND s."creditAmount" = 0
     AND s."createdAt" BETWEEN o."deliveredAt" - INTERVAL '1 minute'
                            AND o."deliveredAt" + INTERVAL '1 minute'
    WHERE o."status" = 'DELIVERED'
      AND o."productId" IS NOT NULL
      AND o."deliveredAt" IS NOT NULL
      AND s."layawayOrderId" IS NULL
      AND EXISTS (
          SELECT 1
          FROM "SaleItem" i
          WHERE i."saleId" = s."id"
            AND i."productId" = o."productId"
            AND i."qty" = o."qty"
      )
)
UPDATE "Sale" s
SET "layawayOrderId" = c."orderId"
FROM candidates c
WHERE s."id" = c."saleId"
  AND c."orderMatches" = 1
  AND c."saleMatches" = 1;

CREATE UNIQUE INDEX "Sale_layawayOrderId_key" ON "Sale"("layawayOrderId");

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_layawayOrderId_fkey"
FOREIGN KEY ("layawayOrderId") REFERENCES "LayawayOrder"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
