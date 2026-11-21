import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Looks up the name a customer already gave the Telegram bot (during /start
// registration) so the Mini App's order form can prefill it, instead of just
// falling back to the Telegram account's own profile name. Public (no
// session) since the Mini App is opened by customers, not store staff — scope
// is read-only and store-single-tenant, matching the webhook's own lookup.
export async function GET(req: NextRequest) {
  const chatId = new URL(req.url).searchParams.get("chatId");
  if (!chatId || !/^\d+$/.test(chatId)) {
    return NextResponse.json({ name: null });
  }

  const store = await prisma.store.findFirst({ select: { id: true } });
  if (!store) return NextResponse.json({ name: null });

  const customer = await prisma.customer.findUnique({
    where: { storeId_telegramChatId: { storeId: store.id, telegramChatId: chatId } },
    select: { name: true },
  });

  return NextResponse.json({ name: customer?.name ?? null });
}
