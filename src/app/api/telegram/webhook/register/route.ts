import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { setTelegramWebhook } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  if (!store?.telegramBotToken) {
    return NextResponse.json({ error: "Avval bot tokenini saqlang" }, { status: 400 });
  }

  // req.nextUrl.origin reflects whatever Host the request arrived with at
  // this process, which behind Railway's proxy can carry its internal
  // container port — a URL Telegram's setWebhook rejects (it only accepts
  // 80/88/443/8443). The standard forwarded headers carry the public-facing
  // host/proto instead, so prefer those.
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const origin = `${proto}://${host}`;
  const webhookUrl = `${origin}/api/telegram/webhook`;
  const result = await setTelegramWebhook(store.telegramBotToken, webhookUrl);

  if (!result.ok) {
    return NextResponse.json({ error: result.description ?? "Telegram xatolik qaytardi" }, { status: 400 });
  }

  await prisma.store.update({ where: { id: store.id }, data: { publicUrl: origin } });

  return NextResponse.json({ ok: true, webhookUrl });
}
