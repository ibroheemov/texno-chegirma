import { formatSom } from "./format";

type OrderNotification = {
  storeName: string;
  customerName: string;
  customerPhone: string;
  total: number;
  items: { name: string; qty: number; price: number }[];
  installmentMonths?: number | null;
};

// Sends a Telegram message when a new online order comes in. No-op unless a
// bot token and chat id are available — either passed in (Sozlamalar →
// Telegram bot, stored on Store) or via the TELEGRAM_BOT_TOKEN /
// TELEGRAM_CHAT_ID env vars as a fallback.
export async function notifyNewOrder(
  order: OrderNotification,
  credentials?: { token?: string | null; chatId?: string | null }
) {
  const token = credentials?.token || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = credentials?.chatId || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const lines = [
    `🛒 *Yangi buyurtma* — ${order.storeName}`,
    `Mijoz: ${order.customerName} (${order.customerPhone})`,
    "",
    ...order.items.map((i) => `• ${i.name} × ${i.qty} = ${formatSom(i.price * i.qty)}`),
    "",
    `*Jami: ${formatSom(order.total)}*`,
    order.installmentMonths
      ? `💳 Muddatli to'lov: ${order.installmentMonths} oy (${formatSom(Math.ceil(order.total / order.installmentMonths))}/oy)`
      : null,
  ].filter((l): l is string => l !== null);

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join("\n"),
      parse_mode: "Markdown",
    }),
  });
}

export type InlineKeyboardButton =
  | { text: string; callback_data: string }
  | { text: string; web_app: { url: string } };
export type InlineKeyboard = InlineKeyboardButton[][];

// Persistent keyboard shown under the chat input (as opposed to inline buttons
// attached to a message).
export type ReplyKeyboardButton = { text: string } | { text: string; web_app: { url: string } };
export type ReplyKeyboard = ReplyKeyboardButton[][];

function api(token: string, method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function sendMessage(
  token: string,
  chatId: string | number,
  text: string,
  options?: {
    inlineKeyboard?: InlineKeyboard;
    replyKeyboard?: ReplyKeyboard;
    requestContact?: boolean;
    removeKeyboard?: boolean;
  }
) {
  const reply_markup = options?.inlineKeyboard
    ? { inline_keyboard: options.inlineKeyboard }
    : options?.replyKeyboard
      ? { keyboard: options.replyKeyboard, resize_keyboard: true, is_persistent: true }
      : options?.requestContact
      ? {
          keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        }
      : options?.removeKeyboard
        ? { remove_keyboard: true }
        : undefined;

  return api(token, "sendMessage", { chat_id: chatId, text, reply_markup });
}

export function editMessage(
  token: string,
  chatId: string | number,
  messageId: number,
  text: string,
  inlineKeyboard?: InlineKeyboard
) {
  return api(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
  });
}

export function answerCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  return api(token, "answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

// Sends a native Telegram location bubble (the chat shows an inline map, not
// just text) — used for the bot's "📍 Manzilimiz" button to share the store's
// own location with the customer.
export function sendLocation(token: string, chatId: string | number, lat: number, lng: number) {
  return api(token, "sendLocation", { chat_id: chatId, latitude: lat, longitude: lng });
}

export async function setTelegramWebhook(token: string, url: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}
