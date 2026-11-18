import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleTelegramUpdate, type TgUpdate } from "@/lib/telegramBot";

export async function POST(req: NextRequest) {
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  if (!update) return NextResponse.json({ ok: true });

  const store = await prisma.store.findFirst({ select: { id: true, telegramBotToken: true } });
  if (!store?.telegramBotToken) return NextResponse.json({ ok: true });

  try {
    await handleTelegramUpdate(store.id, update);
  } catch (err) {
    console.error("telegram webhook error", err);
  }

  return NextResponse.json({ ok: true });
}
