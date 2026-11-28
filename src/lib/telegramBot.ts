import { prisma } from "./prisma";
import { formatSom, formatDate } from "./format";
import {
  notifyNewOrder,
  sendMessage,
  sendLocation,
  editMessage,
  answerCallbackQuery,
  type InlineKeyboard,
  type ReplyKeyboard,
} from "./telegram";
import type { Store } from "@prisma/client";
import { syncUsdPrices } from "./usdRate";

type TgUser = { id: number; first_name: string; last_name?: string };
type TgChat = { id: number };
type TgContact = { phone_number: string; user_id?: number };
type TgMessage = {
  message_id: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
  contact?: TgContact;
  location?: { latitude: number; longitude: number };
};
type TgCallbackQuery = {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
};
export type TgUpdate = {
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

const MAX_LIST = 24;

function cartFromJson(value: unknown): Record<string, number> {
  if (value && typeof value === "object") return value as Record<string, number>;
  return {};
}

async function activeProducts(storeId: string) {
  return prisma.product.findMany({ where: { storeId, stock: { gt: 0 } }, orderBy: { name: "asc" } });
}

const BTN_OPEN_STORE = "🛍 Do'konni ochish";
const BTN_DISCOUNTS = "🏷 Aksiyadagi tovarlar";
const BTN_INFO = "ℹ️ Ma'lumotlar";
const BTN_MY_ORDERS = "📋 Buyurtmalarim";
const BTN_CART = "🛒 Savatcha";
const BTN_LOCATION = "📍 Do'kon lokatsiyasi";
const BTN_HELP = "👨‍🔧 Yordam";
const BTN_SEND_LOCATION = "📍 Joylashuvni yuborish";
const BTN_SKIP_ADDRESS = "O'tkazib yuborish";
const SUPPORT_TELEGRAM_USERNAME = "zafarovich_14";

// The bot's main menu is a persistent keyboard under the chat input; the
// "Do'konni ochish" and "Aksiyadagi tovarlar" buttons open the Mini App storefront
// (the latter pre-filtered to discounted products).
function mainKeyboard(store: Store): ReplyKeyboard {
  return [
    ...(store.publicUrl ? [[{ text: BTN_OPEN_STORE, web_app: { url: `${store.publicUrl}/do-kon` } }]] : []),
    [
      store.publicUrl
        ? { text: BTN_DISCOUNTS, web_app: { url: `${store.publicUrl}/do-kon?aksiya=1` } }
        : { text: BTN_DISCOUNTS },
      { text: BTN_INFO },
    ],
    [{ text: BTN_MY_ORDERS }, { text: BTN_CART }],
    [{ text: BTN_LOCATION }, { text: BTN_HELP }],
  ];
}

async function showMenu(store: Store, chatId: string, greeting?: string) {
  const hint = store.publicUrl
    ? `To'liq katalogni ko'rish uchun pastdagi "${BTN_OPEN_STORE}" tugmasini bosing yoki mahsulot nomini yozib qidiring:`
    : "Pastdagi tugmalardan foydalaning yoki mahsulot nomini yozib qidiring:";
  const text = `${greeting ? `${greeting}\n\n` : ""}🏪 *${store.name}*\n\n${hint}`;
  await sendMessage(store.telegramBotToken!, chatId, text, { replyKeyboard: mainKeyboard(store) });
}

async function showProducts(
  store: Store,
  chatId: string,
  messageId: number | undefined,
  opts: { categoryId?: string | null; search?: string; onSaleOnly?: boolean }
) {
  const all = await activeProducts(store.id);
  let list = all;
  if (opts.onSaleOnly) list = list.filter((p) => p.onSale && p.salePrice != null);
  if (opts.categoryId) list = list.filter((p) => p.categoryId === opts.categoryId);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }
  const shown = list.slice(0, MAX_LIST);

  if (shown.length === 0) {
    const text = opts.onSaleOnly ? "Hozircha aksiyadagi mahsulotlar yo'q." : "Hech narsa topilmadi.";
    if (messageId) await editMessage(store.telegramBotToken!, chatId, messageId, text);
    else await sendMessage(store.telegramBotToken!, chatId, text);
    return;
  }

  const keyboard: InlineKeyboard = [
    ...shown.map((p) => [
      {
        text:
          p.onSale && p.salePrice != null
            ? `${p.name} — ${formatSom(p.salePrice)} (avval ${formatSom(p.price)})`
            : `${p.name} — ${formatSom(p.price)}`,
        callback_data: `prod:${p.id}`,
      },
    ]),
    [{ text: BTN_CART, callback_data: "cart:view" }],
  ];
  const more = list.length > MAX_LIST ? `\n\n${list.length - MAX_LIST} ta yana bor — aniqroq yozing.` : "";
  const heading = opts.onSaleOnly
    ? "🏷 Aksiyadagi mahsulotlar (qo'shish uchun bosing):"
    : "Mahsulotni tanlang (qo'shish uchun bosing):";
  const text = `${heading}${more}`;
  if (messageId) await editMessage(store.telegramBotToken!, chatId, messageId, text, keyboard);
  else await sendMessage(store.telegramBotToken!, chatId, text, { inlineKeyboard: keyboard });
}

