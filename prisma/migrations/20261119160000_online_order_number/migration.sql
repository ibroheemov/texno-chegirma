-- Sequential order number, backfilled oldest-first so existing orders become 1, 2, 3...
CREATE SEQUENCE "OnlineOrder_number_seq";

ALTER TABLE "OnlineOrder" ADD COLUMN "number" INTEGER;

UPDATE "OnlineOrder" o
SET "number" = n.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn FROM "OnlineOrder"
) n
WHERE o."id" = n."id";

SELECT setval('"OnlineOrder_number_seq"', COALESCE((SELECT MAX("number") FROM "OnlineOrder"), 0) + 1, false);

ALTER TABLE "OnlineOrder" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "OnlineOrder" ALTER COLUMN "number" SET DEFAULT nextval('"OnlineOrder_number_seq"');
ALTER SEQUENCE "OnlineOrder_number_seq" OWNED BY "OnlineOrder"."number";
