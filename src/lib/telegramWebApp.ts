import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE_SECONDS = 24 * 60 * 60;

// Validates the `initData` string that Telegram injects into a Mini App and
// returns the Telegram user id, or null if it is missing/forged/expired.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function verifyWebAppInitData(initData: string | undefined, botToken: string | null): string | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "null") as { id?: number } | null;
    return user?.id != null ? String(user.id) : null;
  } catch {
    return null;
  }
}