async function showCart(
  store: Store,
  chatId: string,
  messageId: number | undefined,
  cart: Record<string, number>
) {
  const ids = Object.keys(cart).filter((id) => cart[id] > 0);
  if (ids.length === 0) {
    const text = "Savatcha bo'sh.";
    const keyboard: InlineKeyboard = [[{ text: "📦 Mahsulotlarga qaytish", callback_data: "cat:all" }]];
    if (messageId) await editMessage(store.telegramBotToken!, chatId, messageId, text, keyboard);
    else await sendMessage(store.telegramBotToken!, chatId, text, { inlineKeyboard: keyboard });
    return;
  }

  const products = await prisma.product.findMany({ where: { id: { in: ids }, storeId: store.id } });
  const lines: string[] = [];
  let total = 0;
  const keyboard: InlineKeyboard = [];
  for (const p of products) {
    const qty = Math.min(cart[p.id] ?? 0, p.stock);
    if (qty <= 0) continue;
    const subtotal = p.price * qty;
    total += subtotal;
    lines.push(`${p.name}\n${qty} × ${formatSom(p.price)} = ${formatSom(subtotal)}`);
    keyboard.push([
      { text: "−", callback_data: `cart:dec:${p.id}` },
      { text: `${p.name} (${qty})`, callback_data: "noop" },
      { text: "+", callback_data: `cart:inc:${p.id}` },
    ]);
  }
  keyboard.push([{ text: "🧾 Buyurtma berish", callback_data: "checkout:start" }]);
  keyboard.push([{ text: "📦 Mahsulotlarga qaytish", callback_data: "cat:all" }]);

  const text = `🛒 *Savatcha*\n\n${lines.join("\n\n")}\n\n*Jami: ${formatSom(total)}*`;
  if (messageId) await editMessage(store.telegramBotToken!, chatId, messageId, text, keyboard);
  else await sendMessage(store.telegramBotToken!, chatId, text, { inlineKeyboard: keyboard });
}

async function showCustomerInfo(
  store: Store,
  chatId: string,
  customer: { name: string; phone: string | null; address: string | null }
) {
  const lines = [
    "👤 Sizning ma'lumotlaringiz",
    "",
    `Ism: ${customer.name}`,
    `📞 Telefon: ${customer.phone ?? "kiritilmagan"}`,
    `📍 Manzil: ${customer.address ?? "kiritilmagan"}`,
  ];
  await sendMessage(store.telegramBotToken!, chatId, lines.join("\n"));
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Tasdiqlandi",
  OUT_FOR_DELIVERY: "Yetkazilmoqda",
  DELIVERED: "Yetkazildi",
  CANCELED: "Bekor qilindi",
  FAILED: "Bajarilmadi",
};

