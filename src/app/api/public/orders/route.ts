import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewOrder } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const store = await prisma.store.findFirst();
  if (!store) return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });

  const body = await req.json();
  const { customerName, customerPhone, customerAddress, paymentMethod, items } = body as {
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    paymentMethod?: "CASH" | "CARD";
    items: { productId: string; name: string; qty: number; price: number }[];
  };

  if (!customerName || !customerPhone || !items?.length) {
    return NextResponse.json({ error: "Ism, telefon va mahsulotlarni kiriting" }, { status: 400 });
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const order = await prisma.onlineOrder.create({
    data: {
      storeId: store.id,
      customerName,
      customerPhone,
      customerAddress: customerAddress || null,
      paymentMethod: paymentMethod === "CARD" ? "CARD" : "CASH",
      items,
      total,
    },
  });

  if (store.notifyNewOrders) {
    notifyNewOrder(
      { storeName: store.name, customerName, customerPhone, total, items },
      { token: store.telegramBotToken, chatId: store.telegramChatId }
    ).catch(() => {});
  }

  return NextResponse.json({ order }, { status: 201 });
}
