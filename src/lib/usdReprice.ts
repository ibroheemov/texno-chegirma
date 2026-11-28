import { Prisma } from "@prisma/client";

// Selling prices of dollar-priced products follow the live USD/UZS rate and are rounded UP to the
// next 1,000 so'm (70,290 -> 71,000). To keep that rounding from ratcheting prices upward over many
// small rate changes, every so'm price is computed from an exact dollar base (priceUsd, salePriceUsd,
// barcodePriceUsd) and never from the already-rounded so'm value.
//
// ROUND(..., 2) first removes floating-point noise, so a value that is mathematically an exact
// multiple of 1,000 (70000.0000000001) doesn't get bumped to the next thousand.

type Db = Pick<Prisma.TransactionClient, "$executeRaw">;

/**
 * 1) (Re)derive the dollar base of any product whose so'm price is not what the base would produce:
 *    a product synced for the first time, or one whose price was edited by hand.
 * 2) Rescale products whose stored rate differs from `rate`: selling prices round up to 1,000 from
 *    the base; the cost price just scales (it is an exact dollar amount, never rounded up).
 */
export async function repriceUsdProducts(db: Db, storeId: string, rate: number): Promise<void> {
  await db.$executeRaw(Prisma.sql`
    UPDATE "Product" SET
      "priceUsd" = "price"::float8 / "usdRate",
      "salePriceUsd" = "salePrice"::float8 / "usdRate",
      "barcodePriceUsd" = "barcodePrice"::float8 / "usdRate"
    WHERE "storeId" = ${storeId} AND "usdRate" IS NOT NULL AND (
      "priceUsd" IS DISTINCT FROM "price"::float8 / "usdRate"
      OR "salePriceUsd" IS DISTINCT FROM "salePrice"::float8 / "usdRate"
      OR "barcodePriceUsd" IS DISTINCT FROM "barcodePrice"::float8 / "usdRate"
    ) AND (
      "priceUsd" IS NULL
      OR "price" <> (CEIL(ROUND(("priceUsd" * "usdRate")::numeric, 2) / 1000) * 1000)::int
      OR "salePrice" IS DISTINCT FROM
         CASE WHEN "salePriceUsd" IS NULL THEN NULL
              ELSE (CEIL(ROUND(("salePriceUsd" * "usdRate")::numeric, 2) / 1000) * 1000)::int END
      OR "barcodePrice" IS DISTINCT FROM
         CASE WHEN "barcodePriceUsd" IS NULL THEN NULL
              ELSE (CEIL(ROUND(("barcodePriceUsd" * "usdRate")::numeric, 2) / 1000) * 1000)::int END
    )
  `);

  await db.$executeRaw(Prisma.sql`
    UPDATE "Product" SET
      "price" = (CEIL(ROUND(("priceUsd" * ${rate}::float8)::numeric, 2) / 1000) * 1000)::int,
      "salePrice" = CASE WHEN "salePriceUsd" IS NULL THEN "salePrice"
                         ELSE (CEIL(ROUND(("salePriceUsd" * ${rate}::float8)::numeric, 2) / 1000) * 1000)::int END,
      "barcodePrice" = CASE WHEN "barcodePriceUsd" IS NULL THEN "barcodePrice"
                            ELSE (CEIL(ROUND(("barcodePriceUsd" * ${rate}::float8)::numeric, 2) / 1000) * 1000)::int END,
      "costPrice" = ROUND("costPrice" * ${rate}::float8 / "usdRate")::int,
      "usdRate" = ${rate}::float8,
      "updatedAt" = now()
    WHERE "storeId" = ${storeId} AND "usdRate" IS NOT NULL AND "usdRate" <> ${rate}::float8
      AND "priceUsd" IS NOT NULL
  `);
}