async function showMyOrders(store: Store, chatId: string, customerPhone: string | null) {
  // Phones are stored as typed (spaces, dashes...), so match on the last 9 digits in JS.
  const tail = (customerPhone ?? "").replace(/\D/g, "").slice(-9);
  const orders = tail
    ? (
        await prisma.onlineOrder.findMany({
          where: { storeId: store.id },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      )
        .filter((o) => o.customerPhone.replace(/\D/g, "").endsWith(tail))
        .slice(0, 10)
    : [];

  if (orders.length === 0) {
    await sendMessage(store.telegramBotToken!, chatId, "Sizda hali buyurtmalar yo'q.");
    return;
  }

  const lines = ["📋 Buyurtmalaringiz:", ""];
  for (const o of orders) {
    const items = Array.isArray(o.items) ? (o.items as { name: string; qty: number }[]) : [];
    const itemsLabel = items.map((i) => `${i.name} × ${i.qty}`).join(", ");
    lines.push(
      `${formatDate(o.createdAt)} — ${formatSom(o.total)} — ${ORDER_STATUS_LABEL[o.status] ?? o.status}\n${itemsLabel}`
    );
  }
  await sendMessage(store.telegramBotToken!, chatId, lines.join("\n\n"));
}

async function askRegistrationName(store: Store, chatId: string, retry = false) {
  const text = retry
    ? "Iltimos, to'liq ism sharfingizni kiriting (masalan: Bahodir Adhamov Tohirovich):"
    : "👤️ To'liq ism sharfingizni kiriting (masalan: Bahodir Adhamov Tohirovich)";
  await sendMessage(store.telegramBotToken!, chatId, text, { removeKeyboard: true });
}

async function askRegistrationPhone(store: Store, chatId: string) {
  await sendMessage(store.telegramBotToken!, chatId, "📲️ Endi telefon raqamingizni yuboring", {
    requestContact: true,
  });
}

// "Ism Familiya": at least two words, no commands.
function parseFullName(text: string): string | null {
  const name = text.replace(/\s+/g, " ").trim();
  if (name.startsWith("/") || name.length < 3 || name.length > 100) return null;
  return name.split(" ").length >= 2 ? name : null;
}

async function askRegistrationAddress(store: Store, chatId: string) {
  await sendMessage(
    store.telegramBotToken!,
    chatId,
    "🏡 Manzilingizni yozing (masalan: Toshkent viloyati, Uchtepa tumani, Pastdargoh ko'chasi 5-uy)",
    {
      inlineKeyboard: [[{ text: "O'tkazib yuborish", callback_data: "register:skipaddress" }]],
      removeKeyboard: true,
    }
  );
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

// Registers the Telegram user as a store customer (same record as Kassa ->
// Savatcha -> Yangi mijoz). Reuses an existing customer with the same phone
// number instead of creating a duplicate.
async function registerCustomer(
  store: Store,
  chatId: string,
  info: { name: string; phone: string; address: string | null }
) {
  const tail = info.phone.replace(/\D/g, "").slice(-9);
  // Phones are stored as typed (spaces, dashes...), so compare digits in JS.
  const candidates = tail
    ? await prisma.customer.findMany({
        where: { storeId: store.id, telegramChatId: null, phone: { not: null } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const existing = candidates.find((c) => (c.phone ?? "").replace(/\D/g, "").endsWith(tail));
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: { telegramChatId: chatId, address: existing.address || info.address },
    });
  }
  return prisma.customer.create({
    data: {
      storeId: store.id,
      name: info.name || "Telegram mijoz",
      phone: info.phone,
      address: info.address,
      note: "Telegram bot orqali ro'yxatdan o'tgan",
      telegramChatId: chatId,
    },
  });
}

// Turns a shared location into a readable address (best effort; null on failure).
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz`,
      { headers: { "User-Agent": "savdo-app" }, signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    return typeof data?.display_name === "string" ? data.display_name : null;
  } catch {
    return null;
  }
}

async function askAddress(store: Store, chatId: string, savedAddress?: string | null) {
  const prompt = savedAddress
    ? `Saqlangan manzil: ${savedAddress}\n\nShu manzilga yetkazamiz. Boshqa manzil yozing, "${BTN_SEND_LOCATION}" tugmasi orqali joylashuvingizni yuboring yoki "${BTN_SKIP_ADDRESS}" tugmasini bosing:`
    : `Yetkazib berish manzilini yozing yoki "${BTN_SEND_LOCATION}" tugmasi orqali joylashuvingizni yuboring (ixtiyoriy):`;
  await sendMessage(store.telegramBotToken!, chatId, prompt, {
    locationKeyboard: { locationText: BTN_SEND_LOCATION, skipText: BTN_SKIP_ADDRESS },
  });
}

async function askPaymentMethod(store: Store, chatId: string) {
  await sendMessage(store.telegramBotToken!, chatId, "To'lov usulini tanlang:", {
    inlineKeyboard: [
      [
        { text: "💵 Naqd", callback_data: "pay:CASH" },
        { text: "💳 Karta", callback_data: "pay:CARD" },
      ],
    ],
  });
}

async function confirmOrder(
  store: Store,
  chatId: string,
  session: { customerName: string | null; customerPhone: string | null; customerAddress: string | null; customerLat: number | null; paymentMethod: string | null },
  cart: Record<string, number>
) {
  const ids = Object.keys(cart).filter((id) => cart[id] > 0);
  const products = await prisma.product.findMany({ where: { id: { in: ids }, storeId: store.id } });
  const items = products
    .map((p) => ({ productId: p.id, name: p.name, qty: Math.min(cart[p.id] ?? 0, p.stock), price: p.price }))
    .filter((i) => i.qty > 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const lines = [
    "📋 *Buyurtmani tasdiqlang*",
    "",
    ...items.map((i) => `${i.name} × ${i.qty} = ${formatSom(i.price * i.qty)}`),
    "",
    `Jami: *${formatSom(total)}*`,
    `To'lov: ${session.paymentMethod === "CARD" ? "Karta" : "Naqd"}`,
    session.customerAddress ? `Manzil: ${session.customerAddress}` : null,
    session.customerLat != null ? "📍 Joylashuv yuborildi" : null,
  ].filter(Boolean);

  await sendMessage(store.telegramBotToken!, chatId, lines.join("\n"), {
    inlineKeyboard: [
      [
        { text: "✅ Tasdiqlash", callback_data: "checkout:confirm" },
        { text: "❌ Bekor qilish", callback_data: "checkout:cancel" },
      ],
    ],
  });
}

export async function handleTelegramUpdate(storeId: string, update: TgUpdate) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store?.telegramBotToken) return;
  const token = store.telegramBotToken;
  await syncUsdPrices(store.id);

  const chat = update.message?.chat ?? update.callback_query?.message?.chat;
  if (!chat) return;
  const chatId = String(chat.id);

  const session = await prisma.telegramSession.upsert({
    where: { storeId_chatId: { storeId: store.id, chatId } },
    update: {},
    create: { storeId: store.id, chatId },
  });
  const cart = cartFromJson(session.cart);

  const customer = await prisma.customer.findUnique({
    where: { storeId_telegramChatId: { storeId: store.id, telegramChatId: chatId } },
  });

  // Registration gate: a Telegram user must be registered as a customer
  // before they can browse or order.
  if (!customer) {
    const finish = async (address: string | null) => {
      if (!session.customerName) {
        await prisma.telegramSession.update({ where: { id: session.id }, data: { state: "register_name" } });
        await askRegistrationName(store, chatId);
        return;
      }
      if (!session.customerPhone) {
        await prisma.telegramSession.update({ where: { id: session.id }, data: { state: "register_phone" } });
        await askRegistrationPhone(store, chatId);
        return;
      }
      const created = await registerCustomer(store, chatId, {
        name: session.customerName,
        phone: session.customerPhone,
        address,
      });
      await prisma.telegramSession.update({
        where: { id: session.id },
        data: { state: "browsing", customerName: created.name, customerPhone: created.phone, customerAddress: created.address },
      });
      await showMenu(store, chatId, `✅ Ro'yxatdan o'tdingiz, ${created.name}!`);
    };

    if (update.callback_query) {
      const cq = update.callback_query;
      await answerCallbackQuery(token, cq.id);
      if (cq.data === "register:skipaddress" && session.state === "register_address") {
        await finish(null);
        return;
      }
    } else {
      const message = update.message;
      const text = message?.text?.trim();
      if (text && session.state === "register_name" && !text.startsWith("/")) {
        const name = parseFullName(text);
        if (!name) {
          await askRegistrationName(store, chatId, true);
          return;
        }
        await prisma.telegramSession.update({
          where: { id: session.id },
          data: { customerName: name, state: "register_phone" },
        });
        await askRegistrationPhone(store, chatId);
        return;
      }
      if (message?.contact && session.state === "register_phone") {
        // Only accept the user's own contact, not a forwarded one.
        if (message.contact.user_id && message.from && message.contact.user_id !== message.from.id) {
          await sendMessage(token, chatId, "Iltimos, o'zingizning telefon raqamingizni yuboring.", { requestContact: true });
          return;
        }
        await prisma.telegramSession.update({
          where: { id: session.id },
          data: { customerPhone: normalizePhone(message.contact.phone_number), state: "register_address" },
        });
        await askRegistrationAddress(store, chatId);
        return;
      }
      if (text && session.state === "register_phone" && /^\+?[\d\s()-]{9,}$/.test(text)) {
        await prisma.telegramSession.update({
          where: { id: session.id },
          data: { customerPhone: normalizePhone(text), state: "register_address" },
        });
        await askRegistrationAddress(store, chatId);
        return;
      }
      if (text && session.state === "register_address" && !text.startsWith("/")) {
        await finish(text);
        return;
      }
    }
    // Anything else (including /start): begin or restart registration.
    await prisma.telegramSession.update({
      where: { id: session.id },
      data: { state: "register_name", customerPhone: null, customerName: null },
    });
    await askRegistrationName(store, chatId);
    return;
  }

  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data ?? "";
    const messageId = cq.message?.message_id;
    await answerCallbackQuery(token, cq.id);

    if (data === "noop") return;

    if (data === "back:categories") {
      // Legacy button from older messages: categories are gone, show all products.
      await showProducts(store, chatId, messageId, { categoryId: null });
      return;
    }
    if (data === "cart:view") {
      await showCart(store, chatId, messageId, cart);
      return;
    }
    if (data.startsWith("cat:")) {
      const categoryId = data.slice(4);
      await prisma.telegramSession.update({ where: { id: session.id }, data: { categoryId } });
      await showProducts(store, chatId, messageId, { categoryId: categoryId === "all" ? null : categoryId });
      return;
    }
    if (data.startsWith("prod:")) {
      const productId = data.slice(5);
      const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
      if (!product) return;
      const nextQty = Math.min((cart[productId] ?? 0) + 1, product.stock);
      cart[productId] = nextQty;
      await prisma.telegramSession.update({ where: { id: session.id }, data: { cart } });
      await answerCallbackQuery(token, cq.id, `✅ ${product.name} qo'shildi`);
      return;
    }
    if (data.startsWith("cart:inc:") || data.startsWith("cart:dec:")) {
      const productId = data.split(":")[2];
      const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
      if (!product) return;
      const delta = data.startsWith("cart:inc:") ? 1 : -1;
      const nextQty = Math.max(0, Math.min((cart[productId] ?? 0) + delta, product.stock));
      if (nextQty <= 0) delete cart[productId];
      else cart[productId] = nextQty;
      await prisma.telegramSession.update({ where: { id: session.id }, data: { cart } });
      await showCart(store, chatId, messageId, cart);
      return;
    }
    if (data === "checkout:start") {
      if (Object.values(cart).every((q) => q <= 0)) {
        await sendMessage(token, chatId, "Savatcha bo'sh.");
        return;
      }
      // Name and phone come from the registered customer.
      await prisma.telegramSession.update({
        where: { id: session.id },
        data: {
          state: "checkout_address",
          customerLat: null,
          customerLng: null,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address,
        },
      });
      await askAddress(store, chatId, customer.address);
      return;
    }
    if (data === "checkout:skipaddress") {
      await prisma.telegramSession.update({ where: { id: session.id }, data: { state: "checkout_payment" } });
      await askPaymentMethod(store, chatId);
      return;
    }
    if (data === "pay:CASH" || data === "pay:CARD") {
      const paymentMethod = data.slice(5);
      await prisma.telegramSession.update({
        where: { id: session.id },
        data: { paymentMethod, state: "checkout_confirm" },
      });
      await confirmOrder(store, chatId, { ...session, paymentMethod }, cart);
      return;
    }
    if (data === "checkout:cancel") {
      await prisma.telegramSession.update({ where: { id: session.id }, data: { state: "browsing" } });
      await sendMessage(token, chatId, "Bekor qilindi. Savatcha saqlanib qoldi.", { replyKeyboard: mainKeyboard(store) });
      return;
    }
    if (data === "checkout:confirm") {
      await placeOrder(store, chatId, session, cart);
      return;
    }
    return;
  }

  const message = update.message;
  if (!message) return;

  if (message.location && session.state === "checkout_address") {
    const { latitude, longitude } = message.location;
    const address = (await reverseGeocode(latitude, longitude)) ?? session.customerAddress;
    await prisma.telegramSession.update({
      where: { id: session.id },
      data: { customerLat: latitude, customerLng: longitude, customerAddress: address, state: "checkout_payment" },
    });
    await askPaymentMethod(store, chatId);
    return;
  }

  const text = message.text?.trim();
  if (!text) return;

  if (text === "/start" || text.toLowerCase() === "/dokon" || text === "/do'kon") {
    await prisma.telegramSession.update({
      where: { id: session.id },
      data: { state: "browsing", customerName: customer.name },
    });
    await showMenu(store, chatId);
    return;
  }
  if (text === BTN_DISCOUNTS || text === "/aksiya") {
    await showProducts(store, chatId, undefined, { onSaleOnly: true });
    return;
  }
  if (text === BTN_INFO || text === "/malumot") {
    await showCustomerInfo(store, chatId, customer);
    return;
  }
  if (text === BTN_MY_ORDERS || text === "/buyurtmalarim") {
    await showMyOrders(store, chatId, customer.phone);
    return;
  }
  if (text === BTN_CART || text === "/cart" || text === "/savatcha") {
    await showCart(store, chatId, undefined, cart);
    return;
  }
  if (text === BTN_LOCATION || text === "/manzil") {
    if (store.locationLat != null && store.locationLng != null) {
      await sendLocation(token, chatId, store.locationLat, store.locationLng);
    } else if (store.address) {
      await sendMessage(token, chatId, `📍 ${store.address}`);
    } else {
      await sendMessage(token, chatId, "Manzil hali kiritilmagan.");
    }
    return;
  }
  if (text === BTN_HELP) {
    await sendMessage(token, chatId, "Yordam uchun xodimimizga yozing:", {
      inlineKeyboard: [[{ text: "👨‍🔧 Xodim bilan bog'lanish", url: `https://t.me/${SUPPORT_TELEGRAM_USERNAME}` }]],
    });
    return;
  }

  if (session.state === "checkout_address") {
    await prisma.telegramSession.update({
      where: { id: session.id },
      data: text === BTN_SKIP_ADDRESS ? { state: "checkout_payment" } : { customerAddress: text, state: "checkout_payment" },
    });
    await askPaymentMethod(store, chatId);
    return;
  }

  // Default: treat free text as a product search.
  await showProducts(store, chatId, undefined, { search: text });
}

