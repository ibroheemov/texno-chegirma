import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewOrder } from "@/lib/telegram";
import { verifyWebAppInitData } from "@/lib/telegramWebApp";

export async function POST(req: NextRequest) {
  const store = await prisma.store.findFirst();
  if (!store) return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });

  const body = await req.json();
  const { customerName: typedName, customerPhone: typedPhone, customerAddress, customerLat, customerLng, telegramInitData, paymentMethod, installmentMonths, items } = body as {
    customerLat?: number;
    customerLng?: number;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    telegramInitData?: string;
    paymentMethod?: "CASH" | "CARD" | "CUSTOM";
    installmentMonths?: number;
    items: { productId: string; name: string; qty: number; price: number }[];
  };

  if (!typedName || !items?.length) {
    return NextResponse.json({ error: "Ism va mahsulotlarni kiriting" }, { status: 400 });
  }

  // Opened from the bot's "Do'konni ochish" button: Telegram tells us who the user is.
  // If they registered in the bot, file the order under that customer so it shows up
  // in the bot's "Buyurtmalarim" regardless of how the phone was typed in the form.
  const chatId = verifyWebAppInitData(telegramInitData, store.telegramBotToken);
  const tgCustomer = chatId
    ? await prisma.customer.findFirst({ where: { storeId: store.id, telegramChatId: chatId } })
    : null;
  const customerName = tgCustomer?.name || typedName;
  const customerPhone = tgCustomer?.phone || typedPhone?.trim();
  if (!customerPhone) {
    return NextResponse.json({ error: "Telefon raqamingizni kiriting" }, { status: 400 });
  }
  // The form's phone field is an *additional* number: kept separately when the order
  // is filed under the registered Telegram customer's own phone.
  const typedDigits = (typedPhone ?? "").replace(/\D/g, "");
  const extraPhone =
    tgCustomer?.phone && typedDigits && !tgCustomer.phone.replace(/\D/g, "").endsWith(typedDigits.slice(-9))
      ? typedPhone!.trim()
      : null;

  const months = [3, 6, 12].includes(Number(installmentMonths)) ? Number(installmentMonths) : null;
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const order = await prisma.onlineOrder.create({
    data: {
      storeId: store.id,
      customerName,
      customerPhone,
      extraPhone,
      customerAddress: customerAddress || null,
      customerLat: Number.isFinite(customerLat) ? customerLat : null,
      customerLng: Number.isFinite(customerLng) ? customerLng : null,
      paymentMethod: months ? "CUSTOM" : paymentMethod === "CARD" ? "CARD" : "CASH",
      installmentMonths: months,
      items,
      total,
    },
  });

  if (store.notifyNewOrders) {
    notifyNewOrder(
      { storeName: store.name, customerName, customerPhone, extraPhone, total, items, installmentMonths: months },
      { token: store.telegramBotToken, chatId: store.telegramChatId }
    ).catch(() => {});
  }

  return NextResponse.json({ order }, { status: 201 });
}
