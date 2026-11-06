import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  return NextResponse.json({ store });
}

const STRING_FIELDS = [
  "name",
  "currency",
  "phone",
  "address",
  "logoUrl",
  "receiptFooter",
  "telegramUsername",
  "telegramBotToken",
  "telegramChatId",
] as const;

const BOOL_FIELDS = [
  "showDebtInUsdOnly",
  "enableMixedPayment",
  "notifyNewOrders",
  "soundAlert",
  "autoPrintReceipt",
] as const;

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  for (const key of STRING_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key] || null;
  }
  for (const key of BOOL_FIELDS) {
    if (body[key] !== undefined) data[key] = Boolean(body[key]);
  }
  if (body.usdRate !== undefined) {
    data.usdRate = body.usdRate === null || body.usdRate === "" ? null : Number(body.usdRate);
  }
  if (body.customPaymentMethods !== undefined) {
    data.customPaymentMethods = body.customPaymentMethods;
  }
  if (data.name === null || data.name === "") {
    return NextResponse.json({ error: "Do'kon nomini kiriting" }, { status: 400 });
  }

  const store = await prisma.store.update({
    where: { id: session.storeId },
    data,
  });

  return NextResponse.json({ store });
}