async function placeOrder(
  store: Store,
  chatId: string,
  session: { id: string; customerName: string | null; customerPhone: string | null; customerAddress: string | null; customerLat: number | null; customerLng: number | null; paymentMethod: string | null },
  cart: Record<string, number>
) {
  const token = store.telegramBotToken!;
  if (!session.customerPhone) {
    await sendMessage(token, chatId, "Xatolik: telefon raqami topilmadi. /start bilan qaytadan boshlang.");
    return;
  }
  const ids = Object.keys(cart).filter((id) => cart[id] > 0);
  const products = await prisma.product.findMany({ where: { id: { in: ids }, storeId: store.id } });
  const items = products
    .map((p) => ({ productId: p.id, name: p.name, qty: Math.min(cart[p.id] ?? 0, p.stock), price: p.price }))
    .filter((i) => i.qty > 0);
  if (items.length === 0) {
    await sendMessage(token, chatId, "Savatcha bo'sh.");
    return;
  }
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const order = await prisma.onlineOrder.create({
    data: {
      storeId: store.id,
      customerName: session.customerName || "Telegram mijoz",
      customerPhone: session.customerPhone,
      customerAddress: session.customerAddress || null,
      customerLat: session.customerLat,
      customerLng: session.customerLng,
      paymentMethod: session.paymentMethod === "CARD" ? "CARD" : "CASH",
      items,
      total,
      source: "TELEGRAM",
    },
  });

  await prisma.telegramSession.update({
    where: { id: session.id },
    data: { state: "browsing", cart: {}, paymentMethod: null, customerLat: null, customerLng: null },
  });

  if (store.notifyNewOrders) {
    notifyNewOrder(
      {
        storeName: store.name,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total,
        items,
      },
      { token: store.telegramBotToken, chatId: store.telegramChatId }
    ).catch(() => {});
  }

  await sendMessage(
    token,
    chatId,
    `✅ Buyurtma qabul qilindi!\n\nJami: ${formatSom(total)}\n\nTez orada siz bilan bog'lanamiz.`,
    { replyKeyboard: mainKeyboard(store) }
  );
}
