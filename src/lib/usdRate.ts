import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type UsdRateInfo = { rate: number; source: "cbu" | "manual"; date?: string };

type CbuRateResponse = { Rate: string; Date: string }[];

async function fetchCbuUsdRate(): Promise<{ rate: number; date: string } | null> {
  try {
    const res = await fetch("https://cbu.uz/en/arkhiv-kursov-valyut/json/USD/", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CbuRateResponse;
    const rate = Number(data?.[0]?.Rate);
    if (!(rate > 0)) return null;
    return { rate, date: data[0].Date };
  } catch {
    return null;
  }
}

/**
 * Live USD/UZS rate from the Central Bank of Uzbekistan, falling back to the
 * store's manually configured rate (Sozlamalar) if the live fetch fails.
 */
export async function getUsdRate(manualRate?: number | null): Promise<UsdRateInfo | null> {
  const live = await fetchCbuUsdRate();
  if (live) return { rate: live.rate, source: "cbu", date: live.date };
  if (manualRate && manualRate > 0) return { rate: manualRate, source: "manual" };
  return null;
}

/**
 * Dollar-priced products (Product.usdRate set) follow the live CBU rate: their
 * so'm prices are rescaled by liveRate / storedRate in one idempotent UPDATE,
 * so calling this on every page load / request is safe and cheap. Only the
 * real CBU rate drives it, never the manual fallback, so a failed fetch can't
 * make prices jump.
 */
export async function syncUsdPrices(storeId: string): Promise<void> {
  const live = await fetchCbuUsdRate();
  if (!live) return;
  const r = live.rate;
  try {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Product" SET
        "price" = ROUND("price" * ${r}::float8 / "usdRate")::int,
        "costPrice" = ROUND("costPrice" * ${r}::float8 / "usdRate")::int,
        "salePrice" = ROUND("salePrice" * ${r}::float8 / "usdRate")::int,
        "barcodePrice" = ROUND("barcodePrice" * ${r}::float8 / "usdRate")::int,
        "usdRate" = ${r}::float8,
        "updatedAt" = now()
      WHERE "storeId" = ${storeId} AND "usdRate" IS NOT NULL AND "usdRate" <> ${r}::float8
    `);
  } catch (e) {
    console.error("syncUsdPrices failed", e);
  }
}
