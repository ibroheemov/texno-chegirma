import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type UsdRateInfo = { rate: number; source: "telegram" | "cbu" | "manual"; date?: string };

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

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (m) => HTML_ENTITIES[m])
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

// A number with 4+ digits (ignoring "'"/"," thousands separators) counts as a
// "real" rate figure. This is what lets us skip past the small "+10"/"-5"
// change-indicator numbers that sit right next to the actual rate in these
// channels' posts, without the admin having to write a regex to do it.
function isQualifyingNumber(raw: string): boolean {
  return raw.replace(/[^\d]/g, "").length >= 4;
}

// Reads the latest post from a public Telegram channel's no-login preview
// page (t.me/s/<username>) and pulls a rate out of it: finds `keyword` in the
// post, then returns the Nth (1-based) qualifying number found after it.
async function fetchChannelUsdRate(
  username: string,
  keyword: string,
  numberIndex: number
): Promise<{ rate: number } | null> {
  try {
    const res = await fetch(`https://t.me/s/${encodeURIComponent(username)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; savdo-app rate sync)" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const blocks = [...html.matchAll(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g)];
    if (blocks.length === 0) return null;
    const latest = blocks[blocks.length - 1][1];
    const plain = decodeHtmlEntities(latest.replace(/<[^>]+>/g, " "));

    const idx = plain.indexOf(keyword);
    if (idx === -1) return null;
    const after = plain.slice(idx + keyword.length);
    const numbers = [...after.matchAll(/\d[\d.,']*/g)].map((m) => m[0]).filter(isQualifyingNumber);
    const raw = numbers[numberIndex - 1];
    if (!raw) return null;
    const rate = Number(raw.replace(/[^\d.]/g, ""));
    if (!(rate > 0)) return null;
    return { rate };
  } catch {
    return null;
  }
}

type RateSourceConfig = {
  usdRate?: number | null;
  fxChannelUsername?: string | null;
  fxKeyword?: string | null;
  fxNumberIndex?: number | null;
};

async function fetchLiveRate(
  config: RateSourceConfig
): Promise<{ rate: number; source: "telegram" | "cbu"; date?: string } | null> {
  if (config.fxChannelUsername && config.fxKeyword && config.fxNumberIndex) {
    const channel = await fetchChannelUsdRate(config.fxChannelUsername, config.fxKeyword, config.fxNumberIndex);
    if (channel) return { rate: channel.rate, source: "telegram" };
  }
  const cbu = await fetchCbuUsdRate();
  if (cbu) return { rate: cbu.rate, source: "cbu", date: cbu.date };
  return null;
}

/**
 * Live USD/UZS rate — a configured Telegram channel (Sozlamalar → Valyuta
 * kursi manbai) takes priority when set, falling back to the Central Bank of
 * Uzbekistan, then the store's manually configured rate if both live sources
 * fail.
 */
export async function getUsdRate(storeId: string): Promise<UsdRateInfo | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { usdRate: true, fxChannelUsername: true, fxKeyword: true, fxNumberIndex: true },
  });
  const live = await fetchLiveRate(store ?? {});
  if (live) return live;
  if (store?.usdRate && store.usdRate > 0) return { rate: store.usdRate, source: "manual" };
  return null;
}

/**
 * Dollar-priced products (Product.usdRate set) follow the live rate: their
 * so'm prices are rescaled by liveRate / storedRate in one idempotent UPDATE,
 * so calling this on every page load / request is safe and cheap. Only a
 * real live source (channel or CBU) drives it, never the manual fallback, so
 * a failed fetch can't make prices jump.
 */
export async function syncUsdPrices(storeId: string): Promise<void> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { fxChannelUsername: true, fxKeyword: true, fxNumberIndex: true },
  });
  const live = await fetchLiveRate(store ?? {});
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
