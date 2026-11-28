// Pure helpers for reading a USD rate out of a public Telegram channel's preview page
// (https://t.me/s/<username>). No I/O here so the parsing can be tested on its own.

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (m) => HTML_ENTITIES[m])
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

// A number with 4+ digits (ignoring "'"/"," thousands separators) counts as a
// "real" rate figure. This is what lets us skip past the small "+10"/"-5"
// change-indicator numbers that sit right next to the actual rate in these
// channels' posts, without the admin having to write a regex to do it.
export function isQualifyingNumber(raw: string): boolean {
  return raw.replace(/[^\d]/g, "").length >= 4;
}

/** Plain text of every post on the preview page, oldest first (the newest post is last). */
export function extractPostTexts(html: string): string[] {
  const blocks = [...html.matchAll(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g)];
  return blocks.map((block) => decodeHtmlEntities(block[1].replace(/<[^>]+>/g, " ")));
}

/** The Nth (1-based) qualifying number after `keyword` in one post, or null. */
export function rateFromPost(post: string, keyword: string, numberIndex: number): number | null {
  const idx = post.indexOf(keyword);
  if (idx === -1) return null;
  const after = post.slice(idx + keyword.length);
  const numbers = [...after.matchAll(/\d[\d.,']*/g)].map((m) => m[0]).filter(isQualifyingNumber);
  const raw = numbers[numberIndex - 1];
  if (!raw) return null;
  const rate = Number(raw.replace(/[^\d.]/g, ""));
  return rate > 0 ? rate : null;
}

/**
 * The rate from the most recent post that actually contains one. Channels interleave ads and news
 * with their rate posts, so looking only at the newest post would miss the rate whenever an ad was
 * posted last.
 */
export function latestRateFromPosts(posts: string[], keyword: string, numberIndex: number): number | null {
  for (let i = posts.length - 1; i >= 0; i--) {
    const rate = rateFromPost(posts[i], keyword, numberIndex);
    if (rate) return rate;
  }
  return null;
}
