import { prisma } from "./prisma";
import { extractPostTexts, latestRateFromPosts } from "./fxChannel";
import { repriceUsdProducts } from "./usdReprice";

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

// Short in-memory cache for the channel page. Next's `revalidate` cache serves the OLD page first and
// refreshes in the background (so a changed rate took two loads and 5+ minutes to show up), and
// getUsdRate + syncUsdPrices both fetch on every request. One fetch per channel per minute keeps
// Telegram happy and a rate change visible within a minute.
const CHANNEL_CACHE_MS = 60_000;
const CHANNEL_FAILURE_CACHE_MS = 15_000;
const channelCache = new Map<string, { at: number; ttl: number; value: Promise<{ rate: number } | null> }>();

// Reads the latest rate post from a public Telegram channel's no-login preview
// page (t.me/s/<username>): finds `keyword` in the post, then returns the Nth
// (1-based) qualifying number found after it. Posts without the keyword (ads,
// news) are skipped in favour of the most recent one that has it.
async function fetchChannelUsdRate(
  username: string,
  keyword: string,
  numberIndex: number
): Promise<{ rate: number } | null> {
  const key = `${username}|${keyword}|${numberIndex}`;
  const cached = channelCache.get(key);
  if (cached && Date.now() - cached.at < cached.ttl) return cached.value;

  const value = (async () => {
    try {
      const res = await fetch(`https://t.me/s/${encodeURIComponent(username)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; savdo-app rate sync)" },
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return null;
      const rate = latestRateFromPosts(extractPostTexts(await res.text()), keyword, numberIndex);
      return rate ? { rate } : null;
    } catch {
      return null;
    }
  })();
  const entry = { at: Date.now(), ttl: CHANNEL_CACHE_MS, value };
  channelCache.set(key, entry);
  // Don't pin a failure for a full minute.
  void value.then((result) => {
    if (!result) entry.ttl = CHANNEL_FAILURE_CACHE_MS;
  });
  return value;
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
 * so'm selling prices are recomputed from an exact dollar base and rounded up
 * to the next 1,000 (see usdReprice.ts). It is idempotent, so calling it on
 * every page load / request is safe and cheap. Only a real live source
 * (channel or CBU) drives it, never the manual fallback, so a failed fetch
 * can't make prices jump.
 */
export async function syncUsdPrices(storeId: string): Promise<void> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { fxChannelUsername: true, fxKeyword: true, fxNumberIndex: true },
  });
  const live = await fetchLiveRate(store ?? {});
  if (!live) return;
  try {
    await prisma.$transaction((tx) => repriceUsdProducts(tx, storeId, live.rate));
  } catch (e) {
    console.error("syncUsdPrices failed", e);
  }
}
